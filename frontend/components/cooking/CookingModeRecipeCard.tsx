// frontend/components/cooking/CookingModeRecipeCard.tsx
//
// Tier Y-3 — the headline replica: the in-chat Cooking Mode recipe card.
// When a recipe is asked for, this is what renders. The defining
// behavior (founder screenshots): the servings stepper rescales the
// ingredient list AND the quantities baked into step prose in lockstep
// (rescaleStepText, Y-1), while oven temps / times / sizes stay put.
// Per-serving macros are invariant to the servings count (a per-serving
// value doesn't change when you cook more servings) — only displayed,
// never rescaled.
//
// Designer rails: food-forward collage, Radius.card, Elevation (no
// borders), pastel surface, tokens single-source, Haptic + a11y.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
// Founder bug 2026-05-20 (round 5): iOS still couldn't scroll the
// card with RN's native <ScrollView> because the parent ScrollView in
// coach.tsx kept intercepting the gesture. react-native-gesture-handler's
// ScrollView uses the gesture system instead of UIScrollView — it
// composes cleanly with the parent ScrollView (the inner one wins on
// touches that start within its bounds, the outer one wins outside).
import { ScrollView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Gradients from '../../constants/Gradients';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import { useTheme } from '../../contexts/ThemeContext';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { ServingStepper } from '../ui/ServingStepper';
import { Brand, PastelTokens, Type, Radius, Elevation } from '../../constants/tokens';
import { CATEGORY_COLORS } from '../../constants/CategoryColors';
import {
  rescaleStepText,
  scaleQuantityDisplay,
  type ScalableIngredientLite,
} from '../../lib/cooking/rescaleStepText';
import {
  convertIngredientUnits,
  type UnitMode,
} from '../../lib/cooking/convertIngredientUnits';

const UNIT_MODE_LABEL: Record<UnitMode, string> = {
  'as-written': 'As written',
  us: 'US',
  metric: 'Metric',
};

interface Macros {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

interface CookingModeRecipeCardProps {
  title: string;
  description: string;
  imageUrls?: string[];
  /** Cuisine label — drives the gradient placeholder + emoji when no
   *  imageUrls are available (AI-gen recipes typically have neither
   *  cuisine-tagged photos nor any photo at all). */
  cuisine?: string;
  baseServings: number;
  ingredients: ScalableIngredientLite[];
  steps: string[];
  macros?: Macros;
  notes?: string;
  onGetCooking?: () => void;
  /** Founder ask 2026-05-19 — N=1 explainer rendered under the title.
   *  "Picked because you've got onion + garlic on hand." Makes the
   *  personalization visible (Kitchen / Journey principle). */
  rationale?: string;
  /** Swap to the next ranker-ordered alternate. Disabled when no
   *  alternates exist (AI-gen-only result). */
  onSwap?: () => void;
  /** Total recipes in the swap pool (including current). Used to render
   *  "2 of 5" alongside the chip; chip hides when ≤ 1. */
  swapPoolSize?: number;
  /** 0-based index into the pool — drives the "N of M" label. */
  swapIndex?: number;
  /** Founder ask 2026-05-20 round 11: when the card is rendered inside
   *  a horizontal carousel of multiple cards, the parent controls the
   *  per-card width so the next card peeks from the side. Setting this
   *  overrides the default full-width-minus-margin layout. */
  widthOverride?: number;
}

/** HTML escape — keeps user-pasted recipe content safe in the print
 *  preview (titles can include `<` etc.) */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Founder ask 2026-05-20 round 14: format a clean printable recipe.
 *  Light theme regardless of app theme (printers don't want a dark
 *  background). Reflects current servings + unit mode. */
function recipeAsHtml(
  title: string,
  description: string,
  servings: number,
  displayIngredients: ScalableIngredientLite[],
  rawIngredients: ScalableIngredientLite[],
  steps: string[],
  factor: number,
  macros: Macros | undefined,
  notes: string | undefined,
): string {
  const ingHtml = displayIngredients
    .map(
      (ing) =>
        `<li>${esc(scaleQuantityDisplay(ing.amount * factor))} ${esc(ing.unit)} ${esc(ing.name)}</li>`,
    )
    .join('');
  const stepHtml = steps
    .map((s) => `<li>${esc(rescaleStepText(s, rawIngredients, factor))}</li>`)
    .join('');
  const macrosHtml =
    macros && macrosLine(macros)
      ? `<p class="macros">Per serving: ${esc(macrosLine(macros))}</p>`
      : '';
  const notesHtml = notes ? `<p class="notes">Notes: ${esc(notes)}</p>` : '';
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { font: 14px/1.5 -apple-system, sans-serif; color: #1F2937; padding: 24px; }
  h1 { font-size: 24px; margin: 0 0 8px; }
  .desc { color: #4B5563; margin: 0 0 16px; }
  .servings { color: #6B7280; margin: 0 0 16px; }
  h2 { font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase; color: #FA7E12; margin: 16px 0 8px; }
  ul, ol { padding-left: 22px; margin: 0 0 8px; }
  li { margin: 4px 0; }
  .macros, .notes { color: #4B5563; margin: 12px 0 0; }
</style></head>
<body>
  <h1>${esc(title)}</h1>
  ${description ? `<p class="desc">${esc(description)}</p>` : ''}
  <p class="servings">Servings: ${servings}</p>
  <h2>Ingredients</h2>
  <ul>${ingHtml}</ul>
  <h2>Steps</h2>
  <ol>${stepHtml}</ol>
  ${macrosHtml}
  ${notesHtml}
</body></html>`;
}

function macrosLine(m: Macros): string {
  const parts: string[] = [];
  if (m.calories != null) parts.push(`${m.calories} cal`);
  if (m.protein != null) parts.push(`${m.protein}g protein`);
  if (m.carbs != null) parts.push(`${m.carbs}g carbs`);
  if (m.fat != null) parts.push(`${m.fat}g fat`);
  if (m.fiber != null) parts.push(`${m.fiber}g fiber`);
  return parts.join(' · ');
}

export default function CookingModeRecipeCard({
  title,
  description,
  imageUrls,
  cuisine,
  baseServings,
  ingredients,
  steps,
  macros,
  notes,
  onGetCooking,
  rationale,
  onSwap,
  swapPoolSize,
  swapIndex,
  widthOverride,
}: CookingModeRecipeCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [servings, setServings] = useState(
    baseServings > 0 ? baseServings : 1,
  );
  const factor = servings / (baseServings > 0 ? baseServings : 1);

  // Y-Live-4 — kitchen-mode units menu (As written / US / Metric).
  // Only affects the displayed ingredient list. Step prose keeps the
  // original base units so rescaleStepText (Y-1) anchors correctly when
  // the servings stepper moves.
  const [unitMode, setUnitMode] = useState<UnitMode>('as-written');
  const [unitsOpen, setUnitsOpen] = useState(false);
  // Founder ask 2026-05-20 round 14: print + copy icons next to units.
  // copyState 'idle' → 'done' (after a successful clipboard write) →
  // back to 'idle' after 1.5s. The checkmark gives a clear confirmation.
  const [copyState, setCopyState] = useState<'idle' | 'done'>('idle');
  const displayIngredients = useMemo(
    () => convertIngredientUnits(ingredients, unitMode),
    [ingredients, unitMode],
  );

  const accent = isDark ? Brand.dark.base : Brand.light.base;
  const surface = isDark ? PastelTokens.dark.peach : PastelTokens.light.peach;
  const images = (imageUrls ?? []).slice(0, 3);

  // Founder bug 2026-05-20 (round 9): user wants BIGGER images + the
  // ability to swipe between them. Carousel layout: each photo is the
  // full card width, stack horizontally, paged-scroll, dots below.
  // styles.card has marginHorizontal:16; styles.content padding:20.
  // We negate the content padding for the carousel so photos go
  // edge-to-edge of the card.
  const screenWidth = Dimensions.get('window').width;
  const CARD_HORIZONTAL_MARGIN = 16;
  const CONTENT_PADDING = 20;
  // When widthOverride is set, the card frame is narrower (parent
  // carousel controls layout). Otherwise full card width.
  const cardOuterWidth = widthOverride ?? screenWidth - CARD_HORIZONTAL_MARGIN * 2;
  // Founder ask 2026-05-20 round 13: photo carousel uses 2/3 + 1/3
  // PEEK pattern (not full-width paging). Photo 1 takes 2/3 of card
  // content width, photo 2 peeks the right 1/3 — sneak preview of the
  // next photo as visible swipe affordance. snapToInterval = photoWidth
  // so each swipe lands the next photo at the 2/3 position with the
  // following one peeking.
  const carouselHeight = 260;
  const photoWidth = Math.round(cardOuterWidth * (2 / 3));
  const photoGap = 8;
  const [activeImage, setActiveImage] = useState(0);
  const onCarouselScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    // Snap interval is photoWidth + gap — round the scroll offset
    // against that to figure out which photo is currently at the
    // 2/3 anchor position.
    const idx = Math.round(
      e.nativeEvent.contentOffset.x / (photoWidth + photoGap),
    );
    if (idx !== activeImage) setActiveImage(idx);
  };

  // Founder bug 2026-05-20: AI-gen recipes had no photo. Backend's
  // generateFromDescription doesn't return imageUrl. When images are
  // missing, fall back to a cuisine-tinted gradient + emoji so the
  // photo slot still anchors the card visually (food is the hero —
  // even when the hero is a vibe, not a literal photo).
  const cuisineKey = cuisine && CATEGORY_COLORS[cuisine] ? cuisine : 'American';
  const cuisineColor = CATEGORY_COLORS[cuisineKey];
  const placeholderBg = isDark ? cuisineColor.bgDark : cuisineColor.bg;
  const placeholderAccent = isDark ? cuisineColor.textDark : cuisineColor.text;

  // Founder bug 2026-05-20 (round 4): iOS STILL didn't scroll after
  // PR #62's maxHeight-on-wrapper approach. The card kept growing to
  // its content's natural height. Reason: `maxHeight` is a soft upper
  // bound that yields when a parent flex layout asks the View to grow
  // (RN's behavior, not a bug). An explicit `height` value is a hard
  // bound that the ScrollView child must overflow.
  //
  // Founder bug 2026-05-20 (round 10): 2/3 of viewport (~67%) leaves
  // the remaining 1/3 for an "Other ideas" peek below — a visible
  // scroll affordance so the user can see there's more content to
  // scroll into.
  const cardHeight = Math.round((Dimensions.get('window').height * 2) / 3);

  // Founder ask 2026-05-20 round 11: when widthOverride is set, the
  // parent (a horizontal carousel) controls layout. Remove the default
  // horizontal margins so the carousel's spacing wins; cap width to
  // the override.
  const outerStyle = widthOverride
    ? { width: widthOverride, marginHorizontal: 0 }
    : null;

  // Founder ask 2026-05-20 round 14: format the recipe as plain text
  // for clipboard / share. Reflects current servings + unit mode so the
  // copy matches what's on screen.
  const recipeAsPlainText = (): string => {
    const lines: string[] = [];
    lines.push(title.toUpperCase());
    lines.push('');
    if (description) {
      lines.push(description);
      lines.push('');
    }
    lines.push(`Servings: ${servings}`);
    lines.push('');
    lines.push('INGREDIENTS');
    for (const ing of displayIngredients) {
      lines.push(
        `• ${scaleQuantityDisplay(ing.amount * factor)} ${ing.unit} ${ing.name}`,
      );
    }
    lines.push('');
    lines.push('STEPS');
    steps.forEach((s, i) => {
      lines.push(`${i + 1}. ${rescaleStepText(s, ingredients, factor)}`);
    });
    if (macros && macrosLine(macros).length > 0) {
      lines.push('');
      lines.push(`Per serving: ${macrosLine(macros)}`);
    }
    if (notes) {
      lines.push('');
      lines.push(`Notes: ${notes}`);
    }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(recipeAsPlainText());
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      // Clipboard rejection is rare on iOS/Android — silently
      // degrade rather than alerting the user.
    }
  };

  const handlePrint = async () => {
    try {
      const html = recipeAsHtml(
        title,
        description,
        servings,
        displayIngredients,
        ingredients,
        steps,
        factor,
        macros,
        notes,
      );
      await Print.printAsync({ html });
    } catch {
      // Print rejection (user cancelled, no printer, etc.) is silent —
      // the iOS share sheet handles user-cancel UX itself.
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: surface, height: cardHeight },
        Elevation.md,
        outerStyle,
      ]}
    >
      <ScrollView
        accessibilityLabel={`${title} recipe`}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        // Founder bug 2026-05-20 (round 7): the inner scroll indicator
        // and the outer ScrollView's indicator both rendered on the
        // same right edge — visual double-track. The card still
        // scrolls (gesture-handler doesn't need the indicator to
        // function), the indicator is just no longer drawn.
        showsVerticalScrollIndicator={false}
      >
      {images.length > 0 ? (
        // Founder ask 2026-05-20 round 13: photo strip uses a 2/3 + 1/3
        // PEEK pattern. Photo 1 is ~2/3 of card content width; photo 2
        // peeks the remaining 1/3 (sneak preview). snapToInterval =
        // photoWidth + gap, so each swipe lands the next photo at the
        // 2/3 position with the following one peeking.
        //
        // Single image → hero treatment (no peek, full card width).
        images.length === 1 ? (
          <View style={styles.heroWrap}>
            <Image
              source={{ uri: images[0] }}
              style={[styles.hero, { height: carouselHeight }]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
        ) : (
          <View style={{ marginHorizontal: -CONTENT_PADDING, marginBottom: 8 }}>
            <ScrollView
              horizontal
              decelerationRate="fast"
              snapToInterval={photoWidth + photoGap}
              snapToAlignment="start"
              showsHorizontalScrollIndicator={false}
              onScroll={onCarouselScroll}
              scrollEventThrottle={16}
              nestedScrollEnabled
              // contentInset gives the first photo a small left inset
              // so it doesn't slam against the screen edge.
              contentContainerStyle={{
                paddingHorizontal: CONTENT_PADDING,
                gap: photoGap,
              }}
              accessibilityLabel={`${title} photos — swipe for next`}
            >
              {images.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={{
                    width: photoWidth,
                    height: carouselHeight,
                    borderRadius: Radius.card,
                  }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ))}
            </ScrollView>
            <View style={styles.dotRow}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === activeImage
                          ? accent
                          : isDark
                          ? 'rgba(255,255,255,0.25)'
                          : 'rgba(0,0,0,0.18)',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )
      ) : (
        <LinearGradient
          colors={[placeholderBg, placeholderBg + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroPlaceholder}
          accessibilityLabel={`${cuisineKey} recipe placeholder`}
        >
          <Text style={styles.heroEmoji}>{cuisineColor.emoji}</Text>
          <Text style={[styles.heroLabel, { color: placeholderAccent }]}>
            {cuisineKey}
          </Text>
        </LinearGradient>
      )}

      <Text style={[styles.title, isDark && styles.dark]}>{title}</Text>
      {rationale ? (
        <Text
          style={[styles.rationale, isDark && styles.rationaleDark]}
          accessibilityLabel={rationale}
        >
          {rationale}
        </Text>
      ) : null}
      <Text style={[styles.desc, isDark && styles.descDark]}>
        {description}
      </Text>

      {/* Founder ask 2026-05-20 round 15: Get Cooking button sits
          between description and the icon/stepper row, uses the brand
          gradient (primaryCTA), and capitalizes "Cooking". */}
      <HapticTouchableOpacity
        onPress={onGetCooking}
        accessibilityRole="button"
        accessibilityLabel="Get Cooking"
        pressedScale={0.97}
        style={styles.cookWrap}
      >
        <LinearGradient
          colors={[...Gradients.primaryCTA]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cook}
        >
          <Text style={styles.cookText}>Get Cooking</Text>
        </LinearGradient>
      </HapticTouchableOpacity>

      {swapPoolSize && swapPoolSize > 1 && onSwap ? (
        <View style={styles.swapRow}>
          <HapticTouchableOpacity
            onPress={onSwap}
            accessibilityRole="button"
            accessibilityLabel={`Show me another recipe — currently ${
              (swapIndex ?? 0) + 1
            } of ${swapPoolSize}`}
            pressedScale={0.97}
            style={[styles.swapChip, { borderColor: accent }]}
          >
            <Ionicons name="shuffle-outline" size={16} color={accent} />
            <Text style={[styles.swapChipText, { color: accent }]}>
              Show me another · {(swapIndex ?? 0) + 1}/{swapPoolSize}
            </Text>
          </HapticTouchableOpacity>
        </View>
      ) : null}

      {/* Founder ask 2026-05-20 round 14: kitchen-mode icon row —
          [stepper] [units] [print] [copy]. Units dropdown anchors
          ABOVE the cook button via absolute positioning so it never
          competes with Get cooking for screen real estate. The outer
          relative container is the absolute popover's anchor. */}
      <View style={styles.controlsAnchor}>
      <View style={styles.controls}>
        <ServingStepper servings={servings} onChangeServings={setServings} />
        <View style={styles.iconRow}>
          <HapticTouchableOpacity
            onPress={() => setUnitsOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel="Change units"
            pressedScale={0.97}
            style={styles.iconBtn}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color={accent} />
          </HapticTouchableOpacity>
          <HapticTouchableOpacity
            onPress={() => handlePrint()}
            accessibilityRole="button"
            accessibilityLabel="Print recipe"
            pressedScale={0.97}
            style={styles.iconBtn}
          >
            <Ionicons name="print-outline" size={20} color={accent} />
          </HapticTouchableOpacity>
          <HapticTouchableOpacity
            onPress={() => handleCopy()}
            accessibilityRole="button"
            accessibilityLabel={copyState === 'done' ? 'Copied' : 'Copy recipe'}
            pressedScale={0.97}
            style={styles.iconBtn}
          >
            <Ionicons
              name={copyState === 'done' ? 'checkmark-outline' : 'copy-outline'}
              size={20}
              color={accent}
            />
          </HapticTouchableOpacity>
        </View>
      </View>

      {/* Units dropdown — absolutely positioned popover anchored to the
          icon row above. Does NOT take flow space (cook button below
          doesn't shift). Click any option closes the menu. */}
      {unitsOpen ? (
        <View
          style={[
            styles.unitsMenu,
            { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
            Elevation.md,
          ]}
        >
          {(['as-written', 'us', 'metric'] as const).map((m) => {
            const label = UNIT_MODE_LABEL[m];
            const isActive = m === unitMode;
            return (
              <HapticTouchableOpacity
                key={m}
                onPress={() => {
                  setUnitMode(m);
                  setUnitsOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
                pressedScale={0.97}
                style={styles.unitOption}
              >
                <Text
                  style={[
                    styles.unitOptionText,
                    isDark && styles.dark,
                    isActive && { color: accent },
                  ]}
                >
                  {label}
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </View>
      ) : null}
      </View>

      <Text style={[styles.eyebrow, { color: accent }]}>INGREDIENTS</Text>
      {displayIngredients.map((ing, i) => (
        <Text
          key={`${ing.name}-${i}`}
          style={[styles.line, isDark && styles.dark]}
        >
          {`${scaleQuantityDisplay(ing.amount * factor)} ${ing.unit} ${ing.name}`}
        </Text>
      ))}

      <Text style={[styles.eyebrow, { color: accent }]}>STEPS</Text>
      {steps.map((s, i) => (
        <Text
          key={`step-${i}`}
          style={[styles.step, isDark && styles.dark]}
        >
          {`${i + 1}. ${rescaleStepText(s, ingredients, factor)}`}
        </Text>
      ))}

      {macros && macrosLine(macros).length > 0 ? (
        <View
          style={[
            styles.notes,
            { backgroundColor: isDark ? PastelTokens.dark.sage : PastelTokens.light.sage },
          ]}
        >
          <Text style={[styles.eyebrow, { color: accent }]}>NOTES</Text>
          <Text style={[styles.line, isDark && styles.dark]}>
            {`Per serving: ${macrosLine(macros)}`}
          </Text>
          {notes ? (
            <Text style={[styles.noteText, isDark && styles.descDark]}>
              {notes}
            </Text>
          ) : null}
        </View>
      ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, marginHorizontal: 16, marginVertical: 12 },
  content: { padding: 20, gap: 10 },
  // Legacy collage/thumb kept for any caller still using them; the
  // active path is the horizontal carousel above.
  collage: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  thumb: { flex: 1, height: 260, borderRadius: Radius.card },
  heroWrap: { marginBottom: 6 },
  hero: { width: '100%', height: 260, borderRadius: Radius.card },
  dotRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  title: { ...Type.heading, color: '#1F2937' },
  dark: { color: '#F9FAFB' },
  desc: { ...Type.body, color: '#4B5563' },
  descDark: { color: '#D1D5DB' },
  rationale: { ...Type.caption, color: '#6B5B47', fontStyle: 'italic' },
  rationaleDark: { color: '#D6C8B0' },
  swapRow: { flexDirection: 'row', marginTop: 4 },
  swapChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  swapChipText: { fontSize: 13, fontWeight: '600' },
  // Anchor for the absolute-positioned unitsMenu popover. position
  // 'relative' (the default for View in RN) lets the popover's `top`
  // / `right` resolve to this container's bounds, not the screen.
  controlsAnchor: {
    position: 'relative',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholder: {
    height: 140,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 6,
  },
  heroEmoji: { fontSize: 56 },
  heroLabel: { ...Type.eyebrow, opacity: 0.85 },
  // Founder ask 2026-05-20 round 14: absolute-positioned dropdown
  // anchored under the icon row. Doesn't take flow space → the cook
  // button below stays put when the menu opens/closes. Right-edge
  // alignment with a small inset matches the units icon's column.
  unitsMenu: {
    position: 'absolute',
    top: 56, // height of icon row + small offset
    right: 8,
    minWidth: 140,
    borderRadius: Radius.card,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 4,
    zIndex: 10,
  },
  unitOption: {
    paddingVertical: 8,
  },
  unitOptionText: { ...Type.body, color: '#1F2937' },
  // The outer touchable owns spacing + the pill clip; the inner
  // LinearGradient renders the brand gradient and the centered label.
  cookWrap: {
    marginTop: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden', // keeps the gradient inside the pill shape
  },
  cook: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cookText: { ...Type.label, color: '#FFFFFF' },
  eyebrow: { ...Type.eyebrow, marginTop: 10 },
  line: { ...Type.body, color: '#1F2937' },
  step: { ...Type.body, color: '#1F2937', marginTop: 6 },
  notes: { borderRadius: Radius.card, padding: 16, marginTop: 12, gap: 6 },
  noteText: { ...Type.bodySm, color: '#4B5563' },
});
