//const express = require('express');
//const router = express.Router();
//const chatController = require('../controllers/chatController');
//const { verifyToken } = require('../middleware/auth');

// --- DEBUGGING LOGS (This will show us what is missing) ---
//console.log('🔍 DEBUGGING ROUTES:');
//console.log('1. verifyToken is:', typeof verifyToken); // Should say 'function'
//console.log('2. chatController is:', typeof chatController); // Should say 'object'
//console.log('3. processMessage is:', typeof chatController?.processMessage); // Should say 'function'

// If any of above says 'undefined', that is the error!

//router.post('/message', verifyToken, chatController.processMessage);
//router.post('/extract', verifyToken, chatController.extractIssueData);

//module.exports = router;

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController.js');
const { verifyToken } = require('../middleware/auth.js');

// FIX: Use an arrow function wrapper (req, res) => ...
// This prevents the "argument handler must be a function" error
router.post('/message', verifyToken, (req, res) => {
  return chatController.processMessage(req, res);
});

module.exports = router;