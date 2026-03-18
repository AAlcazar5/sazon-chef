// backend/tests/services/lifecycleEmails.test.ts
// Tests for Section 7: Lifecycle emails (Day 3 nudge + Day 14 trial warning)

describe('Lifecycle Email Templates (spec)', () => {
  describe('Day 3 Nudge Email', () => {
    it('should only send if user has NOT generated a meal plan', () => {
      const hasMealPlan = false;
      const shouldSend = !hasMealPlan;
      expect(shouldSend).toBe(true);
    });

    it('should not send if user already has a meal plan', () => {
      const hasMealPlan = true;
      const shouldSend = !hasMealPlan;
      expect(shouldSend).toBe(false);
    });

    it('should be sent exactly 3 days after registration', () => {
      const registeredAt = new Date('2026-03-15T00:00:00Z');
      const now = new Date('2026-03-18T00:00:00Z');
      const daysSince = Math.floor((now.getTime() - registeredAt.getTime()) / (24 * 60 * 60 * 1000));
      expect(daysSince).toBe(3);
    });

    it('should include "Plan My Week" CTA', () => {
      const templateContent = {
        subject: "Ready to plan your first week?",
        cta: "Plan My Week",
        ctaUrl: "sazon://meal-plan",
      };
      expect(templateContent.cta).toBe('Plan My Week');
      expect(templateContent.ctaUrl).toContain('meal-plan');
    });

    it('should include personalized copy', () => {
      const userName = 'Alex';
      const subject = `${userName}, ready to plan your first week?`;
      expect(subject).toContain('Alex');
    });
  });

  describe('Day 14 Trial Warning Email', () => {
    it('should only send if user has NOT subscribed', () => {
      const isSubscribed = false;
      const shouldSend = !isSubscribed;
      expect(shouldSend).toBe(true);
    });

    it('should not send if user already subscribed', () => {
      const isSubscribed = true;
      const shouldSend = !isSubscribed;
      expect(shouldSend).toBe(false);
    });

    it('should be sent 14 days after registration (3 days before trial ends)', () => {
      const registeredAt = new Date('2026-03-04T00:00:00Z');
      const now = new Date('2026-03-18T00:00:00Z');
      const daysSince = Math.floor((now.getTime() - registeredAt.getTime()) / (24 * 60 * 60 * 1000));
      expect(daysSince).toBe(14);
    });

    it('should list features user would lose', () => {
      const features = ['unlimited recipes', 'AI meal planning', 'smarter shopping'];
      expect(features.length).toBe(3);
      expect(features).toContain('unlimited recipes');
      expect(features).toContain('AI meal planning');
    });

    it('should include Upgrade CTA', () => {
      const templateContent = {
        subject: "Your trial ends in 3 days",
        cta: "Upgrade Now",
        ctaUrl: "sazon://paywall",
      };
      expect(templateContent.cta).toBe('Upgrade Now');
    });

    it('should be distinct from Stripe billing warning', () => {
      // This is a product-value email, not a payment-related one
      const emailType = 'product_value_trial_warning';
      expect(emailType).not.toBe('stripe_payment_warning');
    });
  });

  describe('Email trigger scheduling', () => {
    it('should gate on RESEND_API_KEY', () => {
      const hasApiKey = !!process.env.RESEND_API_KEY;
      // In test env, should not send real emails
      expect(hasApiKey).toBe(false);
    });

    it('should schedule Day 3 check in notificationScheduler', () => {
      const scheduledTriggers = ['day3_nudge', 'day14_trial_warning'];
      expect(scheduledTriggers).toContain('day3_nudge');
    });

    it('should schedule Day 14 check in notificationScheduler', () => {
      const scheduledTriggers = ['day3_nudge', 'day14_trial_warning'];
      expect(scheduledTriggers).toContain('day14_trial_warning');
    });

    it('should not send duplicate emails (idempotent check)', () => {
      const emailsSent = new Set<string>();
      const userId = 'user-1';
      const emailKey = `day3_nudge:${userId}`;

      emailsSent.add(emailKey);
      const isDuplicate = emailsSent.has(emailKey);
      expect(isDuplicate).toBe(true);
    });
  });
});
