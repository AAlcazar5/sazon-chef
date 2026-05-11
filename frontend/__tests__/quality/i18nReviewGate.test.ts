// i18n-OPS7.3: Two-stage review gate.
//
// Process gate, not a runtime/data gate — but pinning the doc + PR
// template wiring catches regressions where someone strips the
// checkboxes out of `.github/pull_request_template.md` (silently
// removing the gate from PR review). The doc itself ships the full flow.

import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..', '..');
const TEMPLATE = path.join(ROOT, '.github', 'pull_request_template.md');
const DOC = path.join(ROOT, 'frontend', 'docs', 'i18n-locale-review-flow.md');

describe('i18n-OPS7.3: two-stage review gate', () => {
  describe('PR template', () => {
    const src = readFileSync(TEMPLATE, 'utf8');

    it('mentions the i18n locale-file review gate section', () => {
      expect(src).toMatch(/i18n locale-file review gate/i);
    });

    it('declares the Stage 1 AI back-translation requirement', () => {
      expect(src).toMatch(/Stage 1.*AI back-translation/i);
    });

    it('declares the Stage 2 user-exposure decision (native review OR draft)', () => {
      expect(src).toMatch(/Stage 2.*User-exposure decision/i);
      expect(src).toMatch(/Native review complete/i);
      expect(src).toMatch(/Draft only/i);
      expect(src).toMatch(/NOT exposed to users/i);
    });

    it('points reviewers at the flow doc', () => {
      expect(src).toMatch(/i18n-locale-review-flow\.md/);
    });
  });

  describe('flow doc', () => {
    const doc = readFileSync(DOC, 'utf8');

    it('covers both stages of the flow', () => {
      expect(doc).toMatch(/Stage 1.*AI back-translation/i);
      expect(doc).toMatch(/Stage 2.*User-exposure decision/i);
    });

    it('lists the suppression touchpoints (locale must not reach user surfaces in Path B)', () => {
      // Critical part of the gate — drafts go in the repo but NOT to
      // any user-facing surface. If a future refactor adds a new
      // locale-routing surface (e.g., email locale), the doc needs
      // to add it here so reviewers know to suppress.
      expect(doc).toMatch(/i18n\.ts/i);
      expect(doc).toMatch(/edit-preferences/i);
      expect(doc).toMatch(/app-store-metadata/i);
      expect(doc).toMatch(/push notification/i);
    });

    it('declares a reversal trigger so the gate has an off-ramp', () => {
      expect(doc).toMatch(/Reversal trigger/i);
    });
  });
});
