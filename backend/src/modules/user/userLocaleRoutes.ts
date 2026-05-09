// ROADMAP 4.0 i18n-OPS4.1 — locale override endpoint.
//
// PATCH /user/locale — power users / bilinguals override the auto-detected
// device locale. Validates the BCP 47 tag against the set we ship a coach
// persona for; unknown tags return 400 (no silent en fallback so the user
// sees an obvious error if they typo, instead of "why is Sazon English now?").

import { Router, type Request, type Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';
import { SUPPORTED_LOCALES } from '@/config/locales';

const router = Router();

router.patch('/locale', async (req: Request, res: Response) => {
  const { locale } = req.body ?? {};
  if (typeof locale !== 'string' || !SUPPORTED_LOCALES.has(locale)) {
    return res.status(400).json({
      error: 'Unsupported or invalid locale',
      supported: Array.from(SUPPORTED_LOCALES),
    });
  }

  const userId = getUserId(req);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { locale },
    select: { id: true, locale: true },
  });

  return res.json({ id: updated.id, locale: updated.locale });
});

export const userLocaleRouter = router;
