const pool = require('../config/database');
const textDuplicateService = require('./textDuplicateService');

class DuplicateDetectionService {
  /**
   * Geographic scoring: convert distance (km) to 0-1 score
   * Formula: geoScore = max(0, 1 - (distanceKm / 0.5))
   * At 0 km: score = 1.0 (same location)
   * At 0.5 km: score = 0.0 (at threshold)
   * Beyond 0.5 km: score = 0.0 (capped)
   * @param {number} distanceKm - Distance in kilometers
   * @returns {number} Geographic score (0-1)
   */
  convertDistanceToGeoScore(distanceKm) {
    return Math.max(0, 1 - (distanceKm / 0.5));
  }

  /**
   * Find similar issues by geography (Haversine) within 50m radius
   * Returns raw distance data
   * @param {Object} newIssue - New issue object with location and category
   * @returns {Promise<Array>} Array of similar issues with distance field
   */
  async findSimilarIssues(newIssue) {
    const { location_lat, location_lng, category, created_at } = newIssue;
    
    // Find issues within 50m radius, same category, last 30 days
    const radiusKm = 0.05; // 50 meters
    const query = `
      SELECT * FROM (
        SELECT *, 
          (
            6371 * acos(
              cos(radians($1)) * cos(radians(location_lat)) *
              cos(radians(location_lng) - radians($2)) +
              sin(radians($1)) * sin(radians(location_lat))
            )
          ) AS distance
        FROM issues
        WHERE category = $3
          AND created_at > NOW() - INTERVAL '30 days'
          AND status != 'Resolved'
      ) subquery
      WHERE distance < $4
      ORDER BY distance
      LIMIT 5
    `;
    
    const result = await pool.query(query, [
      location_lat,
      location_lng,
      category,
      radiusKm
    ]);
    
    return result.rows;
  }

  /**
   * Combined duplicate detection: geographic + text similarity
   * Uses both Haversine distance and TF-IDF cosine similarity
   * @param {Object} newIssue - New issue { location_lat, location_lng, category, description }
   * @returns {Promise<Object>} { isDuplicate, confidence, candidates: [...] }
   *   candidates: [{ issueId, geoScore, textSim, combined }] sorted by combined descending
   */
  async combinedDuplicateScore(newIssue) {
    try {
      const { location_lat, location_lng, category, description } = newIssue;

      // Step 1: Get geographic candidates (within 50m)
      const geoCandidates = await this.findSimilarIssues(newIssue);

      if (geoCandidates.length === 0) {
        return {
          isDuplicate: false,
          confidence: 0,
          candidates: []
        };
      }

      // Step 2: Get text similarity scores for ALL issues in DB
      const allTextSims = await textDuplicateService.findSimilarIssuesByText(description);

      // Create lookup map: issueId -> textSimilarity
      const textSimMap = {};
      allTextSims.forEach((item) => {
        textSimMap[item.issueId] = item.textSimilarity;
      });

      // Step 3: Combine geo + text for geographic candidates only
      const combinedCandidates = geoCandidates.map((geoIssue) => {
        const distanceKm = geoIssue.distance;
        const geoScore = this.convertDistanceToGeoScore(distanceKm);
        const textSim = textSimMap[geoIssue.id] || 0;
        
        // Combined formula: 0.4 * geo + 0.6 * text
        const combined = 0.4 * geoScore + 0.6 * textSim;

        return {
          issueId: geoIssue.id,
          distanceKm: Math.round(distanceKm * 1000) / 1000, // Round to 3 decimals (meters)
          geoScore: Math.round(geoScore * 1000) / 1000,
          textSim: Math.round(textSim * 1000) / 1000,
          combined: Math.round(combined * 1000) / 1000
        };
      });

      // Sort by combined score descending
      combinedCandidates.sort((a, b) => b.combined - a.combined);

      // Step 4: Determine if duplicate (threshold = 0.7)
      const highestScore = combinedCandidates[0]?.combined || 0;
      const isDuplicate = highestScore > 0.7;

      return {
        isDuplicate,
        confidence: Math.round(highestScore * 100),
        candidates: combinedCandidates
      };

    } catch (error) {
      console.error('❌ DuplicateDetectionService.combinedDuplicateScore error:', error);
      throw error;
    }
  }
}

module.exports = new DuplicateDetectionService();