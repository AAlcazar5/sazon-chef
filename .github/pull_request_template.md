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

## Roadmap

<!-- Reference the ROADMAP_4.0.md item this PR closes, or "n/a" for hotfixes. -->

## Screenshots / video

<!-- For UI changes: at least one before/after pair on iOS + Android. -->

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
