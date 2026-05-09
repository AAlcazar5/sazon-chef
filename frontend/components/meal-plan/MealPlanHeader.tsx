import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import FrostedHeader from '../ui/FrostedHeader';
import ShopThisWeekPill from './ShopThisWeekPill';
import ProfileAvatarButton from '../profile/ProfileAvatarButton';
import Sazon from '../mascot/Sazon';
import { Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { Space } from '../../constants/tokens';

interface MealPlanHeaderProps {
  /** @deprecated — date range now anchors to the Weekly Meal Plan section header. */
  dateRange?: string;
  isSelectedDateToday: boolean;
  isDark: boolean;
  onJumpToToday: () => void;
  /** ROADMAP 4.0 A2-b — count of missing-from-pantry items for this week's plan. 0 hides the Shop pill. */
  missingShopCount?: number;
  /** ROADMAP 4.0 A2-b — opens the in-store shopping flow (or the active list while in-store mode is being wired). */
  onShopThisWeek?: () => void;
  /** ROADMAP 4.0 A2-a — auto-generated cuisine theme line shown under the title (e.g. "Mediterranean"). Empty hides. */
  weekTheme?: string;
}

export default function MealPlanHeader({
  isSelectedDateToday,
  isDark,
  onJumpToToday,
  missingShopCount = 0,
  onShopThisWeek,
  weekTheme,
}: MealPlanHeaderProps) {
  return (
    <FrostedHeader paddingBottom={14} withTopInset>
      <View style={styles.headerStack}>
      <View style={styles.headerRow}>
        {/* Editorial title — Sazon logo + "This Week". The date range now
            anchors to the Weekly Meal Plan section header instead of riding
            the title (which keeps the chrome compact + matches HomeHeader). */}
        <View style={styles.titleBlock}>
          <Sazon variant="orange" motion="idle" size={36} />
          <Text
            style={[styles.title, { color: isDark ? DarkColors.text.primary : '#111827' }]}
            accessibilityRole="header"
          >
            This{' '}
            <Text style={[styles.titleAccent, { color: isDark ? DarkColors.text.primary : '#111827' }]}>
              Week
            </Text>
          </Text>
        </View>

        {/* Header-right action cluster: Shop pill + Today jump + Profile avatar */}
        <View style={styles.actionCluster}>
          {onShopThisWeek && missingShopCount > 0 && (
            <ShopThisWeekPill missingCount={missingShopCount} onPress={onShopThisWeek} />
          )}
          <ProfileAvatarButton size={36} />
          {!isSelectedDateToday && (
            <HapticTouchableOpacity
              onPress={onJumpToToday}
              style={[
                styles.todayButton,
                { backgroundColor: isDark ? `${Colors.primary}33` : Colors.primaryLight },
              ]}
              accessibilityLabel="Jump to today"
              accessibilityRole="button"
            >
              <Text style={[styles.todayLabel, { color: isDark ? DarkColors.primary : Colors.primary }]}>
                Today
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>
      </View>
        {weekTheme && weekTheme.length > 0 && (
          <Text
            testID="meal-plan-week-theme"
            style={[styles.weekTheme, { color: isDark ? DarkColors.text.secondary : '#6B7280' }]}
            numberOfLines={2}
          >
            This week, your kitchen is leaning <Text style={styles.weekThemeAccent}>{weekTheme}</Text>.
          </Text>
        )}
      </View>
    </FrostedHeader>
  );
}

const TITLE_SIZE = 36;

const styles = StyleSheet.create({
  headerStack: {
    flexDirection: 'column',
    paddingHorizontal: Space['5'],
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekTheme: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  weekThemeAccent: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontStyle: 'italic',
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space['2'],
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.04,
    letterSpacing: -1.6,
    flexShrink: 0,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.6,
  },
  actionCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
});
