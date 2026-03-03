// backend/src/emails/templates.ts
// Sazon-branded HTML email templates

const BRAND_COLOR = '#FF6B35';
const BRAND_NAME = 'Sazon Chef';
const TEXT_COLOR = '#333333';
const MUTED_COLOR = '#666666';

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:24px 32px;text-align:center;">
              <span style="font-size:28px;">🌶️</span>
              <span style="color:#ffffff;font-size:22px;font-weight:700;vertical-align:middle;margin-left:8px;">${BRAND_NAME}</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:${MUTED_COLOR};">
                ${BRAND_NAME} &mdash; Your AI-powered kitchen companion
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
      <td style="background-color:${BRAND_COLOR};border-radius:8px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">${text}</a>
      </td>
    </tr>
  </table>`;
}

// ─── Templates ──────────────────────────────────────────────────────────────

export function welcomeTemplate(userName: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 16px;font-size:24px;color:${TEXT_COLOR};">Welcome to ${BRAND_NAME}, ${userName}! 🎉</h1>
    <p style="margin:0 0 16px;font-size:16px;color:${TEXT_COLOR};line-height:1.5;">
      Sazon is your AI-powered kitchen companion. We help you discover recipes you'll love,
      plan your meals effortlessly, and make grocery shopping a breeze.
    </p>
    <p style="margin:0 0 8px;font-size:16px;color:${TEXT_COLOR};line-height:1.5;">
      Here's how to get started:
    </p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;color:${TEXT_COLOR};line-height:1.8;">
      <li>Set your dietary preferences and goals</li>
      <li>Let Sazon plan your first week of meals</li>
      <li>Generate a shopping list with one tap</li>
    </ul>
    ${button('Plan Your First Week →', 'sazonchef://meal-plan')}
    <p style="margin:16px 0 0;font-size:14px;color:${MUTED_COLOR};text-align:center;">
      Happy cooking! 🍳
    </p>
  `);
}

export function passwordResetTemplate(resetCode: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 16px;font-size:24px;color:${TEXT_COLOR};">Reset your password</h1>
    <p style="margin:0 0 24px;font-size:16px;color:${TEXT_COLOR};line-height:1.5;">
      Use the code below to reset your password. This code expires in 15 minutes.
    </p>
    <div style="background-color:#f8f8f8;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
      <span style="font-size:36px;font-weight:700;letter-spacing:6px;color:${BRAND_COLOR};">${resetCode}</span>
    </div>
    <p style="margin:0;font-size:14px;color:${MUTED_COLOR};line-height:1.5;">
      If you didn't request this, you can safely ignore this email. Your password won't change.
    </p>
  `);
}

export function emailVerificationTemplate(verificationUrl: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 16px;font-size:24px;color:${TEXT_COLOR};">Verify your email</h1>
    <p style="margin:0 0 8px;font-size:16px;color:${TEXT_COLOR};line-height:1.5;">
      Tap the button below to verify your email address and unlock all features.
    </p>
    ${button('Verify Email', verificationUrl)}
    <p style="margin:0;font-size:14px;color:${MUTED_COLOR};line-height:1.5;">
      This link expires in 24 hours. If you didn't create an account, ignore this email.
    </p>
  `);
}

// ─── Stubs for Group 7 (Stripe) ─────────────────────────────────────────────

export function paymentReceiptTemplate(_details: { amount: string; date: string }): string {
  return baseLayout(`
    <h1 style="margin:0 0 16px;font-size:24px;color:${TEXT_COLOR};">Payment received</h1>
    <p style="margin:0;font-size:16px;color:${MUTED_COLOR};">Payment receipt template — coming in Group 7.</p>
  `);
}

export function trialEndingTemplate(daysLeft: number): string {
  return baseLayout(`
    <h1 style="margin:0 0 16px;font-size:24px;color:${TEXT_COLOR};">Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</h1>
    <p style="margin:0;font-size:16px;color:${MUTED_COLOR};">Trial ending template — coming in Group 7.</p>
  `);
}

export function subscriptionChangeTemplate(_type: 'cancelled' | 'resumed' | 'upgraded'): string {
  return baseLayout(`
    <h1 style="margin:0 0 16px;font-size:24px;color:${TEXT_COLOR};">Subscription updated</h1>
    <p style="margin:0;font-size:16px;color:${MUTED_COLOR};">Subscription change template — coming in Group 7.</p>
  `);
}
