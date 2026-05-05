// frontend/__tests__/quality/lottiePackAudit.test.ts
// ROADMAP 4.0 Tier J1 — Lottie animation pack audit (TDD).
//
// Walks `frontend/components/mascot/lottie/` and asserts every .json file is
// valid JSON, ≤80kb, and conforms to the minimum Lottie 5.x shape (v + fr + ip
// + op + w + h + layers). Prevents future drift where someone drops a
// malformed asset that would crash playback.

import * as fs from 'fs';
import * as path from 'path';

const LOTTIE_DIR = path.resolve(__dirname, '../../components/mascot/lottie');
const REQUIRED_KEYS = ['v', 'fr', 'ip', 'op', 'w', 'h', 'layers'] as const;
const MAX_BYTES = 80 * 1024;
const REQUIRED_FILES = [
  'confetti.json',
  'chef-kiss.json',
  'thinking-loop.json',
  'heart-burst.json',
  'sparkle-trail.json',
];

interface LottieFileEntry {
  name: string;
  fullPath: string;
  bytes: number;
}

const listLottieFiles = (): LottieFileEntry[] => {
  const entries = fs
    .readdirSync(LOTTIE_DIR)
    .filter((f) => f.endsWith('.json'));
  return entries.map((name) => {
    const fullPath = path.join(LOTTIE_DIR, name);
    return { name, fullPath, bytes: fs.statSync(fullPath).size };
  });
};

describe('Lottie pack audit (J1)', () => {
  it('directory exists', () => {
    expect(fs.existsSync(LOTTIE_DIR)).toBe(true);
  });

  it('contains all 5 launch-required animations', () => {
    const present = listLottieFiles().map((f) => f.name);
    for (const required of REQUIRED_FILES) {
      expect(present).toContain(required);
    }
  });

  it('every Lottie file is ≤80kb', () => {
    for (const f of listLottieFiles()) {
      expect(f.bytes).toBeLessThanOrEqual(MAX_BYTES);
    }
  });

  it('every Lottie file parses as valid JSON', () => {
    for (const f of listLottieFiles()) {
      const raw = fs.readFileSync(f.fullPath, 'utf8');
      expect(() => JSON.parse(raw)).not.toThrow();
    }
  });

  it('every Lottie file has the minimum required keys (v, fr, ip, op, w, h, layers)', () => {
    for (const f of listLottieFiles()) {
      const obj = JSON.parse(fs.readFileSync(f.fullPath, 'utf8'));
      for (const key of REQUIRED_KEYS) {
        expect(obj).toHaveProperty(key);
      }
      expect(Array.isArray(obj.layers)).toBe(true);
    }
  });

  it('every Lottie file declares a non-zero frame rate + duration', () => {
    for (const f of listLottieFiles()) {
      const obj = JSON.parse(fs.readFileSync(f.fullPath, 'utf8'));
      expect(typeof obj.fr).toBe('number');
      expect(obj.fr).toBeGreaterThan(0);
      expect(obj.op).toBeGreaterThan(obj.ip);
    }
  });
});
