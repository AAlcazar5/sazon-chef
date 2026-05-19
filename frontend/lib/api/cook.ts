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
  getCookLog: async (
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<CookLogPage> => {
    // Must unwrap `.data` — apiClient returns the raw AxiosResponse.
    // Returning the response (the prior bug) made useCookLog's
    // `pageData.entries` undefined → MemoryMirrorLead crash (PR #32).
    const res = await apiClient.get('/cook/log', { params: opts });
    return res.data as CookLogPage;
  },

  // D-6 — log a cook done with help elsewhere (§9a "complement Claude").
  // type defaults server-side to made_it; recipeId optional.
  logCookEvent: async (body: {
    type?: string;
    recipeId?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<{ id: string }> => {
    const res = await apiClient.post('/cook/event', body);
    return res.data as { id: string };
  },
};
