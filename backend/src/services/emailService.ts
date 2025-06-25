import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface CertificationReminderData {
  userEmail: string;
  userName: string;
  certificationName: string;
  vendor: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  certificateNumber?: string;
  renewalUrl?: string;
  urgencyLevel: 'planning' | 'preparation' | 'action' | 'urgent' | 'critical' | 'expired';
}

class EmailService {
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Configure based on environment variables
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      emailConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      };
    }

    // Use SendGrid if configured
    if (process.env.SENDGRID_API_KEY) {
      this.transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else {
      this.transporter = nodemailer.createTransport(emailConfig);
    }
  }

  async sendCertificationReminder(data: CertificationReminderData): Promise<boolean> {
    try {
      const template = this.generateReminderTemplate(data);
      
      const mailOptions = {
        from: `${process.env.FROM_NAME || 'CertTracker'} <${process.env.FROM_EMAIL || 'noreply@certtracker.com'}>`,
        to: data.userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Log successful email send
      await this.logNotification({
        userEmail: data.userEmail,
        notificationType: this.getNotificationTypeFromUrgency(data.urgencyLevel),
        channel: 'EMAIL',
        delivered: true,
        messageContent: template.subject
      });

      console.log(`✅ Certification reminder email sent to ${data.userEmail} for ${data.certificationName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send certification reminder email to ${data.userEmail}:`, error);
      
      // Log failed email send
      await this.logNotification({
        userEmail: data.userEmail,
        notificationType: this.getNotificationTypeFromUrgency(data.urgencyLevel),
        channel: 'EMAIL',
        delivered: false,
        messageContent: `Failed to send: ${error}`
      });

      return false;
    }
  }

  private generateReminderTemplate(data: CertificationReminderData): EmailTemplate {
    const { urgencyLevel, daysUntilExpiration, certificationName, vendor, expirationDate, userName } = data;
    
    const urgencyConfig = this.getUrgencyConfig(urgencyLevel, daysUntilExpiration);
    const formattedDate = expirationDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const subject = `${urgencyConfig.emoji} ${urgencyConfig.prefix}: ${certificationName} ${urgencyConfig.suffix}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certification Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${urgencyConfig.color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .cert-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyConfig.color}; }
        .action-buttons { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .urgency-${urgencyLevel} { border-color: ${urgencyConfig.color}; }
        .days-remaining { font-size: 24px; font-weight: bold; color: ${urgencyConfig.color}; text-align: center; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${urgencyConfig.emoji} Certification Reminder</h1>
            <p>${urgencyConfig.message}</p>
        </div>
        
        <div class="content">
            <p>Hello ${userName},</p>
            
            <div class="cert-details urgency-${urgencyLevel}">
                <h3>${certificationName}</h3>
                <p><strong>Vendor:</strong> ${vendor}</p>
                <p><strong>Expiration Date:</strong> ${formattedDate}</p>
                ${data.certificateNumber ? `<p><strong>Certificate Number:</strong> ${data.certificateNumber}</p>` : ''}
                
                <div class="days-remaining">
                    ${daysUntilExpiration > 0 ? `${daysUntilExpiration} days remaining` : 'EXPIRED'}
                </div>
            </div>

            ${this.getUrgencySpecificContent(urgencyLevel, daysUntilExpiration)}

            <div class="action-buttons">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/certifications" class="btn btn-primary">
                    View My Certifications
                </a>
                ${data.renewalUrl ? `<a href="${data.renewalUrl}" class="btn btn-secondary">Renewal Information</a>` : ''}
            </div>

            <p>Best regards,<br>The CertTracker Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated reminder from CertTracker. To update your notification preferences, 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings">click here</a>.</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
${urgencyConfig.emoji} Certification Reminder: ${certificationName}

Hello ${userName},

Your ${vendor} ${certificationName} certification ${daysUntilExpiration > 0 ? `expires in ${daysUntilExpiration} days` : 'has expired'} on ${formattedDate}.

${this.getUrgencySpecificTextContent(urgencyLevel, daysUntilExpiration)}

View your certifications: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/certifications

Best regards,
The CertTracker Team
`;

    return { subject, html, text };
  }

  private getUrgencyConfig(urgencyLevel: string, daysUntilExpiration: number) {
    const configs = {
      planning: {
        emoji: '📅',
        prefix: 'Planning Reminder',
        suffix: 'expires in 1 year',
        color: '#17a2b8',
        message: 'Start planning for your certification renewal'
      },
      preparation: {
        emoji: '📚',
        prefix: 'Preparation Phase',
        suffix: `expires in ${daysUntilExpiration} days`,
        color: '#007bff',
        message: 'Time to begin your renewal preparation'
      },
      action: {
        emoji: '⚡',
        prefix: 'Action Required',
        suffix: `expires in ${daysUntilExpiration} days`,
        color: '#ffc107',
        message: 'Immediate action needed for renewal'
      },
      urgent: {
        emoji: '🚨',
        prefix: 'URGENT',
        suffix: `expires in ${daysUntilExpiration} days`,
        color: '#fd7e14',
        message: 'Urgent: Certification expires soon!'
      },
      critical: {
        emoji: '🔥',
        prefix: 'CRITICAL',
        suffix: `expires in ${daysUntilExpiration} days`,
        color: '#dc3545',
        message: 'Critical: Certification expires very soon!'
      },
      expired: {
        emoji: '❌',
        prefix: 'EXPIRED',
        suffix: 'has expired',
        color: '#6c757d',
        message: 'Your certification has expired'
      }
    };

    return configs[urgencyLevel as keyof typeof configs] || configs.action;
  }

  private getUrgencySpecificContent(urgencyLevel: string, daysUntilExpiration: number): string {
    switch (urgencyLevel) {
      case 'planning':
        return `
          <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4>📋 Planning Phase Recommendations:</h4>
            <ul>
              <li>Review current certification requirements</li>
              <li>Check for any updates to the exam format</li>
              <li>Begin collecting continuing education credits if required</li>
              <li>Set aside budget for renewal fees</li>
            </ul>
          </div>`;
      
      case 'preparation':
        return `
          <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4>📚 Preparation Phase Actions:</h4>
            <ul>
              <li>Schedule your renewal exam or complete required training</li>
              <li>Gather necessary documentation</li>
              <li>Review study materials and practice tests</li>
              <li>Plan your study schedule</li>
            </ul>
          </div>`;
      
      case 'action':
        return `
          <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4>⚡ Immediate Actions Required:</h4>
            <ul>
              <li><strong>Register for your renewal exam NOW</strong></li>
              <li>Complete any outstanding requirements</li>
              <li>Submit renewal application</li>
              <li>Pay renewal fees</li>
            </ul>
          </div>`;
      
      case 'urgent':
        return `
          <div style="background: #ffe6cc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4>🚨 URGENT: Final Notice</h4>
            <p><strong>Your certification expires in ${daysUntilExpiration} days!</strong></p>
            <ul>
              <li>Complete renewal process immediately</li>
              <li>Contact vendor support if needed</li>
              <li>Ensure all documentation is submitted</li>
            </ul>
          </div>`;
      
      case 'critical':
        return `
          <div style="background: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4>🔥 CRITICAL: Last Chance</h4>
            <p><strong>Only ${daysUntilExpiration} days left!</strong></p>
            <ul>
              <li>This is your final reminder</li>
              <li>Complete renewal TODAY</li>
              <li>Contact your manager if assistance is needed</li>
            </ul>
          </div>`;
      
      case 'expired':
        return `
          <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4>❌ Certification Expired</h4>
            <p>Your certification has expired. Please contact your manager and begin the recertification process.</p>
            <ul>
              <li>Check recertification requirements</li>
              <li>Schedule recertification exam</li>
              <li>Update your status in CertTracker</li>
            </ul>
          </div>`;
      
      default:
        return '';
    }
  }

  private getUrgencySpecificTextContent(urgencyLevel: string, daysUntilExpiration: number): string {
    switch (urgencyLevel) {
      case 'planning':
        return 'Planning Phase: Start reviewing certification requirements and begin collecting continuing education credits.';
      case 'preparation':
        return 'Preparation Phase: Schedule your renewal exam and gather necessary documentation.';
      case 'action':
        return 'Action Required: Register for your renewal exam and complete outstanding requirements NOW.';
      case 'urgent':
        return `URGENT: Only ${daysUntilExpiration} days remaining! Complete renewal process immediately.`;
      case 'critical':
        return `CRITICAL: Final notice - only ${daysUntilExpiration} days left! Complete renewal TODAY.`;
      case 'expired':
        return 'EXPIRED: Your certification has expired. Contact your manager and begin recertification process.';
      default:
        return 'Please review your certification status and take appropriate action.';
    }
  }

  private getNotificationTypeFromUrgency(urgencyLevel: string): string {
    switch (urgencyLevel) {
      case 'expired':
        return 'EXPIRED_CERT';
      default:
        return 'EXPIRATION_WARNING';
    }
  }

  private async logNotification(data: {
    userEmail: string;
    notificationType: string;
    channel: string;
    delivered: boolean;
    messageContent: string;
  }) {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.userEmail }
      });

      if (user) {
        await prisma.notificationLog.create({
          data: {
            userId: user.id,
            notificationType: data.notificationType as any,
            channel: data.channel as any,
            sentAt: new Date(),
            delivered: data.delivered,
            messageContent: data.messageContent
          }
        });
      }
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

export default new EmailService();