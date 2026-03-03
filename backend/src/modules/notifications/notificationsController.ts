// backend/src/modules/notifications/notificationsController.ts
// Push notification token registration and management

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/utils/authHelper';

export const notificationsController = {
  /**
   * Register a push notification token for the authenticated user.
   * Upserts: if the token already exists (for any user), it gets reassigned.
   * POST /api/notifications/register-token
   */
  async registerToken(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { token, platform } = req.body;

      // Upsert by unique token — reassign to current user if it existed for another
      await prisma.pushToken.upsert({
        where: { token },
        update: { userId, platform, updatedAt: new Date() },
        create: { userId, token, platform },
      });

      res.json({ success: true, message: 'Push token registered' });
    } catch (error: any) {
      console.error('❌ [Notifications] registerToken error:', error);
      res.status(500).json({ error: 'Failed to register push token' });
    }
  },

  /**
   * Unregister a push notification token (e.g. on logout).
   * DELETE /api/notifications/unregister-token
   */
  async unregisterToken(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required' });
      }

      await prisma.pushToken.deleteMany({
        where: { token },
      });

      res.json({ success: true, message: 'Push token unregistered' });
    } catch (error: any) {
      console.error('❌ [Notifications] unregisterToken error:', error);
      res.status(500).json({ error: 'Failed to unregister push token' });
    }
  },
};
