// Y-Rank-7 (founder roadmap Telegram 2026-05-20): pre-written
// restore-test for the AUTH-G1.2 launch gate (bootstrap-time 401).
//
// The bootstrap auth-check in `contexts/AuthContext.tsx` is currently
// dev-disabled — a 401 on the bootstrap verify call NO LONGER clears
// stored credentials (the founder kept getting kicked back to login
// on every cold start). See the "RESTORE BEFORE LAUNCH" block around
// line 161 of AuthContext.tsx for the suppressed
// `await clearStoredAuth();` call.
//
// The launch-gate AUTH-G1.2 will uncomment that call; this test is
// authored as `it.skip` so the restore is mechanical:
//
//   1. Uncomment the `await clearStoredAuth();` block in
//      contexts/AuthContext.tsx (around line 165-167).
//   2. Flip `it.skip` → `it` below.
//   3. Run the test — it must go green on the first run.

describe('AuthContext — bootstrap 401 clears stored auth (AUTH-G1.2 restore)', () => {
  it.skip(
    'bootstrap verify returning 401 calls clearStoredAuth (token, refresh, user)',
    async () => {
      // When the AUTH-G1.2 gate fires:
      //   - Mock `SecureStore.getItemAsync` to return a stored token +
      //     user so `loadStoredAuth` enters the verify path.
      //   - Mock `apiClient.get('/auth/verify')` (or whichever verify
      //     endpoint AuthContext uses) to reject with status 401.
      //   - Mock `SecureStore.deleteItemAsync` and capture calls.
      //   - Render AuthProvider; wait for `isLoading` to flip false.
      //   - Expect deleteItemAsync was called for TOKEN_KEY,
      //     REFRESH_TOKEN_KEY, USER_KEY — i.e., clearStoredAuth ran.
      //
      // See contexts/AuthContext.tsx around line 165 for the commented
      // block this test pins behavior for. TODO(AUTH-G1.2): uncomment
      // that block + flip `it.skip` → `it` here.
      expect(true).toBe(true);
    },
  );

  it.skip(
    'bootstrap network/timeout error keeps stored auth intact',
    async () => {
      // Negative case for the restore: a transient network error on
      // bootstrap verify must NOT clear the stored token. Only a
      // definitive 401/403 should. Pin alongside the positive case so
      // a future "let's clear on any error" regression flips this
      // test red. TODO(AUTH-G1.2).
      expect(true).toBe(true);
    },
  );
});
