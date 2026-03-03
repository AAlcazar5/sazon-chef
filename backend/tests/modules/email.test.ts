// backend/tests/modules/email.test.ts
// Tests for Group 6: Email service and templates

import { emailService } from '../../src/services/emailService';
import {
  welcomeTemplate,
  passwordResetTemplate,
  emailVerificationTemplate,
} from '../../src/emails/templates';

// Mock Resend — not configured in test env
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}));

describe('Email Service (Group 6)', () => {
  // ─── Template Rendering ──────────────────────────────────────────────

  describe('Templates', () => {
    it('welcomeTemplate should include user name and CTA', () => {
      const html = welcomeTemplate('Alex');
      expect(html).toContain('Alex');
      expect(html).toContain('Welcome');
      expect(html).toContain('Plan Your First Week');
      expect(html).toContain('Sazon Chef');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('passwordResetTemplate should include the reset code', () => {
      const html = passwordResetTemplate('123456');
      expect(html).toContain('123456');
      expect(html).toContain('Reset your password');
      expect(html).toContain('15 minutes');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('emailVerificationTemplate should include the verification URL', () => {
      const url = 'https://sazonchef.com/verify?token=abc123';
      const html = emailVerificationTemplate(url);
      expect(html).toContain(url);
      expect(html).toContain('Verify');
      expect(html).toContain('24 hours');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('templates should produce valid HTML with brand colors', () => {
      const html = welcomeTemplate('Test');
      expect(html).toContain('#FF6B35'); // Brand color
      expect(html).toContain('</html>');
      expect(html).toMatch(/<html.*>/);
    });
  });

  // ─── Email Service ───────────────────────────────────────────────────

  describe('emailService.send', () => {
    it('should log to console when RESEND_API_KEY is not set', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await emailService.send({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      });

      // Should return false (not actually sent)
      expect(result).toBe(false);

      // Should have logged the recipient
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('emailService convenience methods', () => {
    it('sendWelcome should log email to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await emailService.sendWelcome('test@example.com', 'Alex');

      expect(result).toBe(false); // Not sent in test
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com')
      );

      consoleSpy.mockRestore();
    });

    it('sendPasswordReset should log email to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await emailService.sendPasswordReset('test@example.com', '123456');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com')
      );

      consoleSpy.mockRestore();
    });

    it('sendEmailVerification should log email to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await emailService.sendEmailVerification('test@example.com', 'https://example.com/verify');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com')
      );

      consoleSpy.mockRestore();
    });
  });
});
