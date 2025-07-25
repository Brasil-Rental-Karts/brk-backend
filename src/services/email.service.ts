import * as fs from 'fs';
import * as path from 'path';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

import config from '../config/config';

export class EmailService {
  private apiInstance: SibApiV3Sdk.TransactionalEmailsApi;
  private readonly emailTemplates = {
    passwordReset: path.resolve(
      process.cwd(),
      'src',
      'templates',
      'email',
      'password-reset.html'
    ),
    emailConfirmation: path.resolve(
      process.cwd(),
      'src',
      'templates',
      'email',
      'email-confirmation.html'
    ),
  };

  constructor() {
    try {
      // Configure API key authorization
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      const apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = config.brevo.apiKey;

      // Create an instance of the API
      this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    } catch (error) {
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
  public async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<void> {
    try {
      const resetUrl = `${config.frontendUrl}${config.passwordResetPath}?token=${resetToken}`;

      // If no valid API key in development, just return
      if (
        !config.brevo.apiKey ||
        config.brevo.apiKey === 'your-brevo-api-key-here'
      ) {
        return;
      }

      let emailTemplate = this.getEmailTemplate(
        this.emailTemplates.passwordReset
      );
      emailTemplate = emailTemplate
        .replace(/{{nome}}/g, name)
        .replace(/{{resetLink}}/g, resetUrl)
        .replace(/{{ano}}/g, new Date().getFullYear().toString());

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = 'Redefinição de Senha';
      sendSmtpEmail.htmlContent = emailTemplate;
      sendSmtpEmail.sender = {
        name: config.brevo.senderName,
        email: config.brevo.senderEmail,
      };
      sendSmtpEmail.to = [{ name, email }];

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      // In development mode with invalid API key, don't throw error
      if (
        config.nodeEnv === 'development' &&
        (!config.brevo.apiKey ||
          config.brevo.apiKey === 'your-brevo-api-key-here')
      ) {
        return;
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
        throw new Error('Email template not found');
      }

      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
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
  public async sendEmailConfirmationEmail(
    email: string,
    name: string,
    confirmationToken: string
  ): Promise<void> {
    try {
      const confirmUrl = `${config.frontendUrl}${config.emailConfirmationPath}?token=${confirmationToken}`;

      // If no valid API key in development, just return
      if (
        !config.brevo.apiKey ||
        config.brevo.apiKey === 'your-brevo-api-key-here'
      ) {
        return;
      }

      let emailTemplate = this.getEmailTemplate(
        this.emailTemplates.emailConfirmation
      );
      emailTemplate = emailTemplate
        .replace(/{{nome}}/g, name)
        .replace(/{{confirmLink}}/g, confirmUrl)
        .replace(/{{ano}}/g, new Date().getFullYear().toString());

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = 'Confirmação de E-mail';
      sendSmtpEmail.htmlContent = emailTemplate;
      sendSmtpEmail.sender = {
        name: config.brevo.senderName,
        email: config.brevo.senderEmail,
      };
      sendSmtpEmail.to = [{ name, email }];

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      // In development mode with invalid API key, don't throw error
      if (
        config.nodeEnv === 'development' &&
        (!config.brevo.apiKey ||
          config.brevo.apiKey === 'your-brevo-api-key-here')
      ) {
        return;
      }

      throw new Error('Failed to send email confirmation');
    }
  }
}
