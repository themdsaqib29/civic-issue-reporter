const pool = require('../config/database.js');

class Issue {
  static async create(issueData) {
    try {
      const { 
        userId, 
        title, 
        description, 
        category, 
        locationLat, 
        locationLng, 
        locationAddress, 
        imageUrl,
        priorityScore,
        departmentId, // <--- 1. NEW INPUT
        severity
      } = issueData;
      
      // 2. UPDATED QUERY: Added department_id and priority_label
      const query = `
        INSERT INTO issues 
        (user_id, title, description, category, location_lat, location_lng, 
         location_address, image_url, priority_score, department_id, vote_count, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const values = [
        userId,
        title || 'Civic Issue Report',
        description,
        category,
        locationLat || 13.0827, 
        locationLng || 80.2707,
        locationAddress || 'Location not specified',
        imageUrl || null,
        priorityScore || 5,
        departmentId || null, // <--- 3. NEW VALUE (Matches $11)
        0, // vote_count ($12)
        'Pending' // status ($13)
      ];
      
      console.log('Creating issue with values:', values);
      
      const result = await pool.query(query, values);
      return result.rows[0];
      
    } catch (error) {
      console.error('Issue.create error:', error);
      throw error;
    }
  }
  
  // UPDATED: Now joins with departments table to get the name automatically
  static async findAll() {
    try {
      const query = `
        SELECT issues.*, departments.name as department_name 
        FROM issues 
        LEFT JOIN departments ON issues.department_id = departments.id
        ORDER BY priority_score DESC, created_at DESC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Issue.findAll error:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    try {
      const query = `
        SELECT issues.*, departments.name as department_name, departments.email as department_email
        FROM issues 
        LEFT JOIN departments ON issues.department_id = departments.id
        WHERE issues.id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Issue.findById error:', error);
      throw error;
    }
  }
}

module.exports = Issue;