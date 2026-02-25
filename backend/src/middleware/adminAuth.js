const pool = require('../config/database');

/**
 * Require main admin role only (For things like adding new admins)
 */
exports.requireMainAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Main admin access required' });
    }
    
    req.userRole = 'admin';
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Auth check failed' });
  }
};

/**
 * Require admin OR department admin (For viewing the dashboard)
 */
exports.requireAnyAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT role, department_id FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    if (!['admin', 'dept_admin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    req.userRole = user.role;
    req.userDepartment = user.department_id;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Auth check failed' });
  }
};

/**
 * Helper utility to get user details
 */
exports.getUserDetails = async (userId) => {
  const result = await pool.query(
    'SELECT id, role, department_id FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0];
};