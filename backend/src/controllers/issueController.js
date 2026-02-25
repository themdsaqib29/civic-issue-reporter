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
   // === 4. DERIVE PRIORITY LABEL (BUSINESS RULES) ===
    const communityVotes = 0; // SAFE DEFAULT (voting not implemented yet)

    let priorityLabel = 'LOW';
    if (priorityScore >= 4) priorityLabel = 'MEDIUM';
    if (priorityScore >= 7) priorityLabel = 'HIGH';

    // Vote-based escalation
    if (priorityLabel === 'MEDIUM' && communityVotes >= 10) priorityLabel = 'HIGH';
    if (priorityLabel === 'HIGH' && communityVotes >= 20) priorityLabel = 'URGENT';

    // Severity override
    if (severity && severity.toLowerCase().includes('high')) {
      if (priorityLabel === 'HIGH') priorityLabel = 'URGENT';
    }

    console.log('Final Priority Label:', priorityLabel);

    // === 5. SMART GEOCODING (CHENNAI AREA DICTIONARY) ===
    const chennaiAreas = {
      'vadapalani': { lat: 13.0500, lng: 80.2121 },
      'anna nagar': { lat: 13.0850, lng: 80.2101 },
      'velachery':  { lat: 12.9774, lng: 80.2221 },
      't nagar':    { lat: 13.0418, lng: 80.2341 },
      'tambaram':   { lat: 12.9249, lng: 80.1000 },
      'adyar':      { lat: 13.0012, lng: 80.2565 },
      'pallavaram': { lat: 12.9675, lng: 80.1491 },
      'mylapore':   { lat: 13.0368, lng: 80.2676 },
      'mylapore': { lat: 13.0368, lng: 80.2676 },
  'nungambakkam': { lat: 13.0604, lng: 80.2426 },
  'besant nagar': { lat: 12.9879, lng: 80.2697 },
  'sholinganallur': { lat: 12.9010, lng: 80.2279 },
  'porur': { lat: 13.0463, lng: 80.1624 },
  'ambattur': { lat: 13.1060, lng: 80.1550 },
  'perungudi': { lat: 12.9712, lng: 80.2403 },
  'guindy': { lat: 13.0060, lng: 80.2260 },
  'triplicane': { lat: 13.0460, lng: 80.2680 },
  'egmore': { lat: 13.0710, lng: 80.2590 },
'nanganallur': { lat: 12.9807, lng: 80.1882 },
  'meenambakkam': { lat: 12.9895, lng: 80.1863 },
  'chrompet': { lat: 12.9470, lng: 80.1450 },
  'pallavaram': { lat: 12.9675, lng: 80.1491 },
  'selaiyur': { lat: 12.9068, lng: 80.1425 },
  'perungalathur': { lat: 12.9048, lng: 80.0889 },
  'tambaram': { lat: 12.9249, lng: 80.1000 },
  'medavakkam': { lat: 12.9171, lng: 80.1923 },
  'sholinganallur': { lat: 12.9010, lng: 80.2279 },
  'porur': { lat: 13.0382, lng: 80.1565 },
  'iadbakkam': { lat: 12.9880, lng: 80.2047 },
  'alandur': { lat: 12.9975, lng: 80.2006 },
  'pammal': { lat: 12.9749, lng: 80.1328 },
  'pazhavanthangal': { lat: 12.9895, lng: 80.1863 },
  'st thomas mount': { lat: 12.9950, lng: 80.1890 },
  'mudichur': { lat: 12.9102, lng: 80.0717 },
  'gerugambakkam': { lat: 13.0136, lng: 80.1353 },
  'manapakkam': { lat: 13.0213, lng: 80.1832 }
    };

    let finalLat = location_lat || 13.0827; // Default Chennai
    let finalLng = location_lng || 80.2707; // Default Chennai

    if (location_address) {
      const userAddress = location_address.toLowerCase();
      for (const [area, coords] of Object.entries(chennaiAreas)) {
        if (userAddress.includes(area)) {
          finalLat = coords.lat;
          finalLng = coords.lng;
          console.log(`📍 Smart Geocoding Match: Found '${area}', setting coords to ${finalLat}, ${finalLng}`);
          break; // Stop looking once we find a match
        }
      }
    }

    // === 6. PREPARE DATA FOR DB ===
    const issueData = {
      userId: req.userId,
      title: title || `${normalizedCategory} Issue`,
      description,
      category: normalizedCategory,
      locationLat: finalLat, // Use the smart coordinates
      locationLng: finalLng, // Use the smart coordinates
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
    // === 7. SEND EMAIL AUTOMATICALLY ===
let emailResult = null;

try {
  // 🔥 Fetch citizen email for CC
  const userResult = await pool.query(
    'SELECT email FROM users WHERE id = $1',
    [issue.user_id || issue.userId]
  );

  if (userResult.rows.length > 0) {
    issue.citizen_email = userResult.rows[0].email;
  }

  emailResult = await emailService.sendIssueEmail(issue, department);

  await pool.query(
    'UPDATE issues SET email_sent = true WHERE id = $1',
    [issue.id]
  );

  console.log('✅ Email sent for issue:', issue.id);

} catch (emailError) {
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

    // 🔥 Attach citizen email BEFORE sending
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [issue.user_id]
    );

    if (userResult.rows.length > 0) {
      issue.citizen_email = userResult.rows[0].email;
    }

    // Send email
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
// === ZERO API COST EMAIL PREVIEW ===
exports.previewEmail = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch issue + department info directly
    const query = `
      SELECT i.*, 
             d.email AS department_email, 
             d.name AS department_name
      FROM issues i
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    const issue = result.rows[0];

    // Reconstruct subject dynamically
    const subject = `Civic Issue Reported: ${issue.category} (Priority: ${issue.priority_score}/10)`;

    // Reconstruct body dynamically
    const body = `
Dear ${issue.department_name || 'Department Official'},

A civic issue has been reported that requires your department's attention.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ISSUE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue ID       : #${issue.id}
Category       : ${issue.category}
Priority Level : ${issue.priority_score}/10
Location       : ${issue.location_address}
Reported On    : ${new Date(issue.created_at).toLocaleString('en-IN')}

Description:
${issue.description}

${issue.image_url ? `Photo Evidence: ${issue.image_url}` : ''}

Please log in to the Admin Dashboard to acknowledge and resolve this issue.

Regards,
Chennai Civic Issue Reporter
    `.trim();

    res.json({
      success: true,
      data: {
        to: issue.department_email || 'Unassigned',
        subject,
        body
      }
    });

  } catch (error) {
    console.error('Email preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate email preview'
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

// Get issues reported by the logged-in user
exports.getMyIssues = async (req, res) => {
  try {
    const userId = req.userId; // Extracted from JWT token
    const query = `
      SELECT i.*, d.name as department_name 
      FROM issues i
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get my issues error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your issues' });
  }
};
// Alias for chat
exports.reportIssue = exports.createIssue;