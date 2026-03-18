const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.enabled = false;
    this.init();
  }

  init() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT) || 587,
        secure: SMTP_PORT === '465',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
      this.enabled = true;
      this.from = SMTP_FROM || 'noreply@exam-system.com';
      logger.info('Email service initialized');
    } else {
      logger.warn('Email service not configured. Set SMTP_* environment variables to enable.');
    }
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text = null) {
    if (!this.enabled) {
      logger.debug(`Email not sent (service disabled): ${to} - ${subject}`);
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      });

      logger.info(`Email sent to ${to}: ${subject} (${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send exam scheduled notification
   */
  async sendExamScheduled(studentEmail, studentName, examDetails) {
    const subject = `📝 Upcoming Exam: ${examDetails.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${examDetails.title}</h2>
        <p>Hello ${studentName || 'Student'},</p>
        <p>A new exam has been scheduled for you.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Exam Details</h3>
          <p><strong>Subject:</strong> ${examDetails.subject || 'N/A'}</p>
          <p><strong>Duration:</strong> ${examDetails.duration_minutes} minutes</p>
          <p><strong>Total Marks:</strong> ${examDetails.total_marks}</p>
          <p><strong>Start Time:</strong> ${examDetails.scheduled_start ? new Date(examDetails.scheduled_start).toLocaleString() : 'Immediately'}</p>
          <p><strong>End Time:</strong> ${examDetails.scheduled_end ? new Date(examDetails.scheduled_end).toLocaleString() : 'Not specified'}</p>
        </div>
        
        <p>Please make sure to:</p>
        <ul>
          <li>Be available at least 5 minutes before the exam starts</li>
          <li>Have a stable internet connection</li>
          <li>Use a device with a good battery backup or connected to power</li>
          <li>Find a quiet environment for the exam</li>
        </ul>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated message from the Proctored Exam System.
        </p>
      </div>
    `;

    return this.sendEmail(studentEmail, subject, html);
  }

  /**
   * Send exam reminder (1 hour before)
   */
  async sendExamReminder(studentEmail, studentName, examDetails) {
    const subject = `⏰ Reminder: ${examDetails.title} starts in 1 hour`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⏰ Exam Reminder</h2>
        <p>Hello ${studentName || 'Student'},</p>
        <p>This is a friendly reminder that your exam starts in approximately 1 hour.</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">${examDetails.title}</h3>
          <p><strong>Start Time:</strong> ${new Date(examDetails.scheduled_start).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${examDetails.duration_minutes} minutes</p>
        </div>
        
        <p style="color: #dc2626; font-weight: bold;">
          Please be ready and logged in at least 5 minutes before the exam starts.
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated message from the Proctored Exam System.
        </p>
      </div>
    `;

    return this.sendEmail(studentEmail, subject, html);
  }

  /**
   * Send exam result notification
   */
  async sendExamResult(studentEmail, studentName, examDetails, result) {
    const percentage = (result.score / result.total_marks) * 100;
    const passed = percentage >= (examDetails.passing_percentage || 40);
    
    const subject = `📊 Exam Result: ${examDetails.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${passed ? '#16a34a' : '#dc2626'};">
          ${passed ? '🎉 Congratulations!' : '📚 Keep Practicing!'}
        </h2>
        <p>Hello ${studentName || 'Student'},</p>
        <p>Your exam has been evaluated. Here are your results:</p>
        
        <div style="background: ${passed ? '#f0fdf4' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid ${passed ? '#16a34a' : '#dc2626'};">
          <h3 style="margin-top: 0; color: ${passed ? '#16a34a' : '#dc2626'};">${examDetails.title}</h3>
          
          <div style="text-align: center; margin: 20px 0;">
            <div style="font-size: 48px; font-weight: bold; color: ${passed ? '#16a34a' : '#dc2626'};">
              ${percentage.toFixed(1)}%
            </div>
            <div style="color: #6b7280;">${passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}</div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
            <div style="background: white; padding: 10px; border-radius: 4px;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${result.correct_count}</div>
              <div style="font-size: 12px; color: #6b7280;">Correct</div>
            </div>
            <div style="background: white; padding: 10px; border-radius: 4px;">
              <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${result.incorrect_count}</div>
              <div style="font-size: 12px; color: #6b7280;">Incorrect</div>
            </div>
            <div style="background: white; padding: 10px; border-radius: 4px;">
              <div style="font-size: 24px; font-weight: bold; color: #6b7280;">${result.unattempted_count}</div>
              <div style="font-size: 12px; color: #6b7280;">Unattempted</div>
            </div>
          </div>
          
          <p style="margin-top: 20px;"><strong>Score:</strong> ${result.score}/${result.total_marks}</p>
          <p><strong>Time Taken:</strong> ${this.formatDuration(result.duration_taken)}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          You can review your answers and detailed solutions by logging into the exam portal.
        </p>
      </div>
    `;

    return this.sendEmail(studentEmail, subject, html);
  }

  /**
   * Format duration in seconds to readable string
   */
  formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }
}

module.exports = new EmailService();
