// frontend/playground/design.tsx
//
// ROADMAP 4.0 DS8.1 — token playground.
//
// Renders every token from `constants/tokens` visually so designers and
// engineers can scan the system in one screen. Color swatches with hex,
// radii samples, shadow ladder, type ladder, motion demos.
//
// Wire-up: import this from `app/dev/design.tsx` (or any dev-only route)
// to expose it via Expo Router. Lives outside `app/` so it doesn't ship
// in production bundles.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  Canvas,
  Surface,
  Brand,
  PastelTokens,
  AccentTokens,
  Ink,
  Hairline,
  Semantic,
  SurfaceSemantic,
  Chart,
  Frost,
  Skeleton,
  ImageState,
  Backdrop,
  Type,
  Radius,
  Space,
  Motion,
  Card,
  Focus,
  Elevation,
} from '../constants/tokens';

interface SwatchProps {
  ns: string;
  label: string;
  value: string;
}

function Swatch({ ns, label, value }: SwatchProps) {
  return (
    <View testID={`swatch-${ns}-${label}`} style={swatchStyles.wrap}>
      <View style={[swatchStyles.chip, { backgroundColor: value }]} />
      <Text style={swatchStyles.label}>{label}</Text>
      <Text style={swatchStyles.value}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.section} testID={`section-${title}`}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

function SwatchList({ ns, tokens }: { ns: string; tokens: unknown }) {
  return (
    <>
      {flattenSwatches(tokens).map((s) => (
        <Swatch key={s.label} ns={ns} label={s.label} value={s.value} />
      ))}
    </>
  );
}

function flattenSwatches(obj: unknown, prefix = ''): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  if (typeof obj === 'string') {
    out.push({ label: prefix, value: obj });
    return out;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      out.push(...flattenSwatches(v, next));
    }
  }
  return out;
}

