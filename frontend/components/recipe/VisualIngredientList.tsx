// frontend/components/recipe/VisualIngredientList.tsx
// Visual ingredient list with emoji icons, bold amounts right-aligned,
// section grouping, and serving adjuster (9M Recipe Detail polish).

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { getIngredientEmoji } from '../../constants/IngredientEmoji';

// ── Helpers ────────────────────────────────────────────────

/** Parse "2 cups diced tomatoes" → { amount: "2 cups", name: "diced tomatoes" } */
function parseIngredient(raw: string): { amount: string; name: string } {
  // Match leading amount: numbers, fractions, ranges, and common units
  const match = raw.match(
    /^([\d./½¼¾⅓⅔⅛\s-]+\s*(?:cups?|tbsp|tsp|oz|ounces?|lbs?|pounds?|g|kg|ml|l|liters?|cloves?|bunch(?:es)?|pieces?|stalks?|heads?|cans?|pkg|packages?|pinch(?:es)?|dash(?:es)?|slices?|strips?|sprigs?|handfuls?|medium|large|small)s?)\s+(.+)/i,
  );
  if (match) {
    return { amount: match[1].trim(), name: match[2].trim() };
  }

  // Fallback: if it starts with a number, split on first word boundary after unit-like token
  const numMatch = raw.match(/^([\d./½¼¾⅓⅔⅛\s-]+)\s+(.+)/);
  if (numMatch) {
    return { amount: numMatch[1].trim(), name: numMatch[2].trim() };
  }

  return { amount: '', name: raw };
}

/** Detect section headers like "For the sauce:" or "The chicken:" */
function isSectionHeader(text: string): boolean {
  return /^(for\s+the\s+|the\s+)/i.test(text.trim()) && text.trim().endsWith(':');
}

/** Get text from ingredient item (string or { text } object) */
function getTextContent(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && 'text' in item) return (item as { text: string }).text;
  return String(item);
}

// ── Types ──────────────────────────────────────────────────

interface VisualIngredientListProps {
  ingredients: Array<string | { id?: string; text: string; order?: number }>;
  /** Base servings count from recipe */
  baseServings?: number;
  isDark: boolean;
}

// ── Component ──────────────────────────────────────────────

export default function VisualIngredientList({
  ingredients,
  baseServings = 4,
  isDark,
}: VisualIngredientListProps) {
  const [servings, setServings] = useState(baseServings);
  const scale = baseServings > 0 ? servings / baseServings : 1;

  const adjustServings = (delta: number) => {
    setServings((prev) => Math.max(1, prev + delta));
  };

  /** Scale an amount string by the serving ratio */
  const scaleAmount = (amount: string): string => {
    if (!amount || scale === 1) return amount;
    return amount.replace(/[\d./]+/, (numStr) => {
      // Parse fraction strings like "1/2" or plain numbers
      let num: number;
      if (numStr.includes('/')) {
        const [numer, denom] = numStr.split('/');
        num = parseFloat(numer) / (parseFloat(denom) || 1);
      } else {
        num = parseFloat(numStr);
      }
      if (isNaN(num)) return numStr;
      const scaled = Math.round(num * scale * 100) / 100;
      if (scaled === Math.floor(scaled)) return String(scaled);
      return scaled.toFixed(1).replace(/\.0$/, '');
    });
  };

  // Parse ingredients into sections
  const sections = useMemo(() => {
    const result: Array<{ header: string | null; items: Array<{ text: string; amount: string; name: string; emoji: string }> }> = [];
    let currentSection: typeof result[number] = { header: null, items: [] };
    result.push(currentSection);

    for (const ing of ingredients) {
      const text = getTextContent(ing);
      if (isSectionHeader(text)) {
        currentSection = { header: text.replace(/:$/, ''), items: [] };
        result.push(currentSection);
        continue;
      }
      const parsed = parseIngredient(text);
      currentSection.items.push({
        text,
        amount: parsed.amount,
        name: parsed.name,
        emoji: getIngredientEmoji(text),
      });
    }

    // Remove empty first section if second exists
    if (result.length > 1 && result[0].items.length === 0) {
      result.shift();
    }
    return result;
  }, [ingredients]);

  const itemCount = sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <View>
      {/* Section header with serving adjuster */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{
          fontSize: 20,
          fontWeight: '700',
          color: isDark ? DarkColors.text.primary : Colors.text.primary,
        }}>
          Ingredients
        </Text>

        {/* Serving adjuster */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? PastelDark.peach : Pastel.peach,
          borderRadius: 100,
          paddingHorizontal: 4,
          paddingVertical: 2,
        }}>
          <HapticTouchableOpacity
            onPress={() => adjustServings(-1)}
            hapticStyle="light"
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? 'rgba(255,183,77,0.2)' : 'rgba(251,146,60,0.15)',
            }}
            accessibilityLabel="Decrease servings"
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#FFB74D' : '#EA580C', lineHeight: 20 }}>−</Text>
          </HapticTouchableOpacity>
          <Text style={{
            fontSize: 13,
            fontWeight: '700',
            color: isDark ? '#FFB74D' : '#EA580C',
            marginHorizontal: 8,
            minWidth: 56,
            textAlign: 'center',
          }}>
            {servings} serving{servings !== 1 ? 's' : ''}
          </Text>
          <HapticTouchableOpacity
            onPress={() => adjustServings(1)}
            hapticStyle="light"
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? 'rgba(255,183,77,0.2)' : 'rgba(251,146,60,0.15)',
            }}
            accessibilityLabel="Increase servings"
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#FFB74D' : '#EA580C', lineHeight: 20 }}>+</Text>
          </HapticTouchableOpacity>
        </View>
      </View>

      {/* Horizontal emoji thumbnail strip */}
      {itemCount > 4 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12, gap: 12 }}
        >
          {sections.flatMap((s) => s.items).map((item, index) => (
            <View key={index} style={{ alignItems: 'center', width: 48 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
              }}>
                <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Ingredient rows by section */}
      {sections.map((section, sIdx) => (
        <View key={sIdx}>
          {section.header && (
            <Text style={{
              fontSize: 17,
              fontWeight: '600',
              color: isDark ? DarkColors.text.primary : Colors.text.primary,
              marginTop: sIdx > 0 ? 16 : 0,
              marginBottom: 8,
            }}>
              {section.header}
            </Text>
          )}
          {section.items.map((item, iIdx) => {
            const globalIdx = sections.slice(0, sIdx).reduce((s, sec) => s + sec.items.length, 0) + iIdx;
            const scaledAmount = scaleAmount(item.amount);

            return (
              <MotiView
                key={`${sIdx}-${iIdx}`}
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'spring', delay: globalIdx * 30, damping: 20, stiffness: 200 }}
              >
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 48,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                }}>
                  {/* Emoji */}
                  <Text style={{ fontSize: 18, width: 28, textAlign: 'center', marginRight: 10 }}>
                    {item.emoji}
                  </Text>
                  {/* Name */}
                  <Text style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: '400',
                    color: isDark ? DarkColors.text.primary : Colors.text.primary,
                  }} numberOfLines={2}>
                    {item.name || item.text}
                  </Text>
                  {/* Amount — right-aligned, bold */}
                  {scaledAmount ? (
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: isDark ? DarkColors.text.primary : Colors.text.primary,
                      marginLeft: 12,
                      textAlign: 'right',
                    }}>
                      {scaledAmount}
                    </Text>
                  ) : null}
                </View>
              </MotiView>
            );
          })}
        </View>
      ))}
    </View>
  );
}
