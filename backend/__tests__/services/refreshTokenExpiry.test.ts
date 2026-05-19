// Dev convenience: the 15-min access token logs developers out
// constantly. resolveAccessTokenExpiry keeps prod at 15m but makes dev
// effectively non-expiring. Explicit ACCESS_TOKEN_EXPIRES_IN always wins
// so prod can never be loosened by accident. RED-first.

import { resolveAccessTokenExpiry } from '../../src/services/refreshTokenService';

describe('resolveAccessTokenExpiry', () => {
  it('production with no override → 15m (unchanged, secure)', () => {
    expect(resolveAccessTokenExpiry({ nodeEnv: 'production' })).toBe('15m');
  });

  it('development with no override → long-lived (no constant logouts)', () => {
    expect(resolveAccessTokenExpiry({ nodeEnv: 'development' })).toBe('365d');
  });

  it('test / undefined env → treated as non-prod (dev-long)', () => {
    expect(resolveAccessTokenExpiry({ nodeEnv: 'test' })).toBe('365d');
    expect(resolveAccessTokenExpiry({ nodeEnv: undefined })).toBe('365d');
  });

  it('explicit ACCESS_TOKEN_EXPIRES_IN always wins — even in prod', () => {
    expect(
      resolveAccessTokenExpiry({ envValue: '30m', nodeEnv: 'production' }),
    ).toBe('30m');
    expect(
      resolveAccessTokenExpiry({ envValue: '1h', nodeEnv: 'development' }),
    ).toBe('1h');
  });

  it('empty/whitespace override is ignored (falls to env default)', () => {
    expect(
      resolveAccessTokenExpiry({ envValue: '', nodeEnv: 'production' }),
    ).toBe('15m');
    expect(
      resolveAccessTokenExpiry({ envValue: '   ', nodeEnv: 'development' }),
    ).toBe('365d');
  });
});
