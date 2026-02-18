const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

// All admin routes need both auth + admin role
router.use(verifyToken);
router.use(requireAdmin);

router.get('/issues', adminController.getAllIssues);
router.get('/stats', adminController.getDashboardStats);
router.patch('/issues/:id/status', adminController.updateIssueStatus);
router.post('/issues/:id/resolve', adminController.resolveIssue);
router.get('/ai-insights', adminController.getAIInsights);
router.get('/departments/:departmentId/analyze', adminController.analyzeDepartment);

module.exports = router;