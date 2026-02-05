/*const Issue = require('../models/Issue');
const priorityService = require('../services/priorityService');
const duplicateDetectionService = require('../services/duplicateDetectionService');

exports.createIssue = async (req, res) => {
  try {
    const issueData = {
      userId: req.userId,
      ...req.body
    };

    // Check for duplicates
    const similarIssues = await duplicateDetectionService.findSimilarIssues(issueData);
    
    if (similarIssues.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Similar issues found in your area',
        duplicates: similarIssues,
        suggestion: 'Would you like to upvote an existing issue instead?'
      });
    }

    // Calculate priority score
    const priorityScore = priorityService.calculatePriority(issueData, {
      unresolvedCount: 0 // You'll query this from DB later
    }, 0); // Initial vote count is 0

    // Add priority to issue data
    issueData.priority_score = priorityScore;

    // Create issue
    const issue = await Issue.create(issueData);

    res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: issue,
      priorityLevel: priorityScore >= 7 ? 'HIGH' : priorityScore >= 4 ? 'MEDIUM' : 'LOW'
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};*/

const Issue = require('../models/Issue');
const priorityService = require('../services/priorityService');

exports.createIssue = async (req, res) => {
  try {
    console.log('=== CREATE ISSUE START ===');
    console.log('Request body:', req.body);
    console.log('User ID:', req.userId);
    
    const { title, description, category, location_address, severity } = req.body;
    
    // Validation
    if (!description || !category) {
      console.log('Validation failed: missing description or category');
      return res.status(400).json({
        success: false,
        error: 'Description and category are required'
      });
    }
    
    // Calculate priority
    const priorityScore = priorityService.calculatePriority({
      category,
      description,
      sentimentScore: severity === 'urgent' ? 0.8 : severity === 'normal' ? 0.5 : 0.2
    }, { unresolvedCount: 0 }, 0);
    
    console.log('Priority score calculated:', priorityScore);
    
    // Prepare data
    const issueData = {
      userId: req.userId,
      title: title || `${category} Issue`,
      description,
      category,
      locationLat: req.body.location_lat || 13.0827,
      locationLng: req.body.location_lng || 80.2707,
      locationAddress: location_address || 'Location not specified',
      imageUrl: req.body.image_url || null,
      priorityScore,
      severity
    };
    
    console.log('Creating issue with data:', issueData);
    
    // Create in database
    const issue = await Issue.create(issueData);
    
    console.log('Issue created successfully:', issue.id);
    console.log('=== CREATE ISSUE END ===');
    
    res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: issue,
      priorityLevel: priorityScore >= 7 ? 'HIGH' : priorityScore >= 4 ? 'MEDIUM' : 'LOW'
    });
    
  } catch (error) {
    console.error('=== CREATE ISSUE ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
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