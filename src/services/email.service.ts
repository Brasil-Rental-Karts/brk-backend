import * as SibApiV3Sdk from 'sib-api-v3-sdk';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config/config';

export class EmailService {
  private apiInstance: SibApiV3Sdk.TransactionalEmailsApi;
  private readonly emailTemplates = {
    passwordReset: path.resolve(process.cwd(), 'src', 'templates', 'email', 'password-reset.html'),
    emailConfirmation: path.resolve(process.cwd(), 'src', 'templates', 'email', 'email-confirmation.html')
  };

  constructor() {
    try {
      console.log('Initializing Brevo email service with API key:', config.brevo.apiKey ? 'API key provided' : 'No API key provided');
      console.log('Email template path:', this.emailTemplates.passwordReset);
      
      // Configure API key authorization
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      const apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = config.brevo.apiKey;
      
      // Create an instance of the API
      this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      
      console.log('Brevo email service initialized successfully');
    } catch (error) {
      console.error('Error initializing Brevo email service:', error);
      throw new Error('Failed to initialize email service');
    }
  }

  /**
   * Send a reset password email to the user
   * 
   * @param email Recipient email
   * @param name Recipient name
   * @param resetToken Reset password token
   */
  public async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
    try {
      console.log(`Preparing to send reset password email to ${email}`);
      
      // Create the reset password URL with the token
      const resetUrl = `${config.frontendUrl}${config.passwordResetPath}?token=${resetToken}`;
      console.log('Reset URL generated:', resetUrl);
      
      // Load and prepare email template
      let emailTemplate = this.getEmailTemplate(this.emailTemplates.passwordReset);
      
      // Replace template variables
      emailTemplate = emailTemplate
        .replace(/{{nome}}/g, name)
        .replace(/{{resetLink}}/g, resetUrl)
        .replace(/{{ano}}/g, new Date().getFullYear().toString());
      
      // Send the email
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      
      sendSmtpEmail.subject = 'Recuperação de Senha';
      sendSmtpEmail.htmlContent = emailTemplate;
      
      sendSmtpEmail.sender = {
        name: config.brevo.senderName,
        email: config.brevo.senderEmail
      };
      
      sendSmtpEmail.to = [{ name, email }];
      
      console.log('Email configuration prepared, attempting to send email via Brevo API');
      
      // In development mode, just log the email details instead of sending if no API key
      if (!config.brevo.apiKey || config.brevo.apiKey === 'your-brevo-api-key') {
        console.log('DEVELOPMENT MODE: Email would be sent with the following details:');
        console.log('To:', email);
        console.log('Subject:', sendSmtpEmail.subject);
        console.log('Reset URL:', resetUrl);
        console.log('WARNING: No valid Brevo API key provided. Email not actually sent.');
        return;
      }
      
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Reset password email sent successfully to', email);
      
    } catch (error) {
      console.error('Error sending password reset email:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw new Error('Failed to send password reset email');
    }
  }
  
  /**
   * Get and read an email template file
   * 
   * @param templatePath Path to the email template file
   * @returns The template content as string
   */
  private getEmailTemplate(templatePath: string): string {
    try {
      if (!fs.existsSync(templatePath)) {
        console.error(`Template file not found: ${templatePath}`);
        throw new Error('Email template not found');
      }
      
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error('Error reading email template:', error);
      throw new Error('Failed to read email template');
    }
  }

  /**
   * Send an email confirmation email to the user
   * 
   * @param email Recipient email
   * @param name Recipient name
   * @param confirmationToken Email confirmation token
   */
  public async sendEmailConfirmationEmail(email: string, name: string, confirmationToken: string): Promise<void> {
    try {
      console.log(`Preparing to send email confirmation to ${email}`);
      const confirmUrl = `${config.frontendUrl}${config.emailConfirmationPath}?token=${confirmationToken}`;
      console.log('Confirmation URL generated:', confirmUrl);
      let emailTemplate = this.getEmailTemplate(this.emailTemplates.emailConfirmation);
      emailTemplate = emailTemplate
        .replace(/{{nome}}/g, name)
        .replace(/{{confirmLink}}/g, confirmUrl)
        .replace(/{{ano}}/g, new Date().getFullYear().toString());
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = 'Confirmação de E-mail';
      sendSmtpEmail.htmlContent = emailTemplate;
      sendSmtpEmail.sender = {
        name: config.brevo.senderName,
        email: config.brevo.senderEmail
      };
      sendSmtpEmail.to = [{ name, email }];
      if (!config.brevo.apiKey || config.brevo.apiKey === 'your-brevo-api-key') {
        console.log('DEVELOPMENT MODE: Email would be sent with the following details:');
        console.log('To:', email);
        console.log('Subject:', sendSmtpEmail.subject);
        console.log('Confirmation URL:', confirmUrl);
        console.log('WARNING: No valid Brevo API key provided. Email not actually sent.');
        return;
      }
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Email confirmation sent successfully to', email);
    } catch (error) {
      console.error('Error sending email confirmation:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw new Error('Failed to send email confirmation');
    }
  }
} 