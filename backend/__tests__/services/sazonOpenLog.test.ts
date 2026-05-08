// ROADMAP 4.0 IA2.8 — Sazon sheet open-event logging.
//
// Records every Sazon sheet open with the trigger source so we can
// measure whether the IA2 demotion (tab → floating FAB) preserved or
// regressed engagement. Source enum:
//   - 'fab_tap'        — user tapped the global SazonFAB
//   - 'fab_long_press' — long-pressed the FAB (context-seeded open)
//   - 'history_link'   — opened via the SazonSheet history list
//   - 'tab'            — legacy: opened via the (now-hidden) coach tab
//   - 'deep_link'      — push notification or universal link
//   - 'other'          — fallthrough

const mockRecord = jest.fn();

jest.mock('../../src/services/recommender/recommenderEventSchema', () => ({
  recordRecommenderEvent: jest.fn((arg) => mockRecord(arg)),
}));

import {
  logSazonOpen,
  SAZON_OPEN_SOURCES,
  __forTest,
} from '../../src/services/sazonOpenLog';

beforeEach(() => {
  jest.clearAllMocks();
  mockRecord.mockResolvedValue({ id: 'e1' });
});

describe('SAZON_OPEN_SOURCES', () => {
  it('exposes the canonical set of open-source enums', () => {
    expect([...SAZON_OPEN_SOURCES].sort()).toEqual(
      ['deep_link', 'fab_long_press', 'fab_tap', 'history_link', 'other', 'recipe_detail_pill', 'tab'].sort(),
    );
  });
});

describe('logSazonOpen', () => {
  it('writes through recordRecommenderEvent with surface="sazon_sheet"', async () => {
    await logSazonOpen({ userId: 'u1', source: 'fab_tap' });
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        surface: 'sazon_sheet',
        eventType: 'open',
      }),
    );
  });

  it('embeds source + contextSeed + locale in metadata', async () => {
    await logSazonOpen({
      userId: 'u1',
      source: 'fab_long_press',
      contextSeed: 'tonight?',
      locale: 'es-MX',
    });
    const arg = mockRecord.mock.calls[0][0];
    expect(arg.metadata.source).toBe('fab_long_press');
    expect(arg.metadata.contextSeed).toBe('tonight?');
    expect(arg.metadata.locale).toBe('es-MX');
  });

  it('rejects empty userId', async () => {
    await expect(
      logSazonOpen({ userId: '', source: 'fab_tap' }),
    ).rejects.toThrow(/userId/i);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('rejects unknown source', async () => {
    await expect(
      // @ts-expect-error — testing invalid input
      logSazonOpen({ userId: 'u1', source: 'evil' }),
    ).rejects.toThrow(/source/i);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('omits contextSeed from metadata when not provided (no undefined keys)', async () => {
    await logSazonOpen({ userId: 'u1', source: 'tab' });
    const arg = mockRecord.mock.calls[0][0];
    expect(arg.metadata).not.toHaveProperty('contextSeed');
    expect(arg.metadata.source).toBe('tab');
  });

  it('PII guard — strips free-text keys from caller-supplied extra metadata', async () => {
    await logSazonOpen({
      userId: 'u1',
      source: 'fab_tap',
      extra: {
        // Allowed structured key
        screenContext: 'today',
        // PII-shaped keys must be stripped
        note: 'I had a bad day',
        message: 'private text',
        searchQuery: 'tomato',
      } as any,
    });
    const arg = mockRecord.mock.calls[0][0];
    expect(arg.metadata.screenContext).toBe('today');
    expect(arg.metadata.note).toBeUndefined();
    expect(arg.metadata.message).toBeUndefined();
    expect(arg.metadata.searchQuery).toBeUndefined();
  });

  it('exposes constants for cap-test inspection', () => {
    expect(__forTest.SURFACE).toBe('sazon_sheet');
    expect(__forTest.PII_BLOCKED_KEYS).toContain('note');
    expect(__forTest.PII_BLOCKED_KEYS).toContain('message');
    expect(__forTest.PII_BLOCKED_KEYS).toContain('searchQuery');
  });
});
