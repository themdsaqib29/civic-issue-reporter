const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Generate professional email content
  generateEmailContent(issue, department) {
    const priorityText = issue.priority_score >= 7 ? 'URGENT' : 
                        issue.priority_score >= 4 ? 'High Priority' : 'Standard';
    
    const subject = `[${priorityText}] ${issue.category} Issue - ${issue.location_address}`;
    
    const body = `
Dear Sir/Madam,

We are writing to formally report a ${issue.category} issue that requires your department's attention.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ISSUE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue ID      : #${issue.id}
Category      : ${issue.category}
Priority Level: ${priorityText} (${issue.priority_score}/10)
Status        : ${issue.status}
Reported On   : ${new Date(issue.created_at).toLocaleString('en-IN')}

LOCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${issue.location_address}
Coordinates   : ${issue.location_lat}, ${issue.location_lng}

DESCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${issue.description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please acknowledge this complaint and provide a resolution timeline.
${issue.priority_score >= 7 ? 'This is marked URGENT and requires immediate action within 24 hours.' : 
  'Please resolve within the standard 7-day resolution window.'}

This complaint has been filed through the Chennai AI Civic Issue Reporting System.
Tracking ID: CIV-${String(issue.id).padStart(5, '0')}

Regards,
Chennai Civic Issue Reporter
Automated Complaint System
    `.trim();

    return { subject, body };
  }

  // Actually send the email
  async sendIssueEmail(issue, department) {
    try {
      const { subject, body } = this.generateEmailContent(issue, department);
      
      const toEmail = department?.email || process.env.EMAIL_USER; // Fallback to self for testing
      
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: toEmail,
        cc: process.env.EMAIL_USER, // Always CC yourself for records
        subject,
        text: body,
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent:', info.messageId);
      console.log('📧 To:', toEmail);
      
      return {
        success: true,
        messageId: info.messageId,
        to: toEmail,
        subject
      };
      
    } catch (error) {
      console.error('❌ Email send error:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // Preview only (no sending)
  previewEmail(issue, department) {
    return this.generateEmailContent(issue, department);
  }

  // Test SMTP connection
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email SMTP error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();