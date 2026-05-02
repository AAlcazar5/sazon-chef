import React from 'react';
import { View, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { EditorialShadows } from '../../constants/Shadows';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';
import { DarkColors, HeroPlatesDark } from '../../constants/Colors';

interface EditorialHeroBlockProps {
  imageUrl?: string;
  onBack: () => void;
  onShare: () => void;
  onSave: () => void;
  saved: boolean;
}

export function EditorialHeroBlock({ imageUrl, onBack, onShare, onSave, saved }: EditorialHeroBlockProps) {
  const plateShadow = Platform.select({
    ios: EditorialShadows.platePhoto.ios,
    android: EditorialShadows.platePhoto.android,
    default: {},
  });
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  // Recipe Detail uses the terracotta hero plate per COLORS.md
  const plate = HeroPlatesDark.orange;
  const heroGradient = isDark ? plate.bg : (['#FFF3E0', '#FFE5C8'] as const);
  const decoCircle1Bg = isDark ? 'rgba(255,212,166,0.12)' : 'rgba(255,183,77,0.15)';
  const decoCircle2Bg = isDark ? 'rgba(255,212,166,0.08)' : 'rgba(255,152,0,0.1)';
  const actionBtnBg = isDark ? 'rgba(26,20,16,0.6)' : 'rgba(255,255,255,0.8)';
  const actionIconColor = isDark ? DarkColors.text.primary : '#111827';
  const plateBorderColor = isDark ? plate.bg[0] : '#FFFFFF';
  const platePlaceholderBg = isDark ? plate.bg[1] : '#FFE5C8';

  return (
    <View testID="hero-block" style={styles.container}>
      <LinearGradient
        colors={heroGradient as unknown as [string, string]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={styles.gradient}
      />
      {/* Decorative circles */}
      <View style={[styles.decoCircle1, { backgroundColor: decoCircle1Bg }]} />
      <View style={[styles.decoCircle2, { backgroundColor: decoCircle2Bg }]} />

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          testID="hero-back-button"
          onPress={onBack}
          style={[styles.actionButton, { backgroundColor: actionBtnBg }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={actionIconColor} />
        </Pressable>
        <View style={styles.rightActions}>
          <Pressable
            testID="hero-share-button"
            onPress={onShare}
            style={[styles.actionButton, { backgroundColor: actionBtnBg }]}
            accessibilityLabel="Share recipe"
            accessibilityRole="button"
          >
            <Ionicons name="share-outline" size={20} color={actionIconColor} />
          </Pressable>
          <Pressable
            testID="hero-save-button"
            onPress={() => {
              triggerHaptic('impact', ImpactStyle.light);
              onSave();
            }}
            style={[styles.actionButton, { backgroundColor: actionBtnBg }]}
            accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'}
            accessibilityRole="button"
          >
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={actionIconColor} />
          </Pressable>
        </View>
      </View>

      {/* Circular plate photo */}
      {imageUrl && (
        <View style={[styles.plateContainer, plateShadow]}>
          <Image
            testID="plate-photo"
            source={{ uri: imageUrl }}
            style={[styles.platePhoto, { borderColor: plateBorderColor }]}
          />
        </View>
      )}
      {!imageUrl && (
        <View
          testID="plate-photo"
          style={[styles.platePhoto, styles.platePlaceholder, plateShadow, { backgroundColor: platePlaceholderBg, borderColor: plateBorderColor }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'visible',
    position: 'relative',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  decoCircle1: {
    position: 'absolute',
    top: 30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  decoCircle2: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    zIndex: 10,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateContainer: {
    position: 'absolute',
    bottom: -40,
    right: -50,
    zIndex: 20,
  },
  platePhoto: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 6,
  },
  platePlaceholder: {
    position: 'absolute',
    bottom: -40,
    right: -50,
    zIndex: 20,
  },
});
