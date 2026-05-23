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

  // X-B1 (founder roadmap Tier X — Moat Hardening): cook context export.
  // The frontend "Copy cooking context" affordance (X-B2) consumes this.
  // Returns the v1 payload as-is — the consumer copies it to clipboard
  // without re-shaping (the schema IS the contract handed to external
  // kitchens).
  getContextExport: async (): Promise<CookContextV1Payload> => {
    const res = await apiClient.get('/cook/context-export');
    return res.data as CookContextV1Payload;
  },
};

export interface CookContextV1Payload {
  version: 'v1';
  taste: {
    likedCuisines: string[];
    spiceLevel: string | null;
  };
  restrictions: {
    allergens: string[];
    dietary: string[];
    bannedIngredients: string[];
  };
  pantrySummary: {
    itemCount: number;
    topCategories: string[];
  };
  recentCooks: Array<{
    recipeName: string;
    cuisine: string | null;
    cookedAt: string;
  }>;
  skillTier: 'beginner' | 'home_cook' | 'confident' | 'chef' | null;
}
