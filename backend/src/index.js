/*const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');

const pool = require('./config/database');

// Load environment variables


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/authRoutes');

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Civic Issue Reporter API is running',
    timestamp: new Date().toISOString()
  });
});
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chat', chatRoutes);

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      success: true,
      message: 'Database connected',
      time: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});*/

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');  // ← MAKE SURE THIS IS HERE
const chatRoutes = require('./routes/chatRoutes');    // ← AND THIS

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Civic Issue Reporter API is running',
    timestamp: new Date().toISOString()
  });
});

// Test database
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      success: true,
      message: 'Database connected',
      time: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// API Routes - MAKE SURE THESE ARE REGISTERED
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);    // ← THIS LINE IS CRITICAL
app.use('/api/chat', chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    requestedUrl: req.url
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Routes registered:`);
  console.log(`   - /api/auth/*`);
  console.log(`   - /api/issues/*`);
  console.log(`   - /api/chat/*`);
});