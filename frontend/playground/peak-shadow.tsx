// frontend/playground/peak-shadow.tsx
//
// ROADMAP 4.0 DS2.3 — peak-shadow depth playground.
//
// Side-by-side: 4px vs 6px depression on a chunky pill CTA. Open this
// page on iOS + Android to compare. The pressed state is simulated by
// tapping the buttons — both swap their visual depth to zero.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Brand, Type, Space, Radius, Canvas, Ink } from '../constants/tokens';
import colorTokens from '../constants/colorTokens.cjs';

interface PeakButtonProps {
  depth: number;
  label: string;
  testID: string;
}

function PeakButton({ depth, label, testID }: PeakButtonProps) {
  const [pressed, setPressed] = useState(false);
  const visibleDepth = pressed ? 0 : depth;

  return (
    <View testID={testID} style={{ position: 'relative', height: 56 + depth }}>
      {/* Shadow surrogate — sits depth-px below the button, same width. */}
      <View
        testID={`${testID}-shadow`}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: depth,
          height: 56,
          backgroundColor: colorTokens.PeakShadow.lightColor,
          borderRadius: Radius.pill,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{
          height: 56,
          borderRadius: Radius.pill,
          backgroundColor: Brand.light.base,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: pressed ? depth : 0 }],
          marginTop: 0,
          paddingHorizontal: Space['6'],
        }}
      >
        <Text style={{ ...Type.bodyLg, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Brand.light.ink, letterSpacing: 0.2 }}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

export default function PeakShadowPlayground() {
  return (
    <ScrollView testID="peak-shadow-playground" style={{ flex: 1, backgroundColor: Canvas.warmLight }}>
      <Text style={styles.eyebrow}>Peak shadow depth</Text>
      <Text style={styles.title}>4px vs 6px depression — pick the chunkier one.</Text>
      <Text style={styles.body}>
        Tap each button to feel the press. The pressed state translates the button down by the
        token's `depth` px and hides the shadow surrogate. iOS readers haptic + visual alignment;
        Android readers ripple + visual alignment. Pick the depth that reads as the joy peak
        without crossing into "fisher-price chunky."
      </Text>

      <View style={styles.col}>
        <Text style={styles.colLabel}>4px (current)</Text>
        <PeakButton depth={4} label="Save to Kitchen" testID="peak-4" />
      </View>

      <View style={styles.col}>
        <Text style={styles.colLabel}>6px (Duolingo-spirited)</Text>
        <PeakButton depth={6} label="Save to Kitchen" testID="peak-6" />
      </View>

      <View style={styles.col}>
        <Text style={styles.colLabel}>Side-by-side, smaller pill</Text>
        <View style={{ flexDirection: 'row', gap: Space['4'] }}>
          <View style={{ flex: 1 }}>
            <PeakButton depth={4} label="4px" testID="peak-4-small" />
          </View>
          <View style={{ flex: 1 }}>
            <PeakButton depth={6} label="6px" testID="peak-6-small" />
          </View>
        </View>
      </View>

      <View style={[styles.col, { paddingTop: Space['8'] }]}>
        <Text style={styles.colLabel}>Active token (PeakShadow.depth)</Text>
        <Text style={{ ...Type.body, color: Ink.light.primary }}>
          Current: <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{colorTokens.PeakShadow.depth}px</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...(Type.eyebrow as object), color: Brand.light.base, padding: Space['5'], paddingBottom: Space['1'] },
  title: { ...(Type.heading as object), color: Ink.light.primary, paddingHorizontal: Space['5'], paddingBottom: Space['3'] },
  body: { ...(Type.body as object), color: Ink.light.secondary, paddingHorizontal: Space['5'], paddingBottom: Space['6'] },
  col: { paddingHorizontal: Space['5'], paddingBottom: Space['6'] },
  colLabel: { ...(Type.caption as object), color: Ink.light.tertiary, marginBottom: Space['3'], textTransform: 'uppercase' as const, letterSpacing: 0.6 },
});
