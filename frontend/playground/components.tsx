// frontend/playground/components.tsx
//
// ROADMAP 4.0 DS8.2 — component playground.
//
// Renders every variant of every primitive side-by-side so designers and
// engineers can spot drift, missing variants, and voice issues in 10 seconds.
// Sister page to playground/design.tsx (DS8.1) — that one ladders the
// tokens; this one ladders the components that consume them.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import BrandButton, { BrandButtonVariant } from '../components/ui/BrandButton';
import WidgetCard from '../components/ui/WidgetCard';
import StatusBadge from '../components/ui/StatusBadge';
import TypeText from '../components/ui/TypeText';
import {
  Canvas,
  Brand,
  PastelTokens,
  Ink,
  Type,
  Space,
  Radius,
} from '../constants/tokens';
import { MascotForState } from '../constants/MascotForState';

const BRAND_VARIANTS: BrandButtonVariant[] = [
  'brand',
  'sage',
  'golden',
  'lavender',
  'peach',
  'sky',
  'blush',
  'ghost',
];

const PASTEL_KEYS: Array<keyof typeof PastelTokens.light> = [
  'sage',
  'golden',
  'lavender',
  'peach',
  'sky',
  'blush',
  'orange',
  'red',
];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section} testID={`comp-section-${title}`}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, children, testID }: { label: string; children: React.ReactNode; testID?: string }) {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowChildren}>{children}</View>
    </View>
  );
}

export default function ComponentsPlayground() {
  return (
    <ScrollView testID="components-playground" style={{ flex: 1, backgroundColor: Canvas.warmLight }}>
      <Text style={styles.eyebrow}>Sazon component primitives</Text>
      <Text style={styles.title}>Every variant, side by side.</Text>

      {/* ─── BrandButton ────────────────────────────────────────────── */}
      <Section
        title="BrandButton"
        subtitle="DS7.2 — every variant sources its gradient from canonical tokens."
      >
        {BRAND_VARIANTS.map((variant) => (
          <Row key={`large-${variant}`} label={`large · ${variant}`} testID={`brand-large-${variant}`}>
            <BrandButton variant={variant} label="Save to Kitchen" onPress={() => {}} />
          </Row>
        ))}
        {BRAND_VARIANTS.map((variant) => (
          <Row key={`compact-${variant}`} label={`compact · ${variant}`} testID={`brand-compact-${variant}`}>
            <BrandButton variant={variant} size="compact" label="Save" onPress={() => {}} />
          </Row>
        ))}
        <Row label="loading state" testID="brand-loading">
          <BrandButton variant="brand" label="Saving…" loading onPress={() => {}} />
        </Row>
        <Row label="disabled state" testID="brand-disabled">
          <BrandButton variant="brand" label="Save" disabled onPress={() => {}} />
        </Row>
      </Section>

      {/* ─── WidgetCard ────────────────────────────────────────────── */}
      <Section
        title="WidgetCard"
        subtitle="DS7.4 — pastel-tinted stat cards for macros, profile, cooking stats."
      >
        {PASTEL_KEYS.map((key) => (
          <Row key={`widget-${key}`} label={`tint · ${key}`} testID={`widget-${key}`}>
            <View style={{ width: 180 }}>
              <WidgetCard
                tint={PastelTokens.light[key]}
                tintDark={PastelTokens.dark[key]}
                icon="🌶️"
                statValue={42}
                statUnit="g"
                label="Sample stat"
              />
            </View>
          </Row>
        ))}
        <Row label="with up-trend" testID="widget-up">
          <View style={{ width: 180 }}>
            <WidgetCard
              tint={PastelTokens.light.sage}
              tintDark={PastelTokens.dark.sage}
              icon="🌿"
              statValue="320"
              statUnit="kcal"
              label="Today"
              trend={{ value: '+12%', direction: 'up' }}
            />
          </View>
        </Row>
        <Row label="with down-trend" testID="widget-down">
          <View style={{ width: 180 }}>
            <WidgetCard
              tint={PastelTokens.light.blush}
              tintDark={PastelTokens.dark.blush}
              icon="🍰"
              statValue="18"
              statUnit="g"
              label="Sugar"
              trend={{ value: '-4%', direction: 'down' }}
            />
          </View>
        </Row>
      </Section>

      {/* ─── StatusBadge ──────────────────────────────────────────── */}
      <Section
        title="StatusBadge"
        subtitle="DS1.6 — semantic variants. patternMode adds a color-blind-friendly overlay."
      >
        {(['success', 'warning', 'error', 'info'] as const).map((variant) => (
          <Row key={`badge-${variant}`} label={variant} testID={`badge-${variant}`}>
            <StatusBadge variant={variant} label={`${variant[0].toUpperCase()}${variant.slice(1)}`} />
          </Row>
        ))}
        {(['success', 'warning', 'error', 'info'] as const).map((variant) => (
          <Row key={`badge-pattern-${variant}`} label={`${variant} · patternMode`} testID={`badge-pattern-${variant}`}>
            <StatusBadge variant={variant} label={variant} patternMode />
          </Row>
        ))}
      </Section>

      {/* ─── TypeText ─────────────────────────────────────────────── */}
      <Section
        title="TypeText"
        subtitle="DS4.6 — kind→Type token resolver. Numbers below show fontSize."
      >
        {(Object.keys(Type) as Array<keyof typeof Type>).map((kind) => (
          <Row
            key={`type-${kind}`}
            label={`${kind} · ${(Type[kind] as { fontSize?: number }).fontSize ?? '?'}px`}
            testID={`type-text-${kind}`}
          >
            <TypeText kind={kind}>The eater past the spreadsheet.</TypeText>
          </Row>
        ))}
      </Section>

      {/* ─── MascotForState ───────────────────────────────────────── */}
      <Section
        title="MascotForState"
        subtitle="DS4.7 — every UI state maps to one expression. Never sad/angry."
      >
        {(Object.keys(MascotForState) as Array<keyof typeof MascotForState>).map((state) => (
          <Row key={`mascot-${state}`} label={state} testID={`mascot-${state}`}>
            <View
              style={{
                paddingHorizontal: Space['3'],
                paddingVertical: Space['2'],
                backgroundColor: PastelTokens.light.peach,
                borderRadius: Radius.pill,
              }}
            >
              <Text style={{ ...Type.label, color: Brand.light.deep }}>
                → {MascotForState[state]}
              </Text>
            </View>
          </Row>
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...(Type.eyebrow as object), color: Brand.light.base, padding: Space['5'], paddingBottom: Space['1'] },
  title: { ...(Type.heading as object), color: Ink.light.primary, paddingHorizontal: Space['5'], paddingBottom: Space['4'] },
  section: { paddingHorizontal: Space['5'], paddingBottom: Space['8'] },
  sectionTitle: { ...(Type.subheading as object), color: Ink.light.primary, marginBottom: Space['1'] },
  sectionSubtitle: { ...(Type.body as object), color: Ink.light.secondary, marginBottom: Space['4'] },
  sectionBody: { gap: Space['3'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space['3'], paddingVertical: Space['1'] },
  rowLabel: { ...(Type.caption as object), color: Ink.light.secondary, minWidth: 160 },
  rowChildren: { flex: 1, alignItems: 'flex-start' },
});
