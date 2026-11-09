import nodemailer from 'nodemailer';
import axios from 'axios';
import { renderMunicipalityEmailContent } from './templates/municipalityEmailTemplate.js';
import { sendMockNotification } from './mockProvider.js';

/**
 * Creates and returns a verified Nodemailer transporter based on environment configuration.
 * - Auto-detects Gmail (using service: 'gmail') and strips whitespace from App Passwords.
 * - Supports custom SMTP servers (SendGrid, Mailgun, AWS SES, Postmark, cPanel, etc.).
 * - Sets connection timeouts and permissive TLS to avoid self-signed handshake errors in cloud hosts.
 */
export const createMailTransporter = () => {
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
  const rawPass = process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.trim() : '';
  // Gmail app passwords are often copied with spaces like "xxxx yyyy zzzz wwww" - strip spaces
  const smtpPassword = rawPass.replace(/\s+/g, '');

  const isGmail = smtpHost.toLowerCase().includes('gmail.com') || (process.env.SMTP_SERVICE || '').toLowerCase() === 'gmail';

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: parseInt(process.env.NOTIFICATION_PROVIDER_TIMEOUT_MS || '15000', 10),
    });
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: parseInt(process.env.NOTIFICATION_PROVIDER_TIMEOUT_MS || '15000', 10),
  });
};

/**
 * Determines whether email dispatch should operate in MOCK or SMTP/API mode.
 * Auto-detects: if valid SMTP or Brevo credentials exist in environment, defaults to REAL email dispatch.
 */
export const isMockEmailMode = () => {
  const deliveryMode = (process.env.NOTIFICATION_DELIVERY_MODE || '').toLowerCase().trim();
  const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
  const smtpPassword = process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.trim() : '';
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();

  // Explicit MOCK requested
  if (deliveryMode === 'mock') {
    return true;
  }

  // If Brevo HTTPS API key is present, always use real email mode (Render compatible)
  if (brevoApiKey && brevoApiKey.startsWith('xkeysib-')) {
    return false;
  }

  // Explicit SMTP / REAL requested
  if (deliveryMode === 'smtp' || deliveryMode === 'real') {
    return false;
  }

  // Auto-detect: If credentials are provided and not dummy placeholders, use real email
  const hasValidCreds = Boolean(
    smtpUser &&
    smtpPassword &&
    smtpPassword !== 'your_smtp_password' &&
    !smtpUser.endsWith('.local')
  );

  return !hasValidCreds;
};

/**
 * Resolves the appropriate From email address.
 * If sending through Gmail, the From address MUST match the authenticated Gmail user to prevent rejection.
 */
export const resolveFromEmail = () => {
  const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
  const configuredFrom = (process.env.NOTIFICATION_FROM_EMAIL || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').toLowerCase();

  if (smtpHost.includes('gmail.com') || (process.env.SMTP_SERVICE || '').toLowerCase() === 'gmail') {
    return smtpUser || configuredFrom || 'mukeshprabhu2004@gmail.com';
  }

  if (configuredFrom && !configuredFrom.endsWith('.local')) {
    return configuredFrom;
  }

  return smtpUser || 'mukeshprabhu2004@gmail.com';
};

/**
 * Sends transactional email via Brevo REST API over HTTPS (Port 443).
 * Render never blocks Port 443, eliminating all SMTP timeout issues.
 */
export const sendViaBrevoIfAvailable = async ({ to, toName, subject, htmlContent, textContent }) => {
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (!brevoApiKey || !brevoApiKey.startsWith('xkeysib-')) {
    return null; // Brevo not configured, fall through to SMTP
  }

  const senderEmail = resolveFromEmail();
  const senderName = process.env.NOTIFICATION_FROM_NAME || 'FixMyRoad System';

  try {
    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: to,
          name: toName || to.split('@')[0],
        },
      ],
      subject,
      htmlContent,
      textContent,
    };

    const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      timeout: 10000,
    });

    console.log(`✅ [EMAIL DISPATCH: BREVO HTTPS SUCCESS] Delivered email to ${to}. MessageId: ${response.data?.messageId}`);

    return {
      success: true,
      provider: 'BREVO_HTTPS',
      providerMessageId: response.data?.messageId || `BREVO-${Date.now()}`,
      deliveredAt: new Date(),
    };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.error(`❌ [EMAIL DISPATCH: BREVO ERROR] Failed to send email via Brevo:`, errMsg);
    return {
      success: false,
      provider: 'BREVO_FAILED',
      error: errMsg,
    };
  }
};

