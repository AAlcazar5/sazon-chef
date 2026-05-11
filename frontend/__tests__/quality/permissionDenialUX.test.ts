// U11: Permission-denial UX audit.
//
// S2.2 shipped the voice-permission flow with Sazon-voiced copy +
// `Linking.openSettings()` recovery. U11 brings parity to every other
// permission flow: every file that calls a `*PermissionsAsync` API must
// also handle the denied state — either inline (via `Linking.openSettings()`
// or the `showPermissionDenied` helper from `lib/permissionDeniedHelpers.ts`)
// or by delegation (an explicit allowlist below for hooks/helpers that
// hand the denied state up to a caller that handles the recovery).

import { execSync } from 'child_process';
import path from 'path';
import { readFileSync } from 'fs';

const ROOT = path.resolve(__dirname, '../..');
const SCOPES = ['app', 'components', 'lib', 'hooks'];

// Hooks/helpers that intentionally hand denied state up to a caller —
// the recovery UI is rendered by the consumer.
const DELEGATION_ALLOWLIST = new Set<string>([
  // useVoiceInput returns `hasPermission=false`; coach.tsx shows the alert.
  'hooks/useVoiceInput.ts',
  // useCoachAttachments returns a denied result; the calling sheet shows the alert.
  'hooks/useCoachAttachments.ts',
  // usePushNotifications silently degrades at app-open. The user-initiated
  // notification-preferences screen handles the re-prompt with recovery.
  'hooks/usePushNotifications.ts',
]);

const PERMISSION_RE = /\b(?:requestPermissions?Async|requestCameraPermissions|requestMediaLibraryPermissionsAsync|requestPermission)\s*\(/;
const RECOVERY_RE = /(?:Linking\.openSettings|showPermissionDenied|permissionDeniedHelpers)/;

function listFiles(): string[] {
  const args = SCOPES.map((s) => `"${s}"`).join(' ');
  const out = execSync(
    `find ${args} -type f \\( -name '*.ts' -o -name '*.tsx' \\)`,
    { cwd: ROOT, encoding: 'utf8' },
  );
  return out
    .split('\n')
    .filter(Boolean)
    .map((f) => path.join(ROOT, f));
}

describe('U11: permission denial UX', () => {
  it('every file that requests a permission has a recovery path (or is allowlisted as delegating)', () => {
    const offenders: string[] = [];
    for (const f of listFiles()) {
      const rel = path.relative(ROOT, f);
      const src = readFileSync(f, 'utf8');
      if (!PERMISSION_RE.test(src)) continue;
      if (DELEGATION_ALLOWLIST.has(rel)) continue;
      if (!RECOVERY_RE.test(src)) {
        offenders.push(rel);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Files calling *PermissionsAsync without a recovery path:\n  ' +
          offenders.join('\n  ') +
          "\nAdd `import { showPermissionDenied } from 'lib/permissionDeniedHelpers'`" +
          ' and call it from the denied branch, OR add the file to the delegation allowlist if recovery is rendered by the caller.',
      );
    }
    expect(offenders.length).toBe(0);
  });

  it('the helper module exists and exports showPermissionDenied', () => {
    const src = readFileSync(
      path.join(ROOT, 'lib', 'permissionDeniedHelpers.ts'),
      'utf8',
    );
    expect(src).toMatch(/export\s+function\s+showPermissionDenied\b/);
    expect(src).toMatch(/Linking\.openSettings/);
  });
});
