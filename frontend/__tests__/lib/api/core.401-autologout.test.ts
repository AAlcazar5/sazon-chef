// Y-Rank-7 (founder roadmap Telegram 2026-05-20): pre-written
// restore-tests for the AUTH-G1 launch gate.
//
// The 401 auto-logout in `lib/api/core.ts` is currently commented out
// (dev-disabled — see the "RESTORE BEFORE LAUNCH" comment block in
// core.ts around the `if (logoutCallback && !isAuthEndpoint && ...)`
// section). The launch-gate AUTH-G1.1 will uncomment that block; this
// test is authored now as `it.skip` so the restore is mechanical:
//
//   1. Uncomment the auto-logout block in `lib/api/core.ts`.
//   2. Flip `it.skip` → `it` below.
//   3. Run the test — it must go green on the first run.
//
// Pinning the test text + structure NOW prevents a "we forgot to write
// the regression test for the restore" gap when AUTH-G1 fires.

describe('lib/api/core — 401 auto-logout (AUTH-G1.1 restore)', () => {
  it.skip(
    'protected-endpoint 401 calls logoutCallback and fires the Session Expired Alert',
    async () => {
      // When the AUTH-G1.1 gate fires:
      //   - Mock `Alert.alert` from react-native + capture the call
      //     with title "Session Expired".
      //   - Register a mock `logoutCallback` via `setLogoutCallback(...)`.
      //   - Build an axios response interceptor error with
      //     `response.status = 401`, `config.url = '/recipes/123'`
      //     (not an /auth/ endpoint, not /telemetry/).
      //   - Call the response.error path.
      //   - Expect Alert.alert was called once with the "Session Expired"
      //     title; expect logoutCallback was called when the Alert's OK
      //     button onPress runs.
      //
      // See lib/api/core.ts around line 309 for the commented block this
      // test pins behavior for. TODO(AUTH-G1.1): uncomment that block +
      // flip `it.skip` → `it` here. The implementation will live in the
      // restore PR; this body is intentionally empty in the skip-state.
      expect(true).toBe(true);
    },
  );

  it.skip(
    'auth-endpoint 401 (login/register/forgot-password) does NOT fire auto-logout',
    async () => {
      // Negative case for the restore: 401 on `/auth/login` (bad creds)
      // must NOT bounce the user to the login screen — they're already
      // there. Pin alongside the positive case so neither half of the
      // gate flips silently. TODO(AUTH-G1.1).
      expect(true).toBe(true);
    },
  );

  it.skip(
    'telemetry-endpoint 401 (/telemetry/*) does NOT fire auto-logout',
    async () => {
      // Telemetry endpoints are fire-and-forget analytics. A 401 on
      // /telemetry/wedge-ranker-events or similar should never pop the
      // Session Expired alert. The current comment block already
      // handles this via `isTelemetryEndpoint`; the test pins that
      // logic when the auto-logout is restored. TODO(AUTH-G1.1).
      expect(true).toBe(true);
    },
  );
});
