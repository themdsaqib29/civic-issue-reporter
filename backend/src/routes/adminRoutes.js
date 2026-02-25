const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth'); 
const auth = require('../middleware/auth');

// 🛠️ DIAGNOSTIC TOOL: This prevents crashes and tells you exactly what is missing
const safeRoute = (fn, name) => {
    if (typeof fn === 'function') return fn;
    console.error(`🚨 MISSING FUNCTION DETECTED: "${name}" is undefined! Check your files and make sure you saved them.`);
    return (req, res) => res.status(500).json({ error: `${name} is missing or not exported correctly.` });
};

// Protect all routes
router.use(safeRoute(auth.verifyToken, 'verifyToken'));

// Safely map the auth middleware
const requireAnyAdmin = safeRoute(adminAuth.requireAnyAdmin, 'requireAnyAdmin');
const requireMainAdmin = safeRoute(adminAuth.requireMainAdmin, 'requireMainAdmin');

// ======================================================
// 🟢 LEVEL 1: BOTH MAIN ADMIN & DEPT ADMINS CAN ACCESS
// ======================================================
router.get('/issues', requireAnyAdmin, safeRoute(adminController.getAllIssues, 'getAllIssues'));
router.get('/stats', requireAnyAdmin, safeRoute(adminController.getDashboardStats, 'getDashboardStats'));
router.patch('/issues/:id/status', requireAnyAdmin, safeRoute(adminController.updateIssueStatus, 'updateIssueStatus'));
router.post('/issues/:id/resolve', requireAnyAdmin, safeRoute(adminController.resolveIssue, 'resolveIssue'));

// ======================================================
// 🔴 LEVEL 2: STRICTLY MAIN ADMIN ONLY
// ======================================================
router.get('/ai-insights', requireMainAdmin, safeRoute(adminController.getAIInsights, 'getAIInsights'));
router.get('/enhanced-analytics', requireMainAdmin, safeRoute(adminController.getEnhancedAnalytics, 'getEnhancedAnalytics'));
router.post('/trigger-followups', requireMainAdmin, safeRoute(adminController.triggerFollowUps, 'triggerFollowUps'));

// Department Admin Management
router.post('/dept-admins', requireMainAdmin, safeRoute(adminController.createDepartmentAdmin, 'createDepartmentAdmin'));
router.get('/dept-admins', requireMainAdmin, safeRoute(adminController.getDepartmentAdmins, 'getDepartmentAdmins'));

module.exports = router;