exports.requireAdmin = (req, res, next) => {
  // This runs AFTER verifyToken
  // req.userId is already set by verifyToken
  
  // We need to check role from DB
  const pool = require('../config/database');
  
  pool.query('SELECT role FROM users WHERE id = $1', [req.userId])
    .then(result => {
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      if (result.rows[0].role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        });
      }
      
      req.userRole = 'admin';
      next();
    })
    .catch(err => {
      res.status(500).json({ 
        success: false, 
        error: 'Auth check failed' 
      });
    });
};