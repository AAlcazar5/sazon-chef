// Regression: a wrong-password login (401 "Email or password is incorrect")
// must NEVER hit console.error — it's an expected user error surfaced by
// the auth form. Mirrors the existing classifyNetworkFailure pattern so
// the log decision is a pure, tested unit. RED-first.

import { classifyApiError } from '../../../lib/api/core';

const R = (statusCode?: number, rawMessage = '', extra: Partial<{ rawCode: string; hasResponse: boolean; hasRequest: boolean }> = {}) =>
  classifyApiError({
    statusCode,
    rawMessage,
    rawCode: extra.rawCode,
    hasResponse: extra.hasResponse ?? true,
    hasRequest: extra.hasRequest ?? true,
  });

describe('classifyApiError — never log expected user errors', () => {
  it('THE BUG: 401 "Email or password is incorrect" → auth-credential (silent)', () => {
    expect(R(401, 'Email or password is incorrect')).toBe('auth-credential');
  });

  it.each([
    'Email or password is incorrect',
    'Incorrect email or password',
    'Invalid credentials',
    'Invalid email or password',
    'Incorrect password',
    'Wrong password',
    'User not found',
  ])('401 "%s" → auth-credential', (msg) => {
    expect(R(401, msg)).toBe('auth-credential');
  });

  it.each([
    'Email already in use',
    'Account already registered',
    'Email already exists',
  ])('400 register dup "%s" → auth-credential', (msg) => {
    expect(R(400, msg)).toBe('auth-credential');
  });
});

describe('classifyApiError — must NOT over-suppress real problems', () => {
  it('a real session-tamper 401 still logs (unexpected)', () => {
    expect(R(401, 'invalid token signature')).toBe('unexpected');
    expect(R(401, 'malformed authorization header')).toBe('unexpected');
  });

  it('a generic 500 still logs (unexpected)', () => {
    expect(R(500, 'Internal Server Error')).toBe('unexpected');
  });
});

describe('classifyApiError — existing categories preserved (characterization)', () => {
  it('auth-bootstrap 401s (missing/expired token)', () => {
    expect(R(401, 'No authentication token provided')).toBe('auth-bootstrap-401');
    expect(R(401, 'Session has expired')).toBe('auth-bootstrap-401');
    expect(R(401, 'jwt expired')).toBe('auth-bootstrap-401');
  });
  it('409 / already saved', () => {
    expect(R(409, '')).toBe('already-saved');
    expect(R(200, 'Recipe already saved')).toBe('already-saved');
  });
  it('expected 404 phrases', () => {
    expect(R(404, 'meal plan not found')).toBe('expected-404');
  });
  it('generic 4xx → expected-user (silent)', () => {
    expect(R(400, 'Validation failed: name required')).toBe('expected-user');
    expect(R(404, 'some other not found')).toBe('expected-user');
  });
  it('quota / rate limit', () => {
    expect(R(429, '')).toBe('quota');
    expect(R(503, 'API quota exceeded')).toBe('quota');
  });
  it('AI generation failure', () => {
    expect(R(500, 'failed to generate recipe', { rawCode: 'GENERATION_ERROR' })).toBe('ai-generation');
  });
  it('network error (no response, has request)', () => {
    expect(R(undefined, '', { hasResponse: false, hasRequest: true })).toBe('network');
  });
});
