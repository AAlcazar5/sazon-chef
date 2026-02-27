// backend/src/modules/search/searchController.ts
import type { Request, Response } from 'express';
import { parseSearchIntent } from './intentParser';

export const searchController = {
  /**
   * POST /api/search/natural
   * Accepts a natural language query, extracts filters, and returns structured filters
   * that the frontend can use to call the existing recipe search endpoint.
   *
   * Body: { query: string }
   * Returns: { filters: ExtractedFilters, originalQuery: string }
   */
  parseNaturalQuery: async (req: Request, res: Response) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const filters = parseSearchIntent(query.trim());

      return res.json({
        filters,
        originalQuery: query.trim(),
      });
    } catch (error: any) {
      console.error('Natural language search error:', error);
      return res.status(500).json({ error: 'Failed to parse search query' });
    }
  },
};
