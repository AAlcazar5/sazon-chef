# Summary

<!-- 1–3 bullets on what changed and why. Lead with intent, not implementation. -->

## Test plan

- [ ] Tests added or updated; `npm test` passes (backend coverage ≥ 85%)
- [ ] Tested on iOS and Android (or noted why one was skipped)
- [ ] Both light + dark mode visited if any UI changed
- [ ] No `console.log` / debug strings left behind
- [ ] No banned-vocab in user-facing copy (`bannedVocabularyCorpus.ts` clean)
- [ ] No banned design patterns introduced (CLAUDE.md → Banned Patterns)

## Design system (DS8.3)

- [ ] All new colors / radii / shadows / type sourced from `constants/tokens` (no inline hex)
- [ ] If this PR edits a file that imports from `constants/Colors` for a non-data-mapping use, the file was migrated to `constants/tokens` in the same diff (DS0.2 — touch-it-migrate-it)
- [ ] If tokens were added or changed, `npm run build:tokens` was run and `frontend/docs/TOKENS.md` was committed
- [ ] No literal `#fa7e12` (or other brand-coral hex) outside the token files

## i18n locale-file review gate (ROADMAP 4.0 i18n-OPS7.3)

<!-- Required only when this PR flips ≥1 key from missing → translated in
     `frontend/i18n/locales/<locale>.json`. Skip otherwise. -->

- [ ] **Stage 1 — AI back-translation sanity pass.** Ran the new/changed
      strings through Claude or GPT-4o; back-translated to English; diffed
      against `en.json`. No domain ambiguity, broken `{{var}}` placeholders,
      untranslated brand jargon, or register inconsistency (`tu`/`vous` mix)
      remains. **Pasted the diff + reviewer notes below.**
- [ ] **Stage 2 — User-exposure decision.** Choose ONE:
  - [ ] **Native review complete.** Locale is wired into picker / store
        metadata / push targeting. Reviewer (name + relationship) noted
        below. For locales the dev speaks (es, pt with effort), self-review
        counts.
  - [ ] **Draft only — NOT exposed to users.** Keys land in the bundle
        for parity-test pickup, but the locale is suppressed from the
        picker + store metadata + push targeting until a native reviewer
        signs off. Annotated as `// DRAFT — not in picker` in the locale
        file header.

<!-- See `frontend/docs/i18n-locale-review-flow.md` for the full flow. -->

## Roadmap

<!-- Reference the ROADMAP_TO_LAUNCH.md item this PR closes, or "n/a" for hotfixes. -->

## Screenshots / video

<!-- For UI changes: at least one before/after pair on iOS + Android. -->

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
