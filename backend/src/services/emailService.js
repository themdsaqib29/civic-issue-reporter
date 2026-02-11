class EmailService {
  /**
   * Generate email content based on issue details (Template-based for MVP)
   */
  generateEmailContent(issue, department) {
    const priorityText = issue.priority_score >= 7 ? 'URGENT' : 
                        issue.priority_score >= 4 ? 'High Priority' : 'Standard';
    
    const subject = `[${priorityText}] ${issue.category} Issue - ${issue.location_address}`;
    
    const body = `
Dear Sir/Madam,

We are writing to report a ${issue.category.toLowerCase()} issue that requires your attention.

ISSUE DETAILS:
--------------
Category: ${issue.category}
Priority Level: ${priorityText} (${issue.priority_score}/10)
Location: ${issue.location_address}
Description: ${issue.description}

Reported on: ${new Date(issue.created_at).toLocaleString('en-IN')}
Issue ID: #${issue.id}

This issue has been flagged as ${priorityText.toLowerCase()} based on the following factors:
${issue.priority_score >= 7 ? '- High safety impact\n- Urgent keywords detected in description' : ''}
${issue.vote_count > 0 ? `- Community support: ${issue.vote_count} citizen(s) have upvoted this issue\n` : ''}

We request you to take appropriate action at the earliest.

Thank you for your service to the community.

Regards,
Chennai Civic Issue Reporter
Citizen Complaint System
`;

    return {
      to: department?.email || 'civic@chennai.gov.in',
      subject,
      body
    };
  }

  /**
   * Preview email without sending (for demo)
   */
  previewEmail(issue, department) {
    return this.generateEmailContent(issue, department);
  }
}

module.exports = new EmailService();