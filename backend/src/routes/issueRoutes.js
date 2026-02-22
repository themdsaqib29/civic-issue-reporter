const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { verifyToken } = require('../middleware/auth');

// All issue routes require authentication
router.get('/my-issues', verifyToken, issueController.getMyIssues);
router.post('/', verifyToken, issueController.createIssue);
router.get('/', verifyToken, issueController.getAllIssues);
router.get('/:id', verifyToken, issueController.getIssueById);
router.get('/:id/email-preview', verifyToken, issueController.previewEmail);
router.post('/:id/send-email', verifyToken, issueController.sendEmail);
router.patch('/:id/status', verifyToken, issueController.updateStatus);

module.exports = router;