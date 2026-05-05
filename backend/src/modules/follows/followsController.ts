// backend/src/modules/follows/followsController.ts
// ROADMAP 4.0 F1 — follow / unfollow / friends feed.

import { Request, Response } from 'express';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';
import {
  follow,
  unfollow,
  isFollowing,
  getFollowSummary,
  computeFriendsFeed,
} from '@/services/friendsFeedService';

export const followsController = {
  async follow(req: Request, res: Response) {
    try {
      const followerId = getUserId(req);
      const followingId = req.params.userId;
      if (!followingId) return res.status(400).json({ error: 'userId required' });
      if (followerId === followingId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
      }
      await follow(followerId, followingId);
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, 'follows.follow.failed');
      res.status(500).json({ error: 'Failed to follow user' });
    }
  },

  async unfollow(req: Request, res: Response) {
    try {
      const followerId = getUserId(req);
      const followingId = req.params.userId;
      if (!followingId) return res.status(400).json({ error: 'userId required' });
      await unfollow(followerId, followingId);
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, 'follows.unfollow.failed');
      res.status(500).json({ error: 'Failed to unfollow user' });
    }
  },

  async status(req: Request, res: Response) {
    try {
      const followerId = getUserId(req);
      const followingId = req.params.userId;
      if (!followingId) return res.status(400).json({ error: 'userId required' });
      const following = await isFollowing(followerId, followingId);
      res.json({ following });
    } catch (err) {
      logger.error({ err }, 'follows.status.failed');
      res.status(500).json({ error: 'Failed to load follow status' });
    }
  },

  async summary(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const summary = await getFollowSummary(userId);
      res.json({ summary });
    } catch (err) {
      logger.error({ err }, 'follows.summary.failed');
      res.status(500).json({ error: 'Failed to load follow summary' });
    }
  },

  async feed(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const items = await computeFriendsFeed(userId);
      res.json({ items });
    } catch (err) {
      logger.error({ err }, 'follows.feed.failed');
      res.status(500).json({ error: 'Failed to load friends feed' });
    }
  },
};
