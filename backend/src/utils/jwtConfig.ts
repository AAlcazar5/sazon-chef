// backend/src/utils/jwtConfig.ts
// ROADMAP 4.0 U13 — Single source of truth for JWT_SECRET.
//
// Pre-U13: `socialAuthController.ts`, `authController.ts`, and
// `refreshTokenService.ts` each had:
//
//   const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
//
// The fallback was dead in practice (authMiddleware's startup guard
// refuses to boot without a 32+ char secret), but one cleanup pass away
// from going live and making every issued token forgeable. U13 collapses
// the four sites onto this one module so the guard and the value live
// in the same place — no fallback string can drift back in.

const SECRET = process.env.JWT_SECRET;

if (!SECRET || SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET env var is required and must be at least 32 characters. ' +
      'Generate one via: openssl rand -base64 48',
  );
}

export const JWT_SECRET: string = SECRET;
