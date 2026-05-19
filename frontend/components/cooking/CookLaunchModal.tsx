// frontend/components/cooking/CookLaunchModal.tsx
//
// Tier Y-4 — Surface 2 of the Cooking Mode replica (screenshot #5). The
// full-screen launch/preview shown after "Get cooking": collage + title +
// description + "N steps" + Start cooking, with a close affordance.
// Presentational — the caller wires Start cooking to the existing
// app/cooking.tsx player route.

import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Brand, Type, Radius } from '../../constants/tokens';

interface CookLaunchModalProps {
  visible: boolean;
  title: string;
  description: string;
  imageUrls?: string[];
  stepCount: number;
  onStartCooking: () => void;
  onClose: () => void;
}

export default function CookLaunchModal({
  visible,
  title,
  description,
  imageUrls,
  stepCount,
  onStartCooking,
  onClose,
}: CookLaunchModalProps) {
  const { theme } = useTheme();
  const accent = theme === 'dark' ? Brand.dark.base : Brand.light.base;

  if (!visible) return null;

  const images = (imageUrls ?? []).slice(0, 3);
  const stepLabel = `${stepCount} step${stepCount === 1 ? '' : 's'}`;

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.screen}>
        <HapticTouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          pressedScale={0.97}
          style={styles.close}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </HapticTouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
          {images.length > 0 ? (
            <View style={styles.collage}>
              {images.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.thumb} />
              ))}
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>
          <Text style={styles.steps}>{stepLabel}</Text>

          <HapticTouchableOpacity
            onPress={onStartCooking}
            accessibilityRole="button"
            accessibilityLabel="Start cooking"
            pressedScale={0.97}
            style={[styles.start, { backgroundColor: accent }]}
          >
            <Text style={styles.startText}>Start cooking</Text>
          </HapticTouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1A1A1A' },
  close: { position: 'absolute', top: 44, right: 20, zIndex: 2, padding: 6 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 14 },
  collage: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  thumb: { flex: 1, height: 180, borderRadius: Radius.card },
  title: { ...Type.headingLg, color: '#FFFFFF' },
  desc: { ...Type.bodyLg, color: '#D1D5DB' },
  steps: { ...Type.label, color: '#9CA3AF', marginTop: 4 },
  start: {
    alignSelf: 'flex-start',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: Radius.pill,
    marginTop: 18,
  },
  startText: { ...Type.label, color: '#FFFFFF' },
});
