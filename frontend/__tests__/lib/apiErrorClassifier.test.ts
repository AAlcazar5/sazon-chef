// frontend/__tests__/lib/apiErrorClassifier.test.ts
// Pinpoint contract for the network-error classifier in lib/api.ts.
// Locks the axios-code → failureClass mapping so future changes can't
// silently regress to the generic "Unable to connect to server" line
// the user reported.

import { classifyNetworkFailure } from '../../lib/api';

describe('classifyNetworkFailure', () => {
  it.each([
    { code: 'ECONNABORTED', cls: 'timeout',            errorCode: 'TIMEOUT',            re: /longer than expected/i },
    { code: 'ETIMEDOUT',    cls: 'timeout',            errorCode: 'TIMEOUT',            re: /longer than expected/i },
    { code: 'ERR_CANCELED', cls: 'canceled',           errorCode: 'CANCELED',           re: /canceled/i },
    { code: 'ECONNREFUSED', cls: 'server_unreachable', errorCode: 'SERVER_UNREACHABLE', re: /can't reach/i },
    { code: 'EHOSTUNREACH', cls: 'server_unreachable', errorCode: 'SERVER_UNREACHABLE', re: /can't reach/i },
    { code: 'ECONNRESET',   cls: 'server_unreachable', errorCode: 'SERVER_UNREACHABLE', re: /can't reach/i },
    { code: 'ERR_NETWORK',  cls: 'offline',            errorCode: 'OFFLINE',            re: /offline/i },
    { code: 'ENETUNREACH',  cls: 'offline',            errorCode: 'OFFLINE',            re: /offline/i },
    { code: 'ENOTFOUND',    cls: 'offline',            errorCode: 'OFFLINE',            re: /offline/i },
  ])('axios code $code → $cls', ({ code, cls, errorCode, re }) => {
    const got = classifyNetworkFailure({ axiosCode: code });
    expect(got.failureClass).toBe(cls);
    expect(got.code).toBe(errorCode);
    expect(got.message).toMatch(re);
  });

  it('falls back to unknown_transport when no axios code is provided', () => {
    const got = classifyNetworkFailure({});
    expect(got.failureClass).toBe('unknown_transport');
    expect(got.code).toBe('NETWORK_ERROR');
    expect(got.message).toMatch(/unable to reach/i);
  });

  it('detects timeout via message text even without an axios code', () => {
    const got = classifyNetworkFailure({ message: 'request timeout exceeded' });
    expect(got.failureClass).toBe('timeout');
  });

  it('detects cancel via name=CanceledError without an axios code', () => {
    const got = classifyNetworkFailure({ name: 'CanceledError' });
    expect(got.failureClass).toBe('canceled');
  });

  it('never returns the legacy generic message the user reported', () => {
    // Locked: this exact string was the source of the user's complaint.
    // Every classified message is more specific than this fallback.
    const codes = [undefined, 'ECONNABORTED', 'ECONNREFUSED', 'ERR_NETWORK', 'ENOTFOUND'];
    for (const code of codes) {
      const msg = classifyNetworkFailure({ axiosCode: code }).message;
      expect(msg).not.toBe('Unable to connect to server. Please check your internet connection.');
    }
  });
});
