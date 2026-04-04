const pool = require('../config/database');
const { recalculatePriorityScore } = require('./issueController');

// Upvote an issue
exports.upvoteIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const userId = req.userId; // From JWT middleware
    
    // 1. Check if already voted
    const checkQuery = 'SELECT * FROM votes WHERE user_id = $1 AND issue_id = $2';
    const existing = await pool.query(checkQuery, [userId, issueId]);
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'You have already voted for this issue' });
    }
    
    // 2. Add vote to votes table
    await pool.query('INSERT INTO votes (user_id, issue_id) VALUES ($1, $2)', [userId, issueId]);
    
    // 3. Increment vote_count in issues table
    await pool.query('UPDATE issues SET vote_count = vote_count + 1 WHERE id = $1', [issueId]);
    
    // 4. Recalculate priority score and label based on new vote count
    await recalculatePriorityScore(issueId);
    
    res.json({ success: true, message: 'Vote added successfully' });
    
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Remove vote
exports.removeVote = async (req, res) => {
  try {
    const { issueId } = req.params;
    const userId = req.userId;
    
    const result = await pool.query('DELETE FROM votes WHERE user_id = $1 AND issue_id = $2 RETURNING *', [userId, issueId]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'You have not voted for this issue' });
    }
    
    // Decrement vote count (prevent negative numbers)
    await pool.query('UPDATE issues SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = $1', [issueId]);
    
    // Recalculate priority score and label after vote removal
    await recalculatePriorityScore(issueId);
    
    res.json({ success: true, message: 'Vote removed' });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Check if user voted (used to color the button green on frontend)
exports.checkVote = async (req, res) => {
  try {
    const { issueId } = req.params;
    const userId = req.userId;
    
    const result = await pool.query('SELECT * FROM votes WHERE user_id = $1 AND issue_id = $2', [userId, issueId]);
    
    res.json({ success: true, hasVoted: result.rows.length > 0 });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};