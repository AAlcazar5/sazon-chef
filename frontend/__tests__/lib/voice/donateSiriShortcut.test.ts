// Y-Siri-2 (founder Telegram 2026-05-22) — donate helper tests.
// Each test fully isolates the react-native mock via jest.resetModules
// + jest.doMock + a fresh `require` so platform / native-bridge state
// doesn't leak across.

/* eslint-disable @typescript-eslint/no-require-imports */

interface DonateModule {
  donateRecipeAsk: (input: { query: string; locale?: string }) => Promise<boolean>;
}

function loadModule(): DonateModule {
  return require('../../../lib/voice/donateSiriShortcut') as DonateModule;
}

describe('donateRecipeAsk', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
  });

  it('returns false when query is empty', async () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      NativeModules: {},
    }));
    const { donateRecipeAsk } = loadModule();
    expect(await donateRecipeAsk({ query: '' })).toBe(false);
    expect(await donateRecipeAsk({ query: '   ' })).toBe(false);
  });

  it('returns false on non-iOS platforms (Android no-op)', async () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      NativeModules: {},
    }));
    const { donateRecipeAsk } = loadModule();
    expect(await donateRecipeAsk({ query: 'tacos' })).toBe(false);
  });

  it("returns false on iOS when the native bridge isn't wired yet (stub path)", async () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      NativeModules: {},
    }));
    const { donateRecipeAsk } = loadModule();
    expect(await donateRecipeAsk({ query: 'tacos recipe' })).toBe(false);
  });

  it('delegates to the native module when present', async () => {
    const mockDonate = jest.fn().mockResolvedValue(true);
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      NativeModules: { SazonAppIntents: { donateRecipeAsk: mockDonate } },
    }));
    const { donateRecipeAsk } = loadModule();
    expect(await donateRecipeAsk({ query: 'tacos' })).toBe(true);
    expect(mockDonate).toHaveBeenCalledWith('tacos');
  });

  it('swallows native-module errors and returns false', async () => {
    const mockDonate = jest.fn().mockRejectedValue(new Error('boom'));
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      NativeModules: { SazonAppIntents: { donateRecipeAsk: mockDonate } },
    }));
    const { donateRecipeAsk } = loadModule();
    expect(await donateRecipeAsk({ query: 'tacos' })).toBe(false);
  });

  it('trims whitespace before donating', async () => {
    const mockDonate = jest.fn().mockResolvedValue(true);
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      NativeModules: { SazonAppIntents: { donateRecipeAsk: mockDonate } },
    }));
    const { donateRecipeAsk } = loadModule();
    await donateRecipeAsk({ query: '   tacos   ' });
    expect(mockDonate).toHaveBeenCalledWith('tacos');
  });
});
