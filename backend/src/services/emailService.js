const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    
    // Initialize Gemini AI (if key is present)
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    }
  }

  /**
   * AI-POWERED EMAIL GENERATION
   */
  async generateAIEmail(issue, department) {
    try {
      const priorityText = issue.priority_score >= 7 ? 'URGENT' : 
                          issue.priority_score >= 4 ? 'High Priority' : 'Standard';
      
      const prompt = `
You are a professional government correspondence writer for Chennai Municipal Corporation.
Write a formal complaint email to the civic department about the following issue:

ISSUE DETAILS:
- Category: ${issue.category}
- Priority: ${priorityText} (${issue.priority_score}/10)
- Location: ${issue.location_address}
- Description: ${issue.description}
- Reported on: ${new Date(issue.created_at).toLocaleString('en-IN')}
- Issue ID: #${issue.id}

DEPARTMENT:
- Name: ${department?.name || 'Civic Department'}

REQUIREMENTS:
1. Write in formal, professional government correspondence style.
2. Use respectful language ("Dear Sir/Madam").
3. Clearly state the problem and location.
4. ${issue.priority_score >= 7 ? 'Emphasize URGENCY and request immediate action within 24 hours.' : 'Request resolution within standard 7-day timeline.'}
5. Include the Issue ID for reference.
6. Keep it concise (150-200 words max).
7. End with "Regards, Chennai Civic Issue Reporter".

FORMAT:
Return ONLY the email subject and body in this EXACT JSON format:
{
  "subject": "subject line here",
  "body": "email body here"
}
Do NOT include any markdown, code blocks, or extra text. ONLY valid JSON.
`;

      console.log('🤖 Generating AI email...');
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Clean response (remove markdown if present)
      const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const emailContent = JSON.parse(cleanedResponse);
      
      console.log('✅ AI email generated successfully');
      return emailContent;
      
    } catch (error) {
      console.error('❌ AI generation failed, falling back to template:', error.message);
      return this.generateTemplateEmail(issue, department); // Fallback
    }
  }

  /**
   * TEMPLATE-BASED EMAIL (Fallback if AI fails or no API key)
   */
  generateTemplateEmail(issue, department) {
    const priorityText = issue.priority_score >= 7 ? 'URGENT' : 
                        issue.priority_score >= 4 ? 'High Priority' : 'Standard';
    
    const subject = `[${priorityText}] ${issue.category} Issue - ${issue.location_address}`;
    const body = `
Dear Sir/Madam,

We are writing to formally report a ${issue.category} issue that requires your department's attention.

Issue ID      : #${issue.id}
Category      : ${issue.category}
Priority Level: ${priorityText} (${issue.priority_score}/10)
Location      : ${issue.location_address}
Description   : ${issue.description}
Reported on   : ${new Date(issue.created_at).toLocaleString('en-IN')}

${issue.priority_score >= 7 ? 'This is marked URGENT and requires immediate action within 24 hours.' : 'Please resolve within the standard 7-day resolution window.'}

Regards,
Chennai Civic Issue Reporter
    `.trim();

    return { subject, body };
  }

  /**
   * SEND EMAIL
   */
  async sendIssueEmail(issue, department, useAI = true) {
    try {
      let emailContent;
      
      // Check if AI is requested AND the API key exists
      if (useAI && this.model) {
        emailContent = await this.generateAIEmail(issue, department);
      } else {
        emailContent = this.generateTemplateEmail(issue, department);
      }
      
      const toEmail = department?.email || process.env.EMAIL_USER;
      
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: toEmail,
        cc: process.env.EMAIL_USER,
        subject: emailContent.subject,
        text: emailContent.body,
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId, to: toEmail };
      
    } catch (error) {
      console.error('❌ Email send error:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // Preview Email (for the frontend button)
  async previewEmail(issue, department) {
    if (this.model) {
      return await this.generateAIEmail(issue, department);
    } else {
      return this.generateTemplateEmail(issue, department);
    }
  }
}

module.exports = new EmailService();