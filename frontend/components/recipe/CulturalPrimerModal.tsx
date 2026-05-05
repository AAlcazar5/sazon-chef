// frontend/components/recipe/CulturalPrimerModal.tsx
// ROADMAP 4.0 Tier C10 frontend — Cultural primer modal.
//
// Fires when the user cooks a cuisine for the first time. Layers cultural
// narrative + nutritional angle in two visually distinct sections so the
// "why this dish" and "what it does for you" stories reinforce each other.

import React from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export interface CulturalPrimerContent {
  title: string;
  body: string;
  nutritionalAngle: string;
}

interface CulturalPrimerModalProps {
  visible: boolean;
  primer: CulturalPrimerContent | null;
  onDismiss: () => void;
}

export default function CulturalPrimerModal({
  visible,
  primer,
  onDismiss,
}: CulturalPrimerModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!visible || !primer) {
    return null;
  }

  const cardBg = isDark ? DarkColors.card : '#FFFFFF';
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View
          testID="cultural-primer-modal"
          accessibilityRole="alert"
          accessibilityLabel={`First time cooking — ${primer.title}`}
          style={[styles.card, { backgroundColor: cardBg }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.eyebrowBlock}>
              <Ionicons name="compass" size={14} color={Accent.peach} />
              <Text style={[styles.eyebrow, { color: Accent.peach }]}>FIRST TIME COOKING</Text>
            </View>
            <HapticTouchableOpacity
              testID="cultural-primer-close"
              onPress={onDismiss}
              accessibilityLabel="Close cultural primer"
              accessibilityRole="button"
              pressedScale={0.9}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={textSecondary} />
            </HapticTouchableOpacity>
          </View>

          <Text style={[styles.title, { color: textPrimary }]}>{primer.title}</Text>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View
              testID="cultural-primer-cultural-section"
              style={[styles.section, { backgroundColor: isDark ? PastelDark.peach : Pastel.peach }]}
            >
              <Text style={[styles.sectionEyebrow, { color: Accent.peach }]}>CULTURAL</Text>
              <Text style={[styles.sectionBody, { color: textPrimary }]}>{primer.body}</Text>
            </View>

            <View
              testID="cultural-primer-nutritional-section"
              style={[styles.section, { backgroundColor: isDark ? PastelDark.sage : Pastel.sage }]}
            >
              <Text style={[styles.sectionEyebrow, { color: Accent.sage }]}>NUTRITIONALLY</Text>
              <Text style={[styles.sectionBody, { color: textPrimary }]}>{primer.nutritionalAngle}</Text>
            </View>
          </ScrollView>

          <HapticTouchableOpacity
            testID="cultural-primer-acknowledge"
            onPress={onDismiss}
            accessibilityLabel="Got it"
            accessibilityRole="button"
            pressedScale={0.97}
            style={[styles.acknowledgeButton, { backgroundColor: '#111827' }]}
          >
            <Text style={styles.acknowledgeLabel}>Got it</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eyebrowBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  closeButton: {
    padding: 6,
    borderRadius: 100,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 14,
  },
  scrollContent: {
    gap: 12,
  },
  section: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 4,
  },
  sectionEyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  sectionBody: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  acknowledgeButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
  },
  acknowledgeLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
