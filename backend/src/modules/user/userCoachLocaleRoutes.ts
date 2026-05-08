// ROADMAP 4.0 G1.2 — coach-locale override endpoint.
//
// PATCH /user/coach-locale — bilingual users set Sazon's voice independent
// of UI locale. Spec: a US-based Mexican-American user whose phone is
// English but who wants Spanish food guidance gets one tap to flip Sazon
// while the UI stays English.
//
// Accepts the same supported-locale set as /user/locale, plus `null`
// (clears the override → coach voice falls back to User.locale).

import { Router, type Request, type Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';

const SUPPORTED_LOCALES = new Set([
  'en',
  'es',
  'es-MX',
  'es-AR',
  'es-CO',
  'es-ES',
  'es-419',
  'pt',
  'pt-BR',
  'pt-PT',
]);

const router = Router();

router.patch('/coach-locale', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!('coachLocale' in body)) {
    return res.status(400).json({
      error: 'coachLocale field is required (string or null)',
    });
  }
  const value = body.coachLocale;
  if (value !== null && (typeof value !== 'string' || !SUPPORTED_LOCALES.has(value))) {
    return res.status(400).json({
      error: 'Unsupported or invalid locale',
      supported: Array.from(SUPPORTED_LOCALES),
    });
  }

  const userId = getUserId(req);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { coachLocale: value },
    select: { id: true, coachLocale: true },
  });

  return res.json({ id: updated.id, coachLocale: updated.coachLocale });
});

export const userCoachLocaleRouter = router;
