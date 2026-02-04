const pool = require('../config/database');

class DuplicateDetectionService {
  async findSimilarIssues(newIssue) {
    const { location_lat, location_lng, category, created_at } = newIssue;
    
    // Find issues within 50m radius, same category, last 30 days
    const radiusKm = 0.05; // 50 meters
    const query = `
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
      HAVING distance < $4
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
}

module.exports = new DuplicateDetectionService();