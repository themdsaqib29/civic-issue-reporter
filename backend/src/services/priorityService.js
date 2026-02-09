class PriorityService {
  calculatePriority(issue, historicalData, communityVotes) {
    let score = 0;
    
    // 1. Category severity (0-3 points)
    const severityMap = {
      'Road Maintenance': 3,  // High safety impact
      'Water Supply': 3,
      'Drainage': 2,
      'Streetlight': 2,
      'Garbage Collection': 1,
      'Public Health': 3,
      'Other': 1
    };
    score += severityMap[issue.category] || 1;
    
    // 2. Sentiment urgency from NLP (0-2 points)
    if (issue.sentimentScore) {
      if (issue.sentimentScore > 0.7) score += 2; // Very urgent
      else if (issue.sentimentScore > 0.4) score += 1; // Moderately urgent
    }
    
    // 3. Community votes (0-2 points)
    if (communityVotes > 20) score += 2;
    else if (communityVotes > 5) score += 1;
    
    // 4. Historical unresolved issues in area (0-2 points)
    if (historicalData.unresolvedCount > 10) score += 2;
    else if (historicalData.unresolvedCount > 3) score += 1;
    
    // 5. Time-sensitive keywords (0-1 point)
    const urgentKeywords = ['emergency',
  'urgent',
  'dangerous',
  'blocking',
  'accident',
  'accidents',
  'traffic',
  'jam',
  'congestion'];
    const hasUrgent = urgentKeywords.some(kw => 
      issue.description.toLowerCase().includes(kw)
    );
    if (hasUrgent) score += 1;
    
    // Normalize to 1-10 scale
    return Math.min(10, Math.max(1, score));
  }
}

module.exports = new PriorityService();