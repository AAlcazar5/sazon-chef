import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import FrostedHeader from '../ui/FrostedHeader';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { LogoMascot } from '../mascot';
import Sazon from '../mascot/Sazon';
import { EditorialFontFamily } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';
import { Colors, DarkColors } from '../../constants/Colors';

interface HomeHeaderProps {
  onMascotPress?: () => void;
  onSurpriseMe?: () => void;
  onFilterPress?: () => void;
  activeFilterCount?: number;
}

const SPRING = { damping: 8, stiffness: 300 };

export default function HomeHeader({
  onMascotPress,
  onSurpriseMe,
  onFilterPress,
  activeFilterCount = 0,
}: HomeHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const titleColor = isDark ? DarkColors.text.primary : '#111827';
  const badgeScale = useSharedValue(1);
  const badgeRotation = useSharedValue(0);

  useEffect(() => {
    badgeScale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 400 }),
      withSpring(1, SPRING),
    );
    badgeRotation.value = withSequence(
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }, [activeFilterCount]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }, { rotate: `${badgeRotation.value}deg` }],
  }));

  return (
    <FrostedHeader paddingBottom={14} withTopInset>
      <View style={styles.row}>
        {/* Left: logo + title */}
        <HapticTouchableOpacity onPress={onMascotPress} activeOpacity={0.8} style={styles.titleRow}>
          <Sazon variant="orange" motion="idle" size={36} />
          <Text style={[styles.title, { color: titleColor }]} accessibilityRole="header">
            Sazon <Text style={[styles.titleAccent, { color: titleColor }]}>Chef</Text>
          </Text>
        </HapticTouchableOpacity>

        {/* Right: buttons */}
        <View style={styles.actions}>
          {onSurpriseMe && (
            <HapticTouchableOpacity
              onPress={() => { onSurpriseMe(); HapticPatterns.buttonPress(); }}
              accessibilityLabel="Surprise Me"
              accessibilityRole="button"
              style={{ borderRadius: 100, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#A78BFA', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pill}
              >
                <Text style={styles.pillEmoji}>🎰</Text>
                <Text style={styles.pillLabel}>Surprise Me</Text>
              </LinearGradient>
            </HapticTouchableOpacity>
          )}

          {onFilterPress && (
            <View style={{ position: 'relative' }}>
              <HapticTouchableOpacity
                onPress={() => { onFilterPress(); HapticPatterns.buttonPress(); }}
                accessibilityLabel={`Filters, ${activeFilterCount} active`}
                accessibilityRole="button"
                style={{ borderRadius: 100, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={['#FF8B41', '#E84D3D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pill}
                >
                  <Ionicons name="options" size={14} color="#FFF" />
                  <Text style={styles.pillLabel}>
                    Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                  </Text>
                </LinearGradient>
              </HapticTouchableOpacity>
              {activeFilterCount > 0 && (
                <Animated.View style={[styles.badge, badgeAnimStyle]} />
              )}
            </View>
          )}
        </View>
      </View>
    </FrostedHeader>
  );
}

const TITLE_SIZE = 36;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.04,
    letterSpacing: -1.6,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 6,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#FFF',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#111827',
  },
});
