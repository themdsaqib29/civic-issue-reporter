const Issue = require('../models/Issue');
const priorityService = require('../services/priorityService');
const departmentService = require('../services/departmentService');
const emailService = require('../services/emailService');
const pool = require('../config/database'); 

exports.createIssue = async (req, res) => {
  try {
    console.log('=== CREATE ISSUE START ===');
    console.log('Request body:', req.body);
    
    // Destructure input
    const {
      title,
      description,
      category,
      location_address,
      severity,
      location_lat,
      location_lng,
      image_url
    } = req.body;
    
    // Validation
    if (!description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Description and category are required'
      });
    }

    // === 1. NORMALIZE CATEGORY ===
    const categoryMap = {
      'road': 'Road Maintenance',
      'Road Maintenance': 'Road Maintenance',
      'garbage': 'Garbage Collection',
      'Garbage': 'Garbage Collection',
      'Garbage Collection': 'Garbage Collection',
      'streetlight': 'Streetlight',
      'Streetlight': 'Streetlight',
      'water': 'Water Supply',
      'Water Supply': 'Water Supply',
      'drainage': 'Drainage',
      'Drainage': 'Drainage',
      'Public Health': 'Public Health'
    };
    
    const normalizedCategory = categoryMap[category] || category;
    console.log(`Category normalized: "${category}" → "${normalizedCategory}"`);

    // === 2. ASSIGN DEPARTMENT ===
    const department = await departmentService.assignDepartment(
      normalizedCategory,
      location_address || 'Chennai'
    );
    console.log('Assigned Department:', department ? department.name : 'None found');

    // === 3. CALCULATE PRIORITY SCORE ===
    let sentimentScore = 0.5;
    if (severity && severity.toLowerCase().includes('high')) sentimentScore = 0.8;
    if (severity && severity.toLowerCase().includes('low')) sentimentScore = 0.2;

    const priorityScore = priorityService.calculatePriority(
      {
        category: normalizedCategory,
        description,
        sentimentScore
      },
      { unresolvedCount: 0 },
      0
    );

    console.log('Priority Score:', priorityScore);

    // === 4. DERIVE PRIORITY LABEL (BUSINESS RULES) ===
    const communityVotes = 0; // SAFE DEFAULT (voting not implemented yet)

    let priorityLabel = 'LOW';

    if (priorityScore >= 4) priorityLabel = 'MEDIUM';
    if (priorityScore >= 7) priorityLabel = 'HIGH';

    // Vote-based escalation
    if (priorityLabel === 'MEDIUM' && communityVotes >= 10) {
      priorityLabel = 'HIGH';
    }

    if (priorityLabel === 'HIGH' && communityVotes >= 20) {
      priorityLabel = 'URGENT';
    }

    // Severity override
    if (severity && severity.toLowerCase().includes('high')) {
      if (priorityLabel === 'HIGH') {
        priorityLabel = 'URGENT';
      }
    }

    console.log('Final Priority Label:', priorityLabel);

    // === 5. PREPARE DATA FOR DB ===
    const issueData = {
      userId: req.userId,
      title: title || `${normalizedCategory} Issue`,
      description,
      category: normalizedCategory,
      locationLat: location_lat || 13.0827,
      locationLng: location_lng || 80.2707,
      locationAddress: location_address || 'Location not specified',
      imageUrl: image_url || null,
      priorityScore,
      departmentId: department ? department.id : null,
      severity: severity || 'Normal'
    };

    // === 6. SAVE TO DATABASE ===
    const issue = await Issue.create(issueData);
    console.log('Issue created successfully:', issue.id);

    // === 7. SEND EMAIL AUTOMATICALLY ===
    let emailResult = null;
    try {
      emailResult = await emailService.sendIssueEmail(issue, department);
      
      // Mark email as sent in database
      await pool.query(
        'UPDATE issues SET email_sent = true WHERE id = $1',
        [issue.id]
      );
      
      console.log('✅ Email sent for issue:', issue.id);
    } catch (emailError) {
      // Don't fail the whole request if email fails
      console.error('⚠️ Email failed (issue still saved):', emailError.message);
    }

    console.log('=== CREATE ISSUE END ===');

    res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: {
        ...issue,
        departmentName: department ? department.name : 'Pending Assignment'
      },
      emailSent: !!emailResult,
      emailTo: department?.email || 'N/A',
      priorityLevel: priorityLabel
    });

  } catch (error) {
    console.error('=== CREATE ISSUE ERROR ===');
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create issue'
    });
  }
};

