// backend/scripts/seedProgress.ts
//
// Pure formatter for the catalog-seed terminal progress bar. The run takes
// hours, so the operator needs an at-a-glance % bar, the running
// saved/duplicate/failed breakdown, and a projected ETA. Kept pure (no I/O,
// time passed in as elapsedMs) so it's deterministic and unit-testable; the
// seed script owns the TTY redraw vs. background-log emission.

export interface ProgressInput {
  done: number;
  total: number;
  saved: number;
  dup: number;
  fail: number;
  elapsedMs: number;
  label: string;
  width?: number;
}

function formatEta(done: number, total: number, elapsedMs: number): string {
  if (total <= 0 || done <= 0 || elapsedMs <= 0) return '—';
  if (done >= total) return 'done';
  const remainingMs = (elapsedMs / done) * (total - done);
  const mins = Math.round(remainingMs / 60_000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function formatProgressBar(input: ProgressInput): string {
  const { done, total, saved, dup, fail, elapsedMs, label } = input;
  const width = input.width ?? 20;

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);

  const counts = `✓${saved} ⊘${dup} ✗${fail}`;
  const eta = `ETA ${formatEta(done, total, elapsedMs)}`;
  const tail = label ? ` · ${label}` : '';

  return `${pct}% ${bar} ${done}/${total}  ${counts}  ${eta}${tail}`;
}
