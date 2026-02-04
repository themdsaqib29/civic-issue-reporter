const Issue = require('../models/Issue');
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
};