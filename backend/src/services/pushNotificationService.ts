// backend/src/services/pushNotificationService.ts
// Push notification delivery via Expo Push API

import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { prisma } from '@/lib/prisma';

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
});

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const pushNotificationService = {
  /**
   * Send a push notification to all devices registered to a user.
   * Respects quiet hours and weekendsOff settings.
   * Silently no-ops if user has no push tokens.
   */
  async sendToUser(userId: string, notification: PushNotification): Promise<void> {
    // Check quiet hours before sending
    if (await this.isQuietHours(userId)) {
      console.log(`🔕 [Push] Skipping notification for user ${userId} — quiet hours`);
      return;
    }

    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        sound: 'default' as const,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
      }));

    if (messages.length === 0) return;

    await this.sendChunked(messages);
  },

  /**
   * Send a push notification to multiple users.
   */
  async sendToUsers(userIds: string[], notification: PushNotification): Promise<void> {
    for (const userId of userIds) {
      try {
        await this.sendToUser(userId, notification);
      } catch (error) {
        console.error(`❌ [Push] Failed to send to user ${userId}:`, error);
      }
    }
  },

  /**
   * Chunk messages and send via Expo Push API.
   * Handles ticket errors and cleans up invalid tokens.
   */
  async sendChunked(messages: ExpoPushMessage[]): Promise<void> {
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);

        // Check for errors in tickets
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'error') {
            console.error(`❌ [Push] Ticket error:`, ticket.message);

            // Clean up invalid tokens
            if (ticket.details?.error === 'DeviceNotRegistered') {
              const token = (chunk[i] as any).to as string;
              await this.cleanupInvalidToken(token);
            }
          }
        }
      } catch (error) {
        console.error('❌ [Push] Failed to send chunk:', error);
      }
    }
  },

  /**
   * Check if the current time falls within a user's quiet hours.
   * Also checks weekendsOff setting.
   */
  async isQuietHours(userId: string): Promise<boolean> {
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId },
      select: { quietHoursStart: true, quietHoursEnd: true, weekendsOff: true },
    });

    if (!settings) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Check weekendsOff
    if (settings.weekendsOff && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return true;
    }

    // Check quiet hours
    if (settings.quietHoursStart && settings.quietHoursEnd) {
      const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
      const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);
      const currentTime = currentHour * 60 + currentMinute;
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;

      // Handle overnight quiet hours (e.g., 22:00 - 08:00)
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime < endTime;
      } else {
        return currentTime >= startTime && currentTime < endTime;
      }
    }

    return false;
  },

  /**
   * Remove an invalid push token from the database.
   */
  async cleanupInvalidToken(token: string): Promise<void> {
    try {
      await prisma.pushToken.deleteMany({ where: { token } });
      console.log(`🧹 [Push] Cleaned up invalid token: ${token.substring(0, 20)}...`);
    } catch (error) {
      console.error('❌ [Push] Failed to cleanup token:', error);
    }
  },
};
