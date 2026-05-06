// backend/src/services/selfImprovement/feeds/competitorReleasesFeed.ts
// Tier M1 / Feed 1 — weekly pull of competitor release notes via AppFollow.
// No LLM call by default; AppFollow already returns structured release notes
// per app. Haiku narration is applied only if ANTHROPIC_API_KEY is set AND
// the operator opts in via FEED_NARRATE_RELEASES=1.

import fs from 'fs';
import path from 'path';
import { logger } from '../../../utils/logger';
import { FeedDeps, FeedRunResult } from './types';

const FEED_ID = 'competitor-releases';
const APPFOLLOW_HOST = 'https://api.appfollow.io/v2/release_notes';

export interface ReleaseNote {
  app: string;
  version: string;
  publishedAt: string; // ISO
  notes: string;
}

export async function fetchAppFollowReleases(
  apps: string[],
  fetchFn: typeof fetch,
): Promise<ReleaseNote[]> {
  const apiKey = process.env.APPFOLLOW_API_KEY;
  if (!apiKey || apps.length === 0) return [];

  const out: ReleaseNote[] = [];
  for (const app of apps) {
    try {
      const url = `${APPFOLLOW_HOST}?ext_id=${encodeURIComponent(app)}`;
      const res = await fetchFn(url, {
        headers: { 'X-AppFollow-API-Token': apiKey },
      });
      if (!res.ok) {
        logger.warn(
          { app, status: res.status },
          'feed.competitorReleases.fetchFailed',
        );
        continue;
      }
      const json = (await res.json()) as {
        list?: Array<{
          version?: string;
          published_at?: string;
          release_notes?: string;
        }>;
      };
      for (const r of json.list ?? []) {
        if (!r.version) continue;
        out.push({
          app,
          version: String(r.version),
          publishedAt: String(r.published_at ?? ''),
          notes: String(r.release_notes ?? '').slice(0, 4000),
        });
      }
    } catch (err) {
      logger.warn(
        { err, app },
        'feed.competitorReleases.error',
      );
    }
  }
  return out;
}

export function renderReleasesMarkdown(
  releases: ReleaseNote[],
  asOf: Date,
): string {
  const dateStr = asOf.toISOString().slice(0, 10);
  const lines: string[] = [
    `---`,
    `feed: ${FEED_ID}`,
    `date: ${dateStr}`,
    `item_count: ${releases.length}`,
    `---`,
    ``,
    `# Competitor releases — week of ${dateStr}`,
    ``,
  ];

  if (releases.length === 0) {
    lines.push('_No releases pulled this week (AppFollow not configured or empty response)._');
    return lines.join('\n') + '\n';
  }

  // Group by app
  const byApp = new Map<string, ReleaseNote[]>();
  for (const r of releases) {
    if (!byApp.has(r.app)) byApp.set(r.app, []);
    byApp.get(r.app)!.push(r);
  }
  for (const [app, list] of byApp) {
    lines.push(`## ${app}`, '');
    for (const r of list) {
      lines.push(`- **${r.version}** (${r.publishedAt.slice(0, 10) || '—'})`);
      const trimmed = r.notes.replace(/\n+/g, ' ').trim().slice(0, 280);
      if (trimmed) lines.push(`  - ${trimmed}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export async function runCompetitorReleasesFeed(
  apps: string[],
  deps: FeedDeps = {},
): Promise<FeedRunResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const now = deps.now ? deps.now() : new Date();
  const outputRoot =
    deps.outputRoot ?? path.resolve(process.cwd(), '../.context/observations');

  const releases = await fetchAppFollowReleases(apps, fetchFn);
  const dir = path.join(outputRoot, FEED_ID);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${now.toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(filePath, renderReleasesMarkdown(releases, now), 'utf-8');

  return {
    feedId: FEED_ID,
    outputPath: filePath,
    itemCount: releases.length,
    tokenCost: 0,
    status: releases.length === 0 ? 'skipped' : 'ok',
    reason: releases.length === 0 ? 'no_releases_or_unconfigured' : undefined,
  };
}
