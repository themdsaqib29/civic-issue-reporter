const natural = require('natural');
const TfIdf = natural.TfIdf;
const pool = require('../config/database');

class TextDuplicateService {
  /**
   * Calculate cosine similarity between two TF-IDF vectors
   * @param {number[]} vecA - Vector A
   * @param {number[]} vecB - Vector B
   * @returns {number} Cosine similarity (0-1)
   */
  calculateCosineSimilarity(vecA, vecB) {
    if (vecA.length === 0 || vecB.length === 0) return 0;

    const dot = vecA.reduce((sum, val, i) => sum + (val * (vecB[i] || 0)), 0);
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  /**
   * Find similar issues based on TF-IDF text similarity
   * Fetches ALL issues from DB to build corpus, computes similarity against new description
   * @param {string} newDescription - Description of new issue
   * @returns {Promise<Array>} Array of { issueId, textSimilarity } sorted descending
   */
  async findSimilarIssuesByText(newDescription) {
    try {
      // Step 1: Fetch all existing issues from DB
      const query = `
        SELECT id, description 
        FROM issues 
        WHERE description IS NOT NULL 
          AND description != ''
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query);
      const existingIssues = result.rows;

      // Edge case: no existing issues
      if (existingIssues.length === 0) {
        return [];
      }

      // Step 2: Build TF-IDF corpus from ALL existing issues + new description
      const tfidf = new TfIdf();
      
      // Add new description as document 0
      tfidf.addDocument(newDescription);
      
      // Add all existing issues as documents 1, 2, 3, ...
      existingIssues.forEach((issue) => {
        tfidf.addDocument(issue.description);
      });

      // Step 3: Extract all unique terms across corpus
      const allTerms = new Set();
      for (let i = 0; i < tfidf.documents.length; i++) {
        tfidf.listTerms(i).forEach((term) => {
          allTerms.add(term.term);
        });
      }

      // Step 4: Build TF-IDF vector for new description (document 0)
      const newDescVector = [];
      for (const term of allTerms) {
        newDescVector.push(tfidf.tfidf(term, 0));
      }

      // Step 5: Compute similarity for each existing issue
      const similarities = [];
      for (let i = 0; i < existingIssues.length; i++) {
        const existingVector = [];
        for (const term of allTerms) {
          existingVector.push(tfidf.tfidf(term, i + 1)); // i+1 because 0 is new description
        }

        const textSimilarity = this.calculateCosineSimilarity(newDescVector, existingVector);
        
        similarities.push({
          issueId: existingIssues[i].id,
          textSimilarity: Math.round(textSimilarity * 1000) / 1000 // Round to 3 decimals
        });
      }

      // Step 6: Sort by similarity descending and return
      return similarities.sort((a, b) => b.textSimilarity - a.textSimilarity);

    } catch (error) {
      console.error('❌ TextDuplicateService.findSimilarIssuesByText error:', error);
      throw error;
    }
  }
}

module.exports = new TextDuplicateService();