exports.getAllIssues = async (req, res) => {
  try {
    const issues = await Issue.findAll();
    res.json({
      success: true,
      data: issues
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issues'
    });
  }
};

exports.getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    res.json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue'
    });
  }
};

// === NEW: MANUAL EMAIL SEND ===
exports.sendEmail = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({ 
        success: false, 
        error: 'Issue not found' 
      });
    }

    // Get department info
    let department = null;
    if (issue.department_id) {
      const deptResult = await pool.query(
        'SELECT * FROM departments WHERE id = $1', 
        [issue.department_id]
      );
      department = deptResult.rows[0];
    }

    const emailResult = await emailService.sendIssueEmail(issue, department);

    // Update email_sent flag
    await pool.query(
      'UPDATE issues SET email_sent = true WHERE id = $1',
      [issue.id]
    );

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: emailResult
    });

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// === UPDATED: EMAIL PREVIEW ===
exports.previewEmail = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({ 
        success: false, 
        error: 'Issue not found' 
      });
    }

    let department = null;
    if (issue.department_id) {
      const deptResult = await pool.query(
        'SELECT * FROM departments WHERE id = $1', 
        [issue.department_id]
      );
      department = deptResult.rows[0];
    }

    const preview = emailService.previewEmail(issue, department);

    res.json({
      success: true,
      data: {
        ...preview,
        to: department?.email || 'civic@chennai.gov.in',
        departmentName: department?.name || 'General'
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate preview' 
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes, resolved_image_url } = req.body;
    
    // Valid statuses
    const validStatuses = ['Pending', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Build update query
    let query, values;
    
    if (status === 'Resolved' || status === 'Closed') {
      query = `
        UPDATE issues 
        SET status = $1, 
            resolution_notes = $2, 
            resolved_image_url = $3,
            resolved_at = NOW(),
            resolved_by = $4,
            updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `;
      values = [status, resolution_notes || null, resolved_image_url || null, req.userId, id];
    } else {
      query = `
        UPDATE issues 
        SET status = $1,
            resolution_notes = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      values = [status, resolution_notes || null, id];
    }
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    const updatedIssue = result.rows[0];

    // Send notification email to citizen if resolved
    if (status === 'Resolved' || status === 'Closed') {
      try {
        // Get citizen email
        const userResult = await pool.query(
          'SELECT email, name FROM users WHERE id = $1',
          [updatedIssue.user_id]
        );
        
        const citizen = userResult.rows[0];
        
        if (citizen) {
          await emailService.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: citizen.email,
            subject: `✅ Your Issue #${id} Has Been Resolved`,
            text: `
Dear ${citizen.name},

Great news! Your reported issue has been resolved.

Issue Details:
--------------
Issue ID    : #${id}
Category    : ${updatedIssue.category}
Location    : ${updatedIssue.location_address}
Resolved On : ${new Date().toLocaleString('en-IN')}

Resolution Notes: ${resolution_notes || 'Issue has been addressed by the department.'}

Thank you for helping improve Chennai!

Regards,
Chennai Civic Issue Reporter
            `.trim()
          });
          console.log('✅ Resolution notification sent to citizen:', citizen.email);
        }
      } catch (emailError) {
        console.error('⚠️ Citizen notification failed:', emailError.message);
      }
    }

    res.json({
      success: true,
      message: `Issue status updated to ${status}`,
      data: updatedIssue
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
// Alias for chat
exports.reportIssue = exports.createIssue;