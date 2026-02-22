const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { verifyToken } = require('../middleware/auth'); // Ensure user is logged in

router.post('/issues/:issueId/vote', verifyToken, voteController.upvoteIssue);
router.delete('/issues/:issueId/vote', verifyToken, voteController.removeVote);
router.get('/issues/:issueId/vote-check', verifyToken, voteController.checkVote);

module.exports = router;