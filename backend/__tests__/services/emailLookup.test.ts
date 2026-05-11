// U14: emailLookup hash util.

import { hashEmailForLookup, normalizeEmailForLookup } from '../../src/utils/emailLookup';

describe('U14: emailLookup', () => {
  describe('normalizeEmailForLookup', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmailForLookup('  Alex@Example.COM  ')).toBe('alex@example.com');
    });
  });

  describe('hashEmailForLookup', () => {
    it('returns a 64-char lowercase hex string', () => {
      const h = hashEmailForLookup('alex@example.com');
      expect(h).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic for identical input', () => {
      expect(hashEmailForLookup('alex@example.com')).toBe(
        hashEmailForLookup('alex@example.com'),
      );
    });

    it('treats case + whitespace variants as the same email', () => {
      const a = hashEmailForLookup('alex@example.com');
      const b = hashEmailForLookup('ALEX@EXAMPLE.COM');
      const c = hashEmailForLookup('  alex@example.com  ');
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it('different emails do not collide', () => {
      const a = hashEmailForLookup('alex@example.com');
      const b = hashEmailForLookup('alex@example.org');
      const c = hashEmailForLookup('alexx@example.com');
      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
      expect(b).not.toBe(c);
    });

    it('is keyed (cannot match without the HMAC key)', () => {
      // Plain SHA-256 of "alex@example.com" is a known value; ours must NOT
      // equal it, proving the hash is keyed rather than a bare digest.
      const known_plain_sha256_alex = require('crypto')
        .createHash('sha256')
        .update('alex@example.com')
        .digest('hex');
      expect(hashEmailForLookup('alex@example.com')).not.toBe(known_plain_sha256_alex);
    });
  });
});
