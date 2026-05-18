import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface EditorialSectionHeaderProps {
  title: string;
  emoji?: string;
  count?: number;
  subtitle?: string;
  isDark: boolean;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
  rightSlot?: React.ReactNode;
}

function splitTitleForAccent(title: string): { lead: string; accent: string } {
  const trimmed = title.trim();
  const idx = trimmed.lastIndexOf(' ');
  if (idx === -1) return { lead: '', accent: trimmed };
  return { lead: trimmed.slice(0, idx), accent: trimmed.slice(idx + 1) };
}

export function EditorialSectionHeader({
  title,
  emoji,
  count,
  subtitle,
  isDark,
  collapsible = true,
  isCollapsed = false,
  onToggle,
  rightSlot,
}: EditorialSectionHeaderProps) {
  const { lead, accent } = splitTitleForAccent(title);
  // W-D1 — no-recipe-count law: never render "N recipes" under a section
  // header. Recipes are a like-signal store, not a countable catalog
  // (Claude-class tooling ⇒ unlimited on-demand recipes). `count` stays in
  // the prop API for callers/layout but is no longer surfaced; only an
  // explicit `subtitle` shows.
  void count;
  const meta = subtitle;

  const Inner = (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, isDark && styles.titleDark]} numberOfLines={2}>
            {lead}
            {lead ? ' ' : ''}
            <Text style={[styles.accent, isDark && styles.titleDark]}>{accent}</Text>
          </Text>
          {meta ? (
            <Text style={[styles.meta, isDark && styles.metaDark]}>{meta}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        {rightSlot}
        {collapsible ? (
          <Icon
            name={isCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP}
            size={IconSizes.SM}
            color={isDark ? '#9CA3AF' : '#6B7280'}
            accessibilityLabel={isCollapsed ? 'Expand section' : 'Collapse section'}
          />
        ) : null}
      </View>
    </View>
  );

  if (collapsible && onToggle) {
    return (
      <HapticTouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.container}>
        {Inner}
      </HapticTouchableOpacity>
    );
  }
  return <View style={styles.container}>{Inner}</View>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 22,
    marginRight: 8,
  },
  title: {
    ...EditorialTypography.sectionTitle,
    color: '#111827',
  },
  titleDark: {
    color: '#F9FAFB',
  },
  accent: {
    ...EditorialTypography.sectionAccent,
    color: '#111827',
  },
  meta: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#fa7e12',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  metaDark: {
    color: '#fa9e3a',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
});
