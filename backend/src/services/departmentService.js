const pool = require('../config/database');

class DepartmentService {
  /**
   * Find the appropriate department based on issue category and location
   */
  async assignDepartment(category, locationAddress) {
    try {
      // Simple zone detection from location
      let zone = 'Central Chennai'; // Default
      
      const location = locationAddress.toLowerCase();
      
      // NORTH
if (/(anna nagar|ambattur|kolathur|perambur|tondiarpet|royapuram|washermanpet)/.test(location)) {
  zone = 'North Chennai';
}

// SOUTH
else if (/(adyar|guindy|velachery|tambaram|pallavaram|sholinganallur|porur|alandur|kattangulathur)/.test(location)) {
  zone = 'South Chennai';
}

// CENTRAL
else if (/(t nagar|nungambakkam|kodambakkam|vadapalani|egmore|myalpore)/.test(location)) {
  zone = 'Central Chennai';
}
      
      // Find department matching category and zone
      const query = `
        SELECT * FROM departments 
        WHERE category = $1 
        AND (jurisdiction_area = $2 OR jurisdiction_area = 'All Zones')
        LIMIT 1
      `;
      
      const result = await pool.query(query, [category, zone]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // Fallback: Find any department for this category
      const fallbackQuery = `
        SELECT * FROM departments 
        WHERE category = $1 
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [category]);
      return fallbackResult.rows[0] || null;
      
    } catch (error) {
      console.error('Department assignment error:', error);
      return null;
    }
  }
}

module.exports = new DepartmentService();