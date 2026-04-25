import React from 'react';
import { View, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EditorialShadows } from '../../constants/Shadows';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

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

  return (
    <View testID="hero-block" style={styles.container}>
      <LinearGradient
        colors={['#FFF3E0', '#FFE5C8']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={styles.gradient}
      />
      {/* Decorative circles */}
      <View style={styles.decoCircle1} />
      <View style={styles.decoCircle2} />

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          testID="hero-back-button"
          onPress={onBack}
          style={styles.actionButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>
        <View style={styles.rightActions}>
          <Pressable
            testID="hero-share-button"
            onPress={onShare}
            style={styles.actionButton}
            accessibilityLabel="Share recipe"
            accessibilityRole="button"
          >
            <Ionicons name="share-outline" size={20} color="#111827" />
          </Pressable>
          <Pressable
            testID="hero-save-button"
            onPress={() => {
              triggerHaptic(ImpactStyle.LIGHT);
              onSave();
            }}
            style={styles.actionButton}
            accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'}
            accessibilityRole="button"
          >
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color="#111827" />
          </Pressable>
        </View>
      </View>

      {/* Circular plate photo */}
      {imageUrl && (
        <View style={[styles.plateContainer, plateShadow]}>
          <Image
            testID="plate-photo"
            source={{ uri: imageUrl }}
            style={styles.platePhoto}
          />
        </View>
      )}
      {!imageUrl && (
        <View
          testID="plate-photo"
          style={[styles.platePhoto, styles.platePlaceholder, plateShadow]}
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
    backgroundColor: 'rgba(255,183,77,0.15)',
  },
  decoCircle2: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,152,0,0.1)',
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
    backgroundColor: 'rgba(255,255,255,0.8)',
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
    borderColor: '#FFFFFF',
  },
  platePlaceholder: {
    backgroundColor: '#FFE5C8',
    position: 'absolute',
    bottom: -40,
    right: -50,
    zIndex: 20,
  },
});
