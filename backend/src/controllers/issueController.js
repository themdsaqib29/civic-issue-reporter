const Issue = require('../models/Issue');
const priorityService = require('../services/priorityService');
const departmentService = require('../services/departmentService');
const emailService = require('../services/emailService');

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
    console.log('=== CREATE ISSUE END ===');

    res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: {
        ...issue,
        departmentName: department ? department.name : 'Pending Assignment'
      },
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

// Add this new function:
exports.previewEmail = async (req, res) => {
  try {
    const issueId = req.params.id;
    const issue = await Issue.findById(issueId);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    // Generate email preview
    const emailPreview = emailService.previewEmail(issue, {
      name: issue.department_name,
      email: issue.department_email || 'civic@chennai.gov.in'
    });

    res.json({
      success: true,
      data: emailPreview
    });

  } catch (error) {
    console.error('Email preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate email preview'
    });
  }
};

// Alias for chat
exports.reportIssue = exports.createIssue;
