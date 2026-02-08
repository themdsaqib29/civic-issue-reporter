const { Pool } = require('pg');
require('dotenv').config();

// Debug: Check if variables are loading
console.log("🔌 DB User:", process.env.DB_USER || "postgres");
// Don't log the actual password, just check if it exists
console.log("🔑 DB Password Exists?", !!process.env.DB_PASSWORD || !!process.env.DATABASE_URL);

// Create connection config
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'civic_issues',
      password: process.env.DB_PASSWORD || 'your_actual_password_here', // <--- FALLBACK HERE
      port: process.env.DB_PORT || 5432,
    };

const pool = new Pool(dbConfig);

// Test the connection immediately
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database Connection Error:', err.message);
    console.error('👉 Hint: Check your password in .env or database.js');
  } else {
    console.log('✅ Connected to PostgreSQL Database');
    release();
  }
});

module.exports = pool;