// Group 10S: drift guard — frontend card library and backend manifest
// must declare the same set of card IDs. If a card is added or renamed on
// only one side, the unlock system breaks silently.

import * as fs from 'fs';
import * as path from 'path';
import { KITCHEN_IQ_CARDS } from '../../../lib/kitchenIQ/cards';

const MANIFEST_PATH = path.resolve(
  __dirname,
  '../../../../backend/src/modules/kitchenIQ/kitchenIQManifest.ts',
);

function extractManifestIds(source: string): string[] {
  const ids: string[] = [];
  const re = /\{\s*id:\s*'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

describe('Kitchen IQ frontend ↔ backend ID parity', () => {
  it('every frontend card id has a matching backend manifest entry and vice versa', () => {
    const manifestSource = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const manifestIds = extractManifestIds(manifestSource);
    const frontendIds = KITCHEN_IQ_CARDS.map((c) => c.id);

    const inFrontendNotBackend = frontendIds.filter((id) => !manifestIds.includes(id));
    const inBackendNotFrontend = manifestIds.filter((id) => !frontendIds.includes(id));

    expect(inFrontendNotBackend).toEqual([]);
    expect(inBackendNotFrontend).toEqual([]);
    expect(frontendIds.length).toBe(manifestIds.length);
  });
});
