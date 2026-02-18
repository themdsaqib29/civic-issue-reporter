const pool = require('../config/database');
const aiInsightsService = require('../services/aiInsightsService');


// Get all issues sorted by priority (admin view)
exports.getAllIssues = async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    
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
    
    // Priority filter
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
      count: result.rows.length,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Admin get issues error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch issues' 
    });
  }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN priority_score >= 7 THEN 1 END) as high_priority,
        COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent,
        AVG(CASE 
          WHEN status = 'Resolved' AND resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
        END) as avg_resolution_hours
      FROM issues
    `;
    
    const categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM issues
      GROUP BY category
      ORDER BY count DESC
    `;
    
    const deptQuery = `
      SELECT 
        departments.name,
        COUNT(issues.id) as total,
        COUNT(CASE WHEN issues.status = 'Resolved' THEN 1 END) as resolved
      FROM issues
      LEFT JOIN departments ON issues.department_id = departments.id
      GROUP BY departments.name
      ORDER BY total DESC
    `;

    const [statsResult, categoryResult, deptResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(categoryQuery),
      pool.query(deptQuery)
    ]);
    
    res.json({
      success: true,
      data: {
        overview: statsResult.rows[0],
        byCategory: categoryResult.rows,
        byDepartment: deptResult.rows
      }
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stats' 
    });
  }
};

// Resolve issue with photo
exports.resolveIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes, resolved_image_url } = req.body;
    
    // Validate
    if (!resolved_image_url) {
      return res.status(400).json({
        success: false,
        error: 'Resolved image URL is required to close an issue'
      });
    }
    
    const query = `
      UPDATE issues 
      SET 
        status = 'Resolved',
        resolution_notes = $1,
        resolved_image_url = $2,
        resolved_at = NOW(),
        resolved_by = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      resolution_notes || 'Issue resolved by admin',
      resolved_image_url,
      req.userId,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }
    
    const issue = result.rows[0];
    
    // Get citizen info and send notification
    const userResult = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [issue.user_id]
    );
    
    const citizen = userResult.rows[0];
    const emailService = require('../services/emailService');
    
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
      } catch (emailErr) {
        console.error('Citizen notification failed:', emailErr.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Issue resolved successfully. Citizen notified.',
      data: issue
    });
    
  } catch (error) {
    console.error('Resolve issue error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update issue status (without photo - for intermediate statuses)
exports.updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const validStatuses = ['Pending', 'Acknowledged', 'In Progress'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Use /resolve endpoint for Resolved status'
      });
    }
    
    const result = await pool.query(
      `UPDATE issues SET status = $1, resolution_notes = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, notes || null, id]
    );
    
    res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: result.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// AI-powered insights endpoint
exports.getAIInsights = async (req, res) => {
  try {
    const insights = await aiInsightsService.generateInsights();
    
    res.json({
      success: true,
      data: insights
    });
    
  } catch (error) {
    console.error('AI Insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI insights'
    });
  }
};

// Department-specific AI analysis
exports.analyzeDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const analysis = await aiInsightsService.analyzeDepartment(departmentId);
    
    res.json({
      success: true,
      data: analysis
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};