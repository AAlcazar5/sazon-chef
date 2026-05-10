// backend/tests/services/emailService.test.ts
//
// Tier L M23 — emailService coverage. The service is a thin Resend wrapper
// with 8 convenience methods (welcome / password reset / verification /
// receipt / trial-ending / subscription-change / payment-failed /
// day3-nudge / day14-trial-warning). We assert:
//   - dev-mode (no RESEND_API_KEY) returns false instead of throwing
//   - configured-mode (with API key) calls resend.emails.send with the
//     right `from` / `to` / `subject` shape
//   - each convenience method picks the right subject + template
//   - send failures return false (caller .catch chains can no-op)

const mockResendSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

jest.mock('../../src/emails/templates', () => ({
  welcomeTemplate: (name: string) => `<welcome>${name}</welcome>`,
  passwordResetTemplate: (code: string) => `<reset>${code}</reset>`,
  emailVerificationTemplate: (url: string) => `<verify>${url}</verify>`,
  paymentReceiptTemplate: (d: { amount: string; date: string }) =>
    `<receipt>${d.amount}@${d.date}</receipt>`,
  trialEndingTemplate: (n: number) => `<trial-${n}>`,
  subscriptionChangeTemplate: (t: string) => `<sub-${t}>`,
  paymentFailedTemplate: () => `<payment-failed>`,
  day3NudgeTemplate: (n: string) => `<day3-${n}>`,
  day14TrialWarningTemplate: (n: string) => `<day14-${n}>`,
}));

describe('emailService', () => {
  const originalKey = process.env.RESEND_API_KEY;

  afterAll(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  describe('dev mode (no RESEND_API_KEY)', () => {
    let emailService: typeof import('../../src/services/emailService').emailService;

    beforeEach(() => {
      jest.resetModules();
      delete process.env.RESEND_API_KEY;
      mockResendSend.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      emailService = require('../../src/services/emailService').emailService;
    });

    it('returns false (signals "did not actually send") instead of throwing', async () => {
      const ok = await emailService.send({ to: 'a@b.c', subject: 'x', html: '<p>y</p>' });
      expect(ok).toBe(false);
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it('every convenience method follows the dev-mode contract (no throw, returns false)', async () => {
      expect(await emailService.sendWelcome('a@b.c', 'Alex')).toBe(false);
      expect(await emailService.sendPasswordReset('a@b.c', '123456')).toBe(false);
      expect(await emailService.sendEmailVerification('a@b.c', 'https://x')).toBe(false);
      expect(await emailService.sendPaymentReceipt('a@b.c', { amount: '$9', date: '2026-05-09' })).toBe(false);
      expect(await emailService.sendTrialEnding('a@b.c', 3)).toBe(false);
      expect(await emailService.sendSubscriptionChange('a@b.c', 'cancelled')).toBe(false);
      expect(await emailService.sendPaymentFailed('a@b.c')).toBe(false);
      expect(await emailService.sendDay3Nudge('a@b.c', 'Alex')).toBe(false);
      expect(await emailService.sendDay14TrialWarning('a@b.c', 'Alex')).toBe(false);
    });
  });

  describe('configured mode (with RESEND_API_KEY)', () => {
    let emailService: typeof import('../../src/services/emailService').emailService;

    beforeEach(() => {
      jest.resetModules();
      process.env.RESEND_API_KEY = 're_test_key';
      mockResendSend.mockReset();
      mockResendSend.mockResolvedValue({ id: 'sent-id' });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      emailService = require('../../src/services/emailService').emailService;
    });

    it('send() calls resend.emails.send with from / to / subject / html', async () => {
      const ok = await emailService.send({ to: 'a@b.c', subject: 'Hi', html: '<p>body</p>' });
      expect(ok).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(String),
          to: 'a@b.c',
          subject: 'Hi',
          html: '<p>body</p>',
        }),
      );
    });

    it('send() returns false on Resend error (caller .catch can no-op)', async () => {
      mockResendSend.mockRejectedValueOnce(new Error('API limit'));
      const ok = await emailService.send({ to: 'a@b.c', subject: 'x', html: '<p>y</p>' });
      expect(ok).toBe(false);
    });

    it('sendWelcome uses the welcome template + branded subject', async () => {
      await emailService.sendWelcome('a@b.c', 'Alex');
      const call = mockResendSend.mock.calls[0][0];
      expect(call.subject).toContain('Welcome to Sazon Chef');
      expect(call.html).toBe('<welcome>Alex</welcome>');
    });

    it('sendPasswordReset uses the reset template with the code', async () => {
      await emailService.sendPasswordReset('a@b.c', '123456');
      expect(mockResendSend.mock.calls[0][0].html).toBe('<reset>123456</reset>');
    });

    it('sendEmailVerification uses the verify template with the URL', async () => {
      await emailService.sendEmailVerification('a@b.c', 'https://verify.test/abc');
      expect(mockResendSend.mock.calls[0][0].html).toBe('<verify>https://verify.test/abc</verify>');
    });

    it('sendTrialEnding pluralizes days correctly (1 day vs N days)', async () => {
      await emailService.sendTrialEnding('a@b.c', 1);
      expect(mockResendSend.mock.calls[0][0].subject).toBe('Your free trial ends in 1 day');
      mockResendSend.mockClear();
      await emailService.sendTrialEnding('a@b.c', 5);
      expect(mockResendSend.mock.calls[0][0].subject).toBe('Your free trial ends in 5 days');
    });

    it('sendSubscriptionChange threads the type into the subject + template', async () => {
      await emailService.sendSubscriptionChange('a@b.c', 'cancelled');
      const call = mockResendSend.mock.calls[0][0];
      expect(call.subject).toContain('cancelled');
      expect(call.html).toBe('<sub-cancelled>');
    });

    it('sendPaymentFailed uses the action-required subject', async () => {
      await emailService.sendPaymentFailed('a@b.c');
      expect(mockResendSend.mock.calls[0][0].subject).toContain('Action required');
    });

    it('sendDay3Nudge + sendDay14TrialWarning thread userName', async () => {
      await emailService.sendDay3Nudge('a@b.c', 'Alex');
      expect(mockResendSend.mock.calls[0][0].subject).toContain('Alex');
      mockResendSend.mockClear();
      await emailService.sendDay14TrialWarning('a@b.c', 'Alex');
      expect(mockResendSend.mock.calls[0][0].html).toBe('<day14-Alex>');
    });
  });
});
