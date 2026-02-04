/*const pool = require('../config/database');

class Issue {
  static async create(issueData) {
    // 1. Destructure using camelCase (Professional JS style)
    const { 
      userId, title, description, category, 
      locationLat, locationLng, locationAddress, imageUrl,
      department, priority_score 
    } = issueData;

    // 2. Insert mapping JS variables to SQL columns
    const query = `
      INSERT INTO issues 
      (user_id, title, description, category, location_lat, location_lng, location_address, image_url, department, priority_score, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Open')
      RETURNING *
    `;

    const values = [
      userId,
      title || `${category} Issue`, // Default title if missing
      description,
      category,
      locationLat || 13.0827,       // Default Chennai Lat
      locationLng || 80.2707,       // Default Chennai Lng
      locationAddress || 'Chennai', // Default Address
      imageUrl || null,
      department || 'General',      // CRITICAL: Needed for your Routing Engine
      priority_score || 5
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findAll() {
    const result = await pool.query('SELECT * FROM issues ORDER BY created_at DESC');
    return result.rows;
  }
}

module.exports = Issue;*/

const pool = require('../config/database');

class Issue {
  static async create(issueData) {
    const { 
      userId, title, description, category, 
      locationLat, locationLng, locationAddress, imageUrl,
      priority_score 
    } = issueData;

    // We map the data exactly to the columns you showed me:
    // id, user_id, title, description, category, status, 
    // location_lat, location_lng, location_address, image_url, 
    // department_id, email_sent, priority_score, vote_count

    const query = `
      INSERT INTO issues 
      (
        user_id, 
        title, 
        description, 
        category, 
        location_lat, 
        location_lng, 
        location_address, 
        image_url, 
        priority_score,
        status,          -- Defaulting to 'Open'
        department_id,   -- Defaulting to NULL (since we don't have IDs yet)
        email_sent,      -- Defaulting to FALSE
        vote_count       -- Defaulting to 0
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Open', NULL, FALSE, 0)
      RETURNING *
    `;

    const values = [
      userId,
      title || `${category} Issue`, 
      description,
      category,
      locationLat || 13.0827,       
      locationLng || 80.2707,       
      locationAddress || 'Chennai', 
      imageUrl || null,
      priority_score || 5
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("SQL INSERT ERROR:", error.message);
      throw error; // This will show up in your terminal now
    }
  }

  static async findAll() {
    const result = await pool.query('SELECT * FROM issues ORDER BY created_at DESC');
    return result.rows;
  }
}

module.exports = Issue;