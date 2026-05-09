// H1: SSRF blocklist tests for recipeImportService.
// Table-driven coverage of every variant the audit flagged as missing.

import { __INTERNALS } from '../../src/services/recipeImportService';

const { isBlockedHostname } = __INTERNALS;

describe('recipeImportService — SSRF blocklist (H1)', () => {
  describe('blocked hostnames', () => {
    const blocked = [
      // Direct names
      'localhost',
      '0.0.0.0',
      // IPv4 loopback + RFC1918 + link-local
      '127.0.0.1',
      '127.10.20.30',
      '10.0.0.1',
      '192.168.1.1',
      '172.16.0.1',
      '172.20.5.5',
      '172.31.255.254',
      '169.254.1.1',
      // Cloud metadata
      '169.254.169.254',
      'metadata.google.internal',
      // IPv6 loopback + private + link-local
      '::1',
      '::ffff:127.0.0.1',
      'fd00::1',
      'fc00::1',
      'fe80::1',
      // Decimal IPv4 packed
      '2130706433', // 127.0.0.1
      '3232235521', // 192.168.0.1
      // Octal IPv4
      '0177.0.0.1',
      // Hex IPv4
      '0x7f000001',
      // Bracketed IPv6 from URL parser
      '[::1]',
      '[fd00::1]',
    ];

    it.each(blocked)('blocks %s', (hostname) => {
      expect(isBlockedHostname(hostname)).toBe(true);
    });
  });

  describe('allowed hostnames', () => {
    const allowed = [
      'example.com',
      'recipes.nytimes.com',
      'bonappetit.com',
      'cooking.nytimes.com',
      'www.allrecipes.com',
      // Public IPv4 (not RFC1918 / link-local) — note: dotted-quad numeric
      // hostnames are blocked entirely as a defense-in-depth measure;
      // legitimate recipe URLs use DNS names. We don't test public-IPv4
      // dotted-quads as "allowed" because they're intentionally rejected.
    ];

    it.each(allowed)('allows %s', (hostname) => {
      expect(isBlockedHostname(hostname)).toBe(false);
    });

    it('rejects all dotted-quad IPv4 (defense in depth — legitimate recipes use DNS)', () => {
      expect(isBlockedHostname('8.8.8.8')).toBe(true);
      expect(isBlockedHostname('1.1.1.1')).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    it('blocks LOCALHOST + LocalHost', () => {
      expect(isBlockedHostname('LOCALHOST')).toBe(true);
      expect(isBlockedHostname('LocalHost')).toBe(true);
    });

    it('blocks uppercase IPv6', () => {
      expect(isBlockedHostname('::1')).toBe(true);
      expect(isBlockedHostname('FD00::1')).toBe(true);
    });
  });
});
