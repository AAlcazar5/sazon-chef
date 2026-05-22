// frontend/components/voice/VoiceCoachQuickModal.tsx
//
// Y-Siri-1 (founder Telegram 2026-05-22, "voice activate sazon across the
// app like Siri"): generic voice → Sazon coach modal. Opens with the mic
// active, transcribes live, on submit navigates to /(tabs)/coach with the
// spoken text as `seedMessage` — the wedge fires if it parses as a recipe
// ask, otherwise the coach answers normally.
//
// Distinct from `VoiceComposerModal` which routes utterances to
// /build-a-plate via /api/composed-plates/from-utterance — that's
// Build-a-Plate-specific. This one is the catch-all "talk to Sazon"
// modal accessible from every tab.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import BrandButton from '../ui/BrandButton';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Sazon, { expressionToSazon } from '../mascot/Sazon';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';

interface VoiceCoachQuickModalProps {
  visible: boolean;
  onClose: () => void;
  /** Hidden context hint forwarded with the seed so coach knows which
   *  surface the user came from (e.g. "kitchen" / "week" / "profile").
   *  Not displayed to the user. */
  originScreen?: string;
}

export default function VoiceCoachQuickModal({
  visible,
  onClose,
  originScreen,
}: VoiceCoachQuickModalProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const voice = useVoiceInput({
    continuous: false,
    onIntent: (intent) => {
      if (intent.rawText) setText(intent.rawText);
    },
  });

  const { startListening, stopListening, interimTranscript } = voice;

  // Auto-start listening when the modal opens. Mirrors VoiceComposerModal's
  // pattern — the user opened a VOICE modal, they expect mic-on immediately.
  useEffect(() => {
    if (!visible) return;
    setText('');
    setSubmitting(false);
    void startListening();
    return () => {
      stopListening();
    };
  }, [visible, startListening, stopListening]);

  const handleClose = useCallback(() => {
    stopListening();
    onClose();
  }, [stopListening, onClose]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed || submitting) return;
    setSubmitting(true);
    stopListening();
    onClose();
    // Route to coach with the spoken text as seedMessage. The coach tab's
    // seedMessage handler (extended in this PR) auto-creates a conversation
    // when no convId is supplied and fires the message immediately. The
    // wedge runs on the seed inside coach — if it's a recipe ask it
    // shortcuts to the Cooking Mode card; otherwise the LLM responds.
    router.push({
      pathname: '/(tabs)/coach',
      params: originScreen
        ? { seedMessage: trimmed, originScreen }
        : { seedMessage: trimmed },
    } as never);
    setText('');
  }, [text, submitting, stopListening, onClose, router, originScreen]);

  if (!visible) return null;

  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
  const sazonConfig = expressionToSazon('thinking');
  const displayText = text.length > 0 ? text : interimTranscript;
  const accent = '#FB923C';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.sheet, { backgroundColor: isDark ? '#1C1C1E' : '#FAF7F4' }]}
          accessibilityLabel="Voice to Sazon"
          testID="voice-coach-quick-modal"
        >
          <View style={styles.headerRow}>
            <View style={styles.mascotWrap} testID="voice-coach-mascot">
              <Sazon
                variant={sazonConfig.variant}
                motion={sazonConfig.motion}
                fx={sazonConfig.fx}
                size={56}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[EditorialTypography.eyebrow, { color: Accent.sage }]}>
                TALK TO SAZON
              </Text>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: titleColor }]}>I'm </Text>
                <Text style={[styles.titleItalic, { color: titleColor }]}>listening</Text>
                <Text style={[styles.titlePeriod, { color: accent }]}>…</Text>
              </View>
              <Text style={[styles.subtitle, { color: subtitleColor }]}>
                Ask for a recipe, riff on tonight's plate, or just chat.
              </Text>
            </View>
            <HapticTouchableOpacity
              onPress={handleClose}
              accessibilityLabel="Close voice modal"
              testID="voice-coach-close"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={subtitleColor} />
            </HapticTouchableOpacity>
          </View>

          <TextInput
            value={displayText}
            onChangeText={setText}
            placeholder="Or type to Sazon (e.g. sushi recipe)"
            placeholderTextColor={subtitleColor}
            maxLength={500}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#2A2A2C' : Pastel.sage,
                color: titleColor,
              },
            ]}
            multiline
            accessibilityLabel="Voice transcript"
            testID="voice-coach-input"
          />

          <View style={styles.actionRow}>
            <BrandButton
              variant="brand"
              label={submitting ? 'Sending…' : 'Send to Sazon'}
              onPress={handleSubmit}
              disabled={submitting || displayText.trim().length === 0}
              accessibilityLabel="Send voice message to Sazon"
              testID="voice-coach-submit"
            />
          </View>
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
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopLeftRadius: BorderRadius.sheet,
    borderTopRightRadius: BorderRadius.sheet,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  mascotWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
  },
  titleItalic: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    fontStyle: 'italic',
  },
  titlePeriod: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 80,
    maxHeight: 140,
    borderRadius: BorderRadius.card,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  actionRow: {
    marginTop: 16,
    alignItems: 'stretch',
  },
});
