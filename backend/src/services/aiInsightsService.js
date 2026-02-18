const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/database');

class AIInsightsService {
  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Using gemini-pro to prevent 404 errors
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' }); 
    }
  }

  async generateInsights() {
    try {
      if (!this.model) {
        throw new Error("Gemini API Key is missing in .env or model failed to initialize.");
      }
      
      const data = await this.gatherSystemData();
      const insights = await this.analyzeWithAI(data);
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        data: insights
      };
      
    } catch (error) {
      console.error('AI Insights error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async gatherSystemData() {
    const overallQuery = `
      SELECT 
        COUNT(*) as total_issues,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN priority_score >= 7 THEN 1 END) as high_priority,
        AVG(CASE 
          WHEN status = 'Resolved' AND resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
        END) as avg_resolution_hours,
        AVG(priority_score) as avg_priority
      FROM issues
    `;

    const deptQuery = `
      SELECT 
        d.name as department,
        COUNT(i.id) as total_assigned,
        COUNT(CASE WHEN i.status = 'Pending' THEN 1 END) as pending,
        COUNT(CASE WHEN i.status = 'Resolved' THEN 1 END) as resolved,
        AVG(CASE 
          WHEN i.status = 'Resolved' AND i.resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/3600 
        END) as avg_resolution_hours,
        AVG(i.priority_score) as avg_priority
      FROM departments d
      LEFT JOIN issues i ON d.id = i.department_id
      GROUP BY d.name
      ORDER BY total_assigned DESC
    `;

    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        AVG(priority_score) as avg_priority,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_count,
        AVG(CASE 
          WHEN status = 'Resolved' AND resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
        END) as avg_resolution_hours
      FROM issues
      GROUP BY category
      ORDER BY count DESC
    `;

    const oldIssuesQuery = `
      SELECT 
        COUNT(*) as count,
        AVG(priority_score) as avg_priority
      FROM issues
      WHERE status = 'Pending'
      AND created_at < NOW() - INTERVAL '7 days'
    `;

    const [overall, departments, categories, oldIssues] = await Promise.all([
      pool.query(overallQuery),
      pool.query(deptQuery),
      pool.query(categoryQuery),
      pool.query(oldIssuesQuery)
    ]);

    return {
      overall: overall.rows[0],
      departments: departments.rows,
      categories: categories.rows,
      oldIssues: oldIssues.rows[0]
    };
  }

  async analyzeWithAI(data) {
    // Helper function to safely handle string numbers from PostgreSQL
    const formatNum = (num) => num ? Number(num).toFixed(1) : 'N/A';

    const prompt = `
You are an expert data analyst for Chennai Municipal Corporation's civic issue management system.
Analyze the following data and provide actionable insights.

OVERALL STATISTICS:
- Total Issues: ${data.overall.total_issues}
- Pending: ${data.overall.pending}
- Resolved: ${data.overall.resolved}
- High Priority Issues: ${data.overall.high_priority}
- Average Resolution Time: ${formatNum(data.overall.avg_resolution_hours)} hours
- Average Priority Score: ${formatNum(data.overall.avg_priority)}/10

DEPARTMENT PERFORMANCE:
${data.departments.map(d => `
- ${d.department}:
  * Assigned: ${d.total_assigned}
  * Pending: ${d.pending}
  * Resolved: ${d.resolved}
  * Avg Resolution: ${formatNum(d.avg_resolution_hours)} hours
`).join('')}

CATEGORY BREAKDOWN:
${data.categories.map(c => `
- ${c.category}:
  * Total: ${c.count}
  * Avg Priority: ${formatNum(c.avg_priority)}/10
  * Resolved: ${c.resolved_count}
  * Avg Resolution: ${formatNum(c.avg_resolution_hours)} hours
`).join('')}

OLD PENDING ISSUES (>7 days):
- Count: ${data.oldIssues.count}
- Average Priority: ${formatNum(data.oldIssues.avg_priority)}/10

PROVIDE INSIGHTS IN THIS EXACT JSON FORMAT:
{
  "summary": "Brief 2-sentence overview of system health",
  "criticalAlerts": [
    "Alert 1 if any critical issues detected",
    "Alert 2..."
  ],
  "predictiveInsights": [
    "Future prediction 1",
    "Future prediction 2"
  ]
}

Be specific, actionable, and data-driven.
Return ONLY valid JSON, no markdown or extra text.
`;

    console.log('🤖 Generating AI insights...');
    
    const result = await this.model.generateContent(prompt);
    const response = result.response.text();
    
    // Clean and parse JSON safely
    const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const insights = JSON.parse(cleaned);
    
    console.log('✅ AI insights generated');
    return insights;
  }
}

module.exports = new AIInsightsService();