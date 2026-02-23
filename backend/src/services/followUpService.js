const cron = require('node-cron');
const pool = require('../config/database');
const emailService = require('./emailService');

class FollowUpService {
  startScheduler() {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('🔔 Running automated follow-up check...');
      await this.processFollowUps();
    });
    console.log('✅ Follow-up scheduler started (runs daily at 9 AM)');
  }

  async processFollowUps() {
    try {
      // Find issues needing follow-up that haven't been fully escalated yet
      const query = `
        SELECT 
          i.*,
          d.name as department_name,
          d.email as department_email,
          u.email as user_email,
          u.name as user_name,
          EXTRACT(EPOCH FROM (NOW() - i.created_at))/86400 as days_pending
        FROM issues i
        LEFT JOIN departments d ON i.department_id = d.id
        LEFT JOIN users u ON i.user_id = u.id
        WHERE i.status IN ('Pending', 'Acknowledged')
        AND i.created_at < NOW() - INTERVAL '3 days'
      `;
      
      const result = await pool.query(query);
      const issues = result.rows;
      
      let processedCount = 0;
      
      for (const issue of issues) {
        const daysPending = Math.floor(issue.days_pending);
        
        // Only trigger if it hasn't reached that specific escalation level yet
        if (daysPending >= 10 && issue.escalation_level < 3) {
          await this.handleDay10Escalation(issue);
          processedCount++;
        } else if (daysPending >= 7 && daysPending < 10 && issue.escalation_level < 2) {
          await this.handleDay7Escalation(issue);
          processedCount++;
        } else if (daysPending >= 3 && daysPending < 7 && issue.escalation_level < 1) {
          await this.handleDay3Reminder(issue);
          processedCount++;
        }
      }
      
      console.log(`✅ Follow-up processing complete. Sent ${processedCount} new emails.`);
      
    } catch (error) {
      console.error('❌ Follow-up processing error:', error);
    }
  }

  async handleDay3Reminder(issue) {
    try {
      const subject = `REMINDER: Pending Issue #${issue.id} - ${issue.category}`;
      const body = `Dear ${issue.department_name},\n\nThis is a reminder about the following pending civic issue:\nIssue ID: #${issue.id}\nCategory: ${issue.category}\nLocation: ${issue.location_address}\nPriority: ${issue.priority_score}/10\nReported: ${new Date(issue.created_at).toLocaleDateString('en-IN')} (3 days ago)\nStatus: ${issue.status}\n\nDescription: ${issue.description}\n\nThis issue has been pending for 3 days. Please update the status or provide an estimated resolution timeline.\n\nTracking: CIV-${String(issue.id).padStart(5, '0')}\nChennai Civic Issue Reporter`.trim();
      
      await emailService.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: issue.department_email,
        subject,
        text: body
      });
      
      // Mark as Level 1 (Day 3 sent)
      await pool.query('UPDATE issues SET escalation_level = 1 WHERE id = $1', [issue.id]);
      console.log(`📧 Day 3 reminder sent for issue #${issue.id}`);
    } catch (error) {
      console.error(`Failed to send Day 3 reminder for #${issue.id}:`, error.message);
    }
  }

  async handleDay7Escalation(issue) {
    try {
      const subject = `ESCALATION: Unresolved Issue #${issue.id} - ${issue.category} (7 Days Pending)`;
      const body = `URGENT ESCALATION NOTICE\n\nDear Supervisor,\n\nThis issue has been pending for 7 days without resolution:\nIssue ID: #${issue.id}\nCategory: ${issue.category}\nPriority: ${issue.priority_score}/10 ${issue.priority_score >= 7 ? '(HIGH PRIORITY)' : ''}\nLocation: ${issue.location_address}\nReported: ${new Date(issue.created_at).toLocaleDateString('en-IN')}\nCurrent Status: ${issue.status}\n\nDescription: ${issue.description}\n${issue.vote_count > 0 ? `Community Support: ${issue.vote_count} citizen(s) have upvoted this issue\n` : ''}\nThis issue requires immediate supervisory attention as it has exceeded the standard 7-day resolution window.\nDepartment: ${issue.department_name}\nAssigned To: ${issue.department_email}\n\nPlease ensure prompt resolution or provide explanation for delay.\n\nChennai Civic Issue Reporter - Automated Escalation System`.trim();
      
      await emailService.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: issue.department_email,
        cc: process.env.EMAIL_USER, 
        subject,
        text: body
      });
      
      // Mark as Level 2 (Day 7 sent)
      await pool.query('UPDATE issues SET escalation_level = 2 WHERE id = $1', [issue.id]);
      console.log(`⚠️ Day 7 escalation sent for issue #${issue.id}`);
    } catch (error) {
      console.error(`Failed to send Day 7 escalation for #${issue.id}:`, error.message);
    }
  }

  async handleDay10Escalation(issue) {
    try {
      const citizenSubject = `Update: Your Issue #${issue.id} Status`;
      const citizenBody = `Dear ${issue.user_name},\n\nWe want to update you on your reported civic issue:\nIssue: ${issue.category}\nLocation: ${issue.location_address}\nReported: ${new Date(issue.created_at).toLocaleDateString('en-IN')} (10 days ago)\nCurrent Status: ${issue.status}\n\nUnfortunately, this issue has not been resolved within the expected timeline. We have escalated this to the concerned department supervisor.\n\nYou can:\n1. Check the status in your dashboard\n2. Report this issue again if the problem persists\n3. Contact us directly for further assistance\n\nWe apologize for the delay and are working to ensure prompt resolution.\nIssue Tracking: CIV-${String(issue.id).padStart(5, '0')}\n\nThank you for your patience.\nChennai Civic Issue Reporter`.trim();
      
      if (issue.user_email) {
        await emailService.transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: issue.user_email,
          subject: citizenSubject,
          text: citizenBody
        });
      }
      
      // Mark as Level 3 (Day 10 sent - final automation)
      await pool.query('UPDATE issues SET escalation_level = 3 WHERE id = $1', [issue.id]);
      console.log(`📩 Day 10 citizen notification sent for issue #${issue.id}`);
    } catch (error) {
      console.error(`Failed to send Day 10 notification for #${issue.id}:`, error.message);
    }
  }

  async triggerManualFollowUp() {
    console.log('🧪 Manual follow-up triggered');
    await this.processFollowUps();
  }
}

module.exports = new FollowUpService();