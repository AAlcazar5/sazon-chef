// frontend/lib/api/cook.ts
// W-D Phase 1 / D-1 — Cook Log read client. Cursor-paged; the response
// intentionally has NO total (W-D1 — the Cook Log is a like-signal store,
// not a countable catalog).
import { apiClient } from './core';

export interface CookLogEntry {
  id: string;
  type: string;
  recipeId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CookLogPage {
  entries: CookLogEntry[];
  nextCursor: string | null;
}

export const cookApi = {
  getCookLog: (
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<CookLogPage> => apiClient.get('/cook/log', { params: opts }),
};
