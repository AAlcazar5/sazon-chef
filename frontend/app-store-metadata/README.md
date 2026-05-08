# App Store / Play Store Metadata

Per-locale store listings for Sazon. Layout mirrors the Fastlane convention so
**EAS Submit**, **Apple Transporter**, and the **Google Play Console** can
each consume the relevant subtree directly.

## Structure

```
app-store-metadata/
  <locale>/
    app_store/
      name.txt              # ≤30 chars — the visible app name
      subtitle.txt          # ≤30 chars — appears under name on Apple
      description.txt       # ≤4000 chars — the long form pitch
      keywords.txt          # ≤100 chars — comma-separated, no spaces
      promotional_text.txt  # ≤170 chars — can be updated without app review
      whats_new.txt         # ≤4000 chars — release notes for current version
    play_store/
      title.txt             # ≤30 chars
      short_description.txt # ≤80 chars
      full_description.txt  # ≤4000 chars
      whats_new.txt         # ≤500 chars per release
```

## Locales shipped

| Locale code | Apple market | Google market | Persona |
|---|---|---|---|
| `en-US` | English (U.S.) | English (United States) | Default |
| `es-MX` | Spanish (Mexico) | Spanish (Latin America) | Mexican Spanish — tortilla=flatbread, frijoles, elote, chile |
| `es-AR` | Spanish (Argentina) | Spanish (Argentina) | Argentine — tortilla=potato omelette, porotos, choclo, ají=sweet |
| `es-ES` | Spanish (Spain) | Spanish (Spain) | Iberian — patata, judías, paella, sofrito |
| `es-CO` | Spanish (Colombia) | Spanish (Colombia) | Colombian — arepa, ajiaco, mazorca, ají=mild |

> `es-419` (LatAm catch-all) is served by the Spanish (Latin America) listing
> on Google Play; Apple has discrete per-country listings so we route MX as
> the default for unspecified Latin American markets via Apple's territory
> targeting.

## Voice rules per copy

Every locale's copy must respect the same persona constraints encoded in
`backend/src/services/coachPromptService.ts`:

- ❌ "macro-friendly" / "macroamigable" / verdict tone
- ❌ "cut/bulk/maintain" as goal phases (and Spanish equivalents:
  "déficit/volumen/mantenimiento")
- ❌ "cookbook" / "coach" (use "Kitchen" / "Sazon")
- ✅ Cultural specificity (Persian sumac, Mexican tinga, Argentine asado)
- ✅ Lifestyle voice — "the friend who cooks well" not "your trainer"
- ✅ Discovery framing — "see what your week looks like" not "track your goals"

When adding a new locale, copy `en-US/` as the template, translate, then
double-check character counts (Apple is strict; over-limit submissions
auto-reject).

## Submission flow

```bash
# Apple — via EAS or Apple Transporter
# point its --metadata flag at this dir.

# Google Play — via Play Console upload or fastlane supply
fastlane supply --metadata_path frontend/app-store-metadata/
```

Tested character counts at write time. If any file's character count drifts
above limit during translation review, reduce — Apple's auto-reject is
silent and easy to miss.
