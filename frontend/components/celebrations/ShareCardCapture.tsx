// frontend/components/celebrations/ShareCardCapture.tsx
// Branded share card — captures a view as an image for social sharing
// Renders recipe photo + name + "Cooked with Sazon Chef" watermark + cook time badge

import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import { optimizedImageUrl } from '../../utils/imageUtils';

interface ShareCardCaptureProps {
  /** Recipe title */
  title: string;
  /** Recipe image URL */
  imageUrl?: string;
  /** Cook time in minutes */
  cookTime?: number;
  /** Calorie count */
  calories?: number;
  /** Protein in grams */
  protein?: number;
  /** Optional user photo URI (from camera) */
  userPhotoUri?: string;
}

const ShareCardCapture = forwardRef<ViewShot, ShareCardCaptureProps>(
  ({ title, imageUrl, cookTime, calories, protein, userPhotoUri }, ref) => {
    const displayImage = userPhotoUri || (imageUrl ? optimizedImageUrl(imageUrl) : null);

    return (
      <ViewShot
        ref={ref}
        options={{ format: 'png', quality: 0.95 }}
        style={styles.offscreen}
      >
        <View style={styles.card}>
          {/* Hero image */}
          {displayImage ? (
            <Image
              source={{ uri: displayImage }}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.placeholder]}>
              <Text style={styles.placeholderEmoji}>🌶️</Text>
            </View>
          )}

          {/* Gradient overlay on image */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          />

          {/* Cook time badge */}
          {cookTime && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⏱️ {cookTime} min</Text>
            </View>
          )}

          {/* Bottom info bar */}
          <View style={styles.infoBar}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {/* Macro pills */}
            {(calories || protein) && (
              <View style={styles.macroRow}>
                {calories ? (
                  <View style={styles.macroPill}>
                    <Text style={styles.macroText}>🔥 {calories} cal</Text>
                  </View>
                ) : null}
                {protein ? (
                  <View style={styles.macroPill}>
                    <Text style={styles.macroText}>🥩 {protein}g protein</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Watermark */}
            <View style={styles.watermark}>
              <Text style={styles.watermarkEmoji}>🌶️</Text>
              <Text style={styles.watermarkText}>Cooked with Sazon Chef</Text>
            </View>
          </View>
        </View>
      </ViewShot>
    );
  },
);

ShareCardCapture.displayName = 'ShareCardCapture';

export default ShareCardCapture;

const CARD_W = 360;
const CARD_H = 480;

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  heroImage: {
    width: CARD_W,
    height: CARD_H * 0.65,
  },
  placeholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CARD_H * 0.4,
    height: CARD_H * 0.25,
  },
  badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  infoBar: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    justifyContent: 'flex-end',
    backgroundColor: '#1C1C1E',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  macroPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  macroText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '500',
  },
  watermark: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
  },
  watermarkEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  watermarkText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
});
