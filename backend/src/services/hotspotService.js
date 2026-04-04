const DBSCAN = require('density-clustering').DBSCAN;
const pool = require('../config/database');

class HotspotService {
  /**
   * Detect geographic hotspots using DBSCAN clustering
   * Fetches all unresolved issues with coordinates from DB
   * Runs DBSCAN to cluster nearby issues
   * @returns {Promise<Array>} Array of hotspots: [{ hotspotId, issueCount, center: {lat, lng}, issues: [...] }]
   */
  async detectHotspots() {
    try {
      // Step 1: Fetch all unresolved issues with valid lat/lng from database
      const query = `
        SELECT id, location_lat, location_lng, category, description, created_at, priority_score
        FROM issues
        WHERE status != 'Resolved'
          AND location_lat IS NOT NULL
          AND location_lng IS NOT NULL
        ORDER BY created_at DESC
      `;

      const result = await pool.query(query);
      const issues = result.rows;

      // Step 2: Edge case - if fewer than 3 issues, no hotspots can form
      if (issues.length < 3) {
        console.log(`⚠️ HotspotService: Only ${issues.length} unresolved issues. Need ≥3 for DBSCAN.`);
        return [];
      }

      // Step 3: Prepare points array for DBSCAN (synchronously)
      // Format: [[lat, lng], [lat, lng], ...]
      const points = issues.map((issue) => [issue.location_lat, issue.location_lng]);

      // Step 4: Run DBSCAN synchronously
      // epsilon = 0.005 degrees ≈ 500m at latitude 13°N (Chennai)
      // minPts = 3 (minimum 3 issues to form a valid hotspot)
      const dbscan = new DBSCAN();
      const clusters = dbscan.run(points, 0.005, 3);

      console.log(`🔍 DBSCAN found ${clusters.length} clusters from ${issues.length} issues`);

      // Step 5: Filter out noise points (cluster id = -1) and build hotspot objects
      const hotspots = [];
      let hotspotCounter = 1;

      clusters.forEach((clusterIndices, clusterIndex) => {
        // Skip noise points (DBSCAN returns -1 for noise in some implementations)
        // But clusters array should only contain valid clusters
        if (!Array.isArray(clusterIndices) || clusterIndices.length === 0) {
          return;
        }

        // Skip clusters with fewer than 3 points
        if (clusterIndices.length < 3) {
          return;
        }

        // Get all issues in this cluster
        const clusterIssues = clusterIndices.map((idx) => issues[idx]);

        // Calculate cluster center (arithmetic mean of coordinates)
        // Convert location_lat/lng from string to float because DB returns them as strings
        const centerLat =
          clusterIssues.reduce((sum, issue) => sum + parseFloat(issue.location_lat), 0) /
          clusterIssues.length;
        const centerLng =
          clusterIssues.reduce((sum, issue) => sum + parseFloat(issue.location_lng), 0) /
          clusterIssues.length;

        // Build hotspot object
        const hotspot = {
          hotspotId: hotspotCounter++,
          issueCount: clusterIssues.length,
          center: {
            lat: Math.round(centerLat * 10000) / 10000, // Round to 4 decimals
            lng: Math.round(centerLng * 10000) / 10000
          },
          issues: clusterIssues.map((issue) => ({
            id: issue.id,
            category: issue.category,
            description: issue.description.substring(0, 100), // Truncate for response
            location_lat: issue.location_lat,
            location_lng: issue.location_lng,
            priority_score: issue.priority_score,
            created_at: issue.created_at
          }))
        };

        hotspots.push(hotspot);
      });

      console.log(`✅ HotspotService: Detected ${hotspots.length} valid hotspots`);
      return hotspots;

    } catch (error) {
      console.error('❌ HotspotService.detectHotspots error:', error);
      throw error;
    }
  }
}

module.exports = new HotspotService();
