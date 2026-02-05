const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { verifyToken } = require('../middleware/auth');

// All issue routes require authentication
router.post('/', verifyToken, issueController.createIssue);
router.get('/', verifyToken, issueController.getAllIssues);
router.get('/:id', verifyToken, issueController.getIssueById);

module.exports = router;