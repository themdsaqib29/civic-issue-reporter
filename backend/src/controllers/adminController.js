const pool = require('../config/database');
const { getUserDetails } = require('../middleware/adminAuth');
const aiInsightsService = require('../services/aiInsightsService');
const followUpService = require('../services/followUpService');
const emailService = require('../services/emailService');
const bcrypt = require('bcrypt');

/* ======================================================
   1. GET ALL ISSUES (Role & Category Aware - OPTION A)
====================================================== */
exports.getAllIssues = async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    const userDetails = await getUserDetails(req.userId);

    let query = `
      SELECT 
        issues.*,
        departments.name as department_name,
        departments.email as department_email,
        users.name as citizen_name,
        users.email as citizen_email
      FROM issues
      LEFT JOIN departments ON issues.department_id = departments.id
      LEFT JOIN users ON issues.user_id = users.id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    // OPTION A: Filter by CATEGORY instead of exact Zone ID
    if (userDetails.role === 'dept_admin' && userDetails.department_id) {
      query += ` AND issues.category = (SELECT category FROM departments WHERE id = $${paramCount})`;
      values.push(userDetails.department_id);
      paramCount++;
    }

    if (status) {
      query += ` AND issues.status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    if (category) {
      query += ` AND issues.category = $${paramCount}`;
      values.push(category);
      paramCount++;
    }

    if (priority === 'high') {
      query += ` AND issues.priority_score >= 7`;
    } else if (priority === 'medium') {
      query += ` AND issues.priority_score >= 4 AND issues.priority_score < 7`;
    } else if (priority === 'low') {
      query += ` AND issues.priority_score < 4`;
    }

    query += ` ORDER BY issues.priority_score DESC, issues.created_at ASC`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      userRole: userDetails.role,
      data: result.rows
    });

  } catch (error) {
    console.error("Get issues error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   2. DASHBOARD STATS (Role & Category Aware - OPTION A)
====================================================== */
exports.getDashboardStats = async (req, res) => {
  try {
    const userDetails = await getUserDetails(req.userId);

    let whereClause = '';
    const values = [];

    // OPTION A: Filter stats by CATEGORY
    if (userDetails.role === 'dept_admin' && userDetails.department_id) {
      whereClause = 'WHERE category = (SELECT category FROM departments WHERE id = $1)';
      values.push(userDetails.department_id);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'Acknowledged' THEN 1 END) as acknowledged,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN priority_score >= 7 THEN 1 END) as high_priority,
        COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent,
        AVG(CASE 
          WHEN status = 'Resolved' AND resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
        END) as avg_resolution_hours
      FROM issues
      ${whereClause}
    `;

    const categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM issues
      ${whereClause}
      GROUP BY category
      ORDER BY count DESC
    `;

    const [statsResult, categoryResult] = await Promise.all([
      pool.query(statsQuery, values),
      pool.query(categoryQuery, values)
    ]);

    res.json({
      success: true,
      data: {
        overview: statsResult.rows[0],
        byCategory: categoryResult.rows,
        userRole: userDetails.role
      }
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   3. UPDATE ISSUE STATUS (OPTION A Auth)
====================================================== */
exports.updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userDetails = await getUserDetails(req.userId);

    const validStatuses = ['Pending', 'Acknowledged', 'In Progress'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Use /resolve endpoint for Resolved status'
      });
    }

    // OPTION A Validation: Check if the issue's category matches the admin's category
    if (userDetails.role === 'dept_admin') {
      const check = await pool.query(
        `SELECT i.category as issue_category, d.category as admin_category 
         FROM issues i, departments d 
         WHERE i.id = $1 AND d.id = $2`,
        [id, userDetails.department_id]
      );

      if (check.rows.length === 0 || check.rows[0].issue_category !== check.rows[0].admin_category) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized. This issue does not belong to your department category.'
        });
      }
    }

    const result = await pool.query(
      `UPDATE issues 
       SET status = $1, resolution_notes = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, notes || null, id]
    );

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   4. RESOLVE ISSUE (OPTION A Auth)
====================================================== */
exports.resolveIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes, resolved_image_url } = req.body;
    const userDetails = await getUserDetails(req.userId);

    if (!resolved_image_url) {
      return res.status(400).json({ success: false, error: 'Resolved image URL is required' });
    }

    // OPTION A Validation: Check if the issue's category matches the admin's category
    if (userDetails.role === 'dept_admin') {
      const check = await pool.query(
        `SELECT i.category as issue_category, d.category as admin_category 
         FROM issues i, departments d 
         WHERE i.id = $1 AND d.id = $2`,
        [id, userDetails.department_id]
      );

      if (check.rows.length === 0 || check.rows[0].issue_category !== check.rows[0].admin_category) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized. This issue does not belong to your department category.'
        });
      }
    }

    const result = await pool.query(
      `UPDATE issues 
       SET status = 'Resolved',
           resolution_notes = $1,
           resolved_image_url = $2,
           resolved_at = NOW(),
           resolved_by = $3,
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [resolution_notes || 'Issue resolved', resolved_image_url, req.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    const issue = result.rows[0];

    // Notify citizen
    const userResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [issue.user_id]);
    const citizen = userResult.rows[0];

    if (citizen) {
      try {
        await emailService.transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: citizen.email,
          subject: `✅ Issue #${id} Resolved - Chennai Civic Reporter`,
          text: `
Dear ${citizen.name},

Your reported civic issue has been resolved!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESOLUTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue ID    : #${id}
Category    : ${issue.category}
Location    : ${issue.location_address}
Resolved On : ${new Date().toLocaleString('en-IN')}

Admin Notes : ${resolution_notes || 'Issue has been addressed.'}
Photo Proof : ${resolved_image_url}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for helping improve Chennai city infrastructure!

Regards,
Chennai Civic Issue Reporter
          `.trim()
        });
      } catch (e) {
        console.error("Citizen email failed:", e.message);
      }
    }

    res.json({ success: true, message: 'Issue resolved and citizen notified.', data: issue });

  } catch (error) {
    console.error("Resolve error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   5. CREATE DEPARTMENT ADMIN
====================================================== */
exports.createDepartmentAdmin = async (req, res) => {
  try {
    const { name, email, password, department_id } = req.body;
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ success: false, error: 'Email exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department_id)
       VALUES ($1, $2, $3, 'dept_admin', $4)
       RETURNING id, name, email, role, department_id`,
      [name, email, hashedPassword, department_id]
    );

    res.json({ success: true, message: 'Department admin created', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   6. AI INSIGHTS
====================================================== */
exports.getAIInsights = async (req, res) => {
  try {
    const insights = await aiInsightsService.generateInsights();
    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   7. FOLLOW UPS
====================================================== */
exports.triggerFollowUps = async (req, res) => {
  try {
    await followUpService.triggerManualFollowUp();
    res.json({ success: true, message: 'Follow-up emails sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   8. ENHANCED ANALYTICS (Charts + Heatmap)
====================================================== */
exports.getEnhancedAnalytics = async (req, res) => {
  try {
    const [catRes, statRes, mapRes] = await Promise.all([
      pool.query(`SELECT category as name, COUNT(*)::int as count FROM issues GROUP BY category ORDER BY count DESC`),
      pool.query(`SELECT status as name, COUNT(*)::int as count FROM issues GROUP BY status`),
      pool.query(`SELECT id, title, category, priority_score, status, location_lat, location_lng FROM issues WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL`)
    ]);

    res.json({ success: true, data: { categoryData: catRes.rows, statusData: statRes.rows, geoData: mapRes.rows } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   9. GET DEPARTMENT ADMINS
====================================================== */
exports.getDepartmentAdmins = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.role, u.department_id,
        d.name as department_name, d.category as department_category
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role = 'dept_admin'
      ORDER BY d.name
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};