export default function DesignPlayground() {
  return (
    <ScrollView testID="design-playground" style={{ flex: 1, backgroundColor: Canvas.warmLight }}>
      <Text style={headerStyles.eyebrow}>Sazon design tokens</Text>
      <Text style={headerStyles.title}>The system, at a glance.</Text>

      <Section title="Canvas">
        <SwatchList ns="Canvas" tokens={Canvas} />
      </Section>

      <Section title="Surface">
        <SwatchList ns="Surface" tokens={Surface} />
      </Section>

      <Section title="Brand">
        <SwatchList ns="Brand" tokens={Brand} />
      </Section>

      <Section title="Pastel">
        <SwatchList ns="Pastel" tokens={PastelTokens} />
      </Section>

      <Section title="Accent">
        <SwatchList ns="Accent" tokens={AccentTokens} />
      </Section>

      <Section title="Ink">
        <SwatchList ns="Ink" tokens={Ink} />
      </Section>

      <Section title="Hairline">
        <SwatchList ns="Hairline" tokens={Hairline} />
      </Section>

      <Section title="Semantic">
        <SwatchList ns="Semantic" tokens={Semantic} />
      </Section>

      <Section title="SurfaceSemantic">
        <SwatchList ns="SurfaceSemantic" tokens={SurfaceSemantic} />
      </Section>

      <Section title="Chart">
        <SwatchList ns="Chart" tokens={Chart} />
      </Section>

      <Section title="Frost">
        <SwatchList ns="Frost" tokens={Frost} />
      </Section>

      <Section title="Skeleton">
        <SwatchList ns="Skeleton" tokens={Skeleton} />
      </Section>

      <Section title="ImageState">
        <SwatchList ns="ImageState" tokens={ImageState} />
      </Section>

      <Section title="Backdrop">
        <SwatchList ns="Backdrop" tokens={Backdrop} />
      </Section>

      {/* ─── Radii ladder ─────────────────────────────────────────────── */}
      <Section title="Radius">
        {Object.entries(Radius).map(([k, v]) => (
          <View key={k} testID={`radius-${k}`} style={swatchStyles.wrap}>
            <View
              style={{
                width: 56,
                height: 56,
                backgroundColor: Brand.light.soft,
                borderRadius: Math.min(v as number, 56),
              }}
            />
            <Text style={swatchStyles.label}>Radius.{k}</Text>
            <Text style={swatchStyles.value}>{String(v)}</Text>
          </View>
        ))}
      </Section>

      {/* ─── Space ladder ─────────────────────────────────────────────── */}
      <Section title="Space">
        {Object.entries(Space).map(([k, v]) => (
          <View key={k} testID={`space-${k}`} style={swatchStyles.wrap}>
            <View style={{ width: v as number, height: 16, backgroundColor: AccentTokens.sage }} />
            <Text style={swatchStyles.label}>Space[{k}]</Text>
            <Text style={swatchStyles.value}>{String(v)}px</Text>
          </View>
        ))}
      </Section>

      {/* ─── Type ladder ──────────────────────────────────────────────── */}
      <Section title="Type">
        {Object.entries(Type).map(([k, style]) => (
          <View key={k} testID={`type-${k}`} style={{ paddingVertical: Space['2'] }}>
            <Text style={[style, { color: Ink.light.primary }]}>Type.{k}</Text>
            <Text style={{ ...Type.caption, color: Ink.light.secondary }}>
              {(style as { fontSize?: number }).fontSize ?? '?'} px ·{' '}
              {(style as { fontFamily?: string }).fontFamily ?? '—'}
            </Text>
          </View>
        ))}
      </Section>

      {/* ─── Card density samples ─────────────────────────────────────── */}
      <Section title="Card density">
        {(['feed', 'hero', 'inline'] as const).map((density) => (
          <View
            key={density}
            testID={`card-density-${density}`}
            style={{
              backgroundColor: Surface.light.base,
              borderRadius: Radius.card,
              padding: Card.density[density].padding,
              marginBottom: Space['3'],
            }}
          >
            <Text style={{ ...Type.title, color: Ink.light.primary }}>density: {density}</Text>
            <View style={{ height: Card.density[density].gap }} />
            <Text style={{ ...Type.body, color: Ink.light.secondary }}>
              padding {Card.density[density].padding}, gap {Card.density[density].gap}
            </Text>
          </View>
        ))}
      </Section>

      {/* ─── Motion durations ─────────────────────────────────────────── */}
      <Section title="Motion">
        {Object.entries(Motion.duration).map(([k, v]) => (
          <View key={k} testID={`motion-duration-${k}`} style={swatchStyles.wrap}>
            <Text style={swatchStyles.label}>Motion.duration.{k}</Text>
            <Text style={swatchStyles.value}>{String(v)}ms</Text>
          </View>
        ))}
      </Section>

      <Section title="Focus">
        <Text testID="focus-ring-spec" style={{ ...Type.body, color: Ink.light.primary }}>
          Ring: {Focus.ring.width}px @ {Focus.ring.offset}px offset, +{Focus.ring.radiusBeyond}px radius.
        </Text>
        <Text testID="focus-highlight-spec" style={{ ...Type.body, color: Ink.light.primary }}>
          Highlight: {Math.round(Focus.highlight.opacity * 100)}% opacity, {Focus.highlight.durationMs}ms.
        </Text>
      </Section>

      <Section title="Elevation">
        {Object.entries(Elevation).map(([k]) => (
          <Text key={k} testID={`elevation-${k}`} style={{ ...Type.body, color: Ink.light.primary }}>
            Elevation.{k}
          </Text>
        ))}
      </Section>
    </ScrollView>
  );
}

const headerStyles = StyleSheet.create({
  eyebrow: { ...(Type.eyebrow as object), color: Brand.light.base, padding: Space['5'] },
  title: { ...(Type.heading as object), color: Ink.light.primary, paddingHorizontal: Space['5'], paddingBottom: Space['4'] },
});

const sectionStyles = StyleSheet.create({
  section: { paddingHorizontal: Space['5'], paddingBottom: Space['6'] },
  title: { ...(Type.subheading as object), color: Ink.light.primary, marginBottom: Space['3'] },
  body: { gap: Space['2'] },
});

const swatchStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: Space['3'], paddingVertical: Space['1'] },
  chip: { width: 56, height: 32, borderRadius: Radius.sm },
  label: { ...(Type.label as object), color: Ink.light.primary, minWidth: 200 },
  value: { ...(Type.caption as object), color: Ink.light.secondary, fontFamily: 'monospace' as never },
});
