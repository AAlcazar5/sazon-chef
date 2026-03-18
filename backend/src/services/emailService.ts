// backend/src/services/emailService.ts
// Transactional email delivery via Resend

import { Resend } from 'resend';
import {
  welcomeTemplate,
  passwordResetTemplate,
  emailVerificationTemplate,
  paymentReceiptTemplate,
  trialEndingTemplate,
  subscriptionChangeTemplate,
  paymentFailedTemplate,
  day3NudgeTemplate,
  day14TrialWarningTemplate,
} from '../emails/templates';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'Sazon Chef <noreply@sazonchef.com>';

export const emailService = {
  /**
   * Core send method. Logs to console when RESEND_API_KEY is not configured.
   */
  async send(options: { to: string; subject: string; html: string }): Promise<boolean> {
    if (!resend) {
      console.log(`📧 [Email] (dev mode) To: ${options.to}`);
      console.log(`📧 [Email] Subject: ${options.subject}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 [Email] HTML length: ${options.html.length} chars`);
      }
      return false;
    }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`✅ [Email] Sent "${options.subject}" to ${options.to}`);
      return true;
    } catch (error) {
      console.error(`❌ [Email] Failed to send to ${options.to}:`, error);
      return false;
    }
  },

  // ─── Convenience Methods ────────────────────────────────────────────────────

  async sendWelcome(to: string, userName: string): Promise<boolean> {
    return this.send({
      to,
      subject: 'Welcome to Sazon Chef! 🌶️',
      html: welcomeTemplate(userName),
    });
  },

  async sendPasswordReset(to: string, resetCode: string): Promise<boolean> {
    return this.send({
      to,
      subject: 'Reset your Sazon Chef password',
      html: passwordResetTemplate(resetCode),
    });
  },

  async sendEmailVerification(to: string, verificationUrl: string): Promise<boolean> {
    return this.send({
      to,
      subject: 'Verify your email — Sazon Chef',
      html: emailVerificationTemplate(verificationUrl),
    });
  },

  // ─── Stubs for Group 7 (Stripe) ──────────────────────────────────────────

  async sendPaymentReceipt(to: string, details: { amount: string; date: string }): Promise<boolean> {
    return this.send({
      to,
      subject: 'Your Sazon Chef receipt',
      html: paymentReceiptTemplate(details),
    });
  },

  async sendTrialEnding(to: string, daysLeft: number): Promise<boolean> {
    return this.send({
      to,
      subject: `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      html: trialEndingTemplate(daysLeft),
    });
  },

  async sendSubscriptionChange(to: string, type: 'cancelled' | 'resumed' | 'upgraded'): Promise<boolean> {
    return this.send({
      to,
      subject: `Your Sazon Chef subscription has been ${type}`,
      html: subscriptionChangeTemplate(type),
    });
  },

  async sendPaymentFailed(to: string): Promise<boolean> {
    return this.send({
      to,
      subject: 'Action required: payment failed for Sazon Chef',
      html: paymentFailedTemplate(),
    });
  },

  async sendDay3Nudge(to: string, userName: string): Promise<boolean> {
    return this.send({
      to,
      subject: `${userName}, ready to plan your first week? 🌶️`,
      html: day3NudgeTemplate(userName),
    });
  },

  async sendDay14TrialWarning(to: string, userName: string): Promise<boolean> {
    return this.send({
      to,
      subject: 'Your Sazon Chef trial ends in 3 days',
      html: day14TrialWarningTemplate(userName),
    });
  },
};