/**
 * Sends an email notification to a municipal authority or administrator.
 */
export const sendEmailNotification = async ({ recipient, payload }) => {
  if (isMockEmailMode()) {
    console.log(`[EMAIL DISPATCH: MOCK MODE] Municipal notification sent to mock provider: ${recipient}`);
    return await sendMockNotification({ channel: 'EMAIL', recipient, payload });
  }

  const { subject, html, text } = renderMunicipalityEmailContent(payload);

  // 1. Try Brevo HTTPS API first (fast, reliable on cloud hosts like Render)
  const brevoResult = await sendViaBrevoIfAvailable({
    to: recipient,
    subject,
    htmlContent: html,
    textContent: text,
  });

  if (brevoResult && brevoResult.success) {
    return brevoResult;
  }

  // 2. Fall back to standard SMTP if Brevo was not configured
  try {
    const transporter = createMailTransporter();
    const fromEmail = resolveFromEmail();
    const fromName = process.env.NOTIFICATION_FROM_NAME || 'FixMyRoad';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL DISPATCH: SMTP SUCCESS] Delivered notification to ${recipient}. MsgId: ${info.messageId}`);

    return {
      success: true,
      provider: 'SMTP',
      providerMessageId: info.messageId || `SMTP-${Date.now()}`,
      deliveredAt: new Date(),
    };
  } catch (err) {
    console.error(`❌ [EMAIL DISPATCH: SMTP ERROR] Failed to send email to ${recipient}:`, err.message);
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
    return await sendMockNotification({ channel: 'EMAIL', recipient, payload });
  }
};

/**
 * Sends a 6-digit OTP email to any citizen recipient for account registration verification
 */
export const sendOTPEmail = async ({ recipient, otp, name }) => {
  const subject = '🔒 FixMyRoad - Your 6-Digit Email Verification Code';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e5e5e0; padding: 32px 24px; border-radius: 8px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #111827; letter-spacing: 3px; text-transform: uppercase; margin: 0; font-size: 22px;">FIXMYROAD</h2>
        <p style="color: #6b7280; font-size: 13px; margin-top: 4px; letter-spacing: 1px;">CIVIC INFRASTRUCTURE ENGINE</p>
      </div>
      <div style="border-top: 1px solid #e5e5e0; padding-top: 24px;">
        <p style="color: #374151; font-size: 15px; margin-bottom: 12px;">Hello ${name || 'Citizen'},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Thank you for creating an account on FixMyRoad. Please enter the following 6-digit One-Time Password (OTP) to verify your email address and activate your account:
        </p>
        <div style="background-color: #f9f8f6; border: 2px dashed #d1d5db; padding: 20px; text-align: center; margin: 24px 0; border-radius: 8px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 12px; text-align: center; line-height: 1.5;">
          ⏱️ This verification code is valid for <strong>10 minutes</strong>.<br />
          If you did not request this registration, please safely disregard this email.
        </p>
      </div>
      <div style="border-top: 1px solid #e5e5e0; margin-top: 28px; padding-top: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">FixMyRoad Platform • Automated Notification Service</p>
      </div>
    </div>
  `;
  const text = `FixMyRoad Email Verification Code: ${otp}. Valid for 10 minutes.`;

  console.log(`\n==================================================`);
  console.log(`📩 CITIZEN EMAIL VERIFICATION OTP`);
  console.log(`To: ${recipient}`);
  console.log(`OTP Code: ${otp} (Valid for 10 minutes)`);
  console.log(`==================================================\n`);

  if (isMockEmailMode()) {
    console.log(`[EMAIL DISPATCH: MOCK MODE] Code logged to terminal for development/testing.`);
    return { success: true, provider: 'MOCK', mock: true };
  }

  // 1. Try Brevo HTTPS API first (fast, reliable on Render cloud)
  const brevoResult = await sendViaBrevoIfAvailable({
    to: recipient,
    toName: name,
    subject,
    htmlContent: html,
    textContent: text,
  });

  if (brevoResult && brevoResult.success) {
    return brevoResult;
  }

  // 2. Fall back to standard SMTP if Brevo is not configured or failed
  try {
    const transporter = createMailTransporter();
    const fromEmail = resolveFromEmail();
    const fromName = process.env.NOTIFICATION_FROM_NAME || 'FixMyRoad System';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL DISPATCH: SMTP SUCCESS] Delivered OTP email to ${recipient}. MessageId: ${info.messageId}`);
    return {
      success: true,
      provider: 'SMTP',
      providerMessageId: info.messageId,
    };
  } catch (err) {
    console.error(`❌ [EMAIL DISPATCH: SMTP ERROR] Failed to send OTP email to ${recipient}:`, err.message);
    return { 
      success: false, 
      provider: brevoResult?.provider || 'SMTP_FAILED', 
      error: brevoResult?.error || err.message,
      code: err.code 
    };
  }
};

/**
 * Sends a 6-digit Password Reset OTP email
 */
export const sendPasswordResetEmail = async ({ recipient, otp, name }) => {
  const subject = '🔑 FixMyRoad - Password Reset Request';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e5e5e0; padding: 32px 24px; border-radius: 8px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #111827; letter-spacing: 3px; text-transform: uppercase; margin: 0; font-size: 22px;">FIXMYROAD</h2>
        <p style="color: #6b7280; font-size: 13px; margin-top: 4px; letter-spacing: 1px;">ACCOUNT SECURITY</p>
      </div>
      <div style="border-top: 1px solid #e5e5e0; padding-top: 24px;">
        <p style="color: #374151; font-size: 15px; margin-bottom: 12px;">Hello ${name || 'User'},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          We received a request to reset the password for your FixMyRoad account. Use the following 6-digit verification code to set up a new password:
        </p>
        <div style="background-color: #fef2f2; border: 2px dashed #fca5a5; padding: 20px; text-align: center; margin: 24px 0; border-radius: 8px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #dc2626;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 12px; text-align: center; line-height: 1.5;">
          ⏱️ This code expires in <strong>10 minutes</strong>.<br />
          If you did not request a password reset, you can safely ignore this email — your account remains completely secure.
        </p>
      </div>
      <div style="border-top: 1px solid #e5e5e0; margin-top: 28px; padding-top: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">FixMyRoad Platform • Security Notification</p>
      </div>
    </div>
  `;
  const text = `FixMyRoad Password Reset Code: ${otp}. Valid for 10 minutes. If you did not request this, please ignore this email.`;

  console.log(`\n==================================================`);
  console.log(`🔑 PASSWORD RESET OTP`);
  console.log(`To: ${recipient}`);
  console.log(`OTP Code: ${otp} (Valid for 10 minutes)`);
  console.log(`==================================================\n`);

  if (isMockEmailMode()) {
    console.log(`[EMAIL DISPATCH: MOCK MODE] Password reset code logged to terminal for development/testing.`);
    return { success: true, provider: 'MOCK', mock: true };
  }

  // 1. Try Brevo HTTPS API first (fast, reliable on cloud hosts)
  const brevoResult = await sendViaBrevoIfAvailable({
    to: recipient,
    toName: name,
    subject,
    htmlContent: html,
    textContent: text,
  });

  if (brevoResult && brevoResult.success) {
    return brevoResult;
  }

  // 2. Fall back to standard SMTP if Brevo is not configured or failed
  try {
    const transporter = createMailTransporter();
    const fromEmail = resolveFromEmail();
    const fromName = process.env.NOTIFICATION_FROM_NAME || 'FixMyRoad Security';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL DISPATCH: SMTP SUCCESS] Delivered password reset email to ${recipient}. MessageId: ${info.messageId}`);
    return {
      success: true,
      provider: 'SMTP',
      providerMessageId: info.messageId,
    };
  } catch (err) {
    console.error(`❌ [EMAIL DISPATCH: SMTP ERROR] Failed to send password reset email to ${recipient}:`, err.message);
    return { 
      success: false, 
      provider: brevoResult?.provider || 'SMTP_FAILED', 
      error: brevoResult?.error || err.message,
      code: err.code 
    };
  }
};
