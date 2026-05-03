// frontend/components/home/VoiceComposerModal.tsx
// Group 10X Phase 7 — voice composer modal triggered by long-pressing the home tab.
// Uses the existing useVoiceInput hook (expo-speech-recognition) for STT and falls
// back to a free-text input when the native module isn't available (Expo Go).
// On submit, calls POST /api/composed-plates/from-utterance and opens the composer
// with the inferred plate id.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import BrandButton from '../ui/BrandButton';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Sazon, { expressionToSazon } from '../mascot/Sazon';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { composedPlateApi } from '../../lib/api';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Ionicons } from '@expo/vector-icons';

interface VoiceComposerModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function VoiceComposerModal({
  visible,
  onClose,
}: VoiceComposerModalProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const voice = useVoiceInput({
    continuous: false,
    onIntent: (intent) => {
      if (intent.rawText) {
        setText(intent.rawText);
      }
    },
  });

  // Destructure stable primitives from voice so the dep arrays below don't thrash
  // (useVoiceInput returns a fresh object on every render).
  const { interimTranscript, transcript, startListening, stopListening } = voice;

  // Auto-start listening when the modal opens (if available).
  useEffect(() => {
    if (!visible) return;
    void startListening();
    // Only depend on visibility so we don't restart mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Mirror live interim transcript into the text input field for visibility.
  useEffect(() => {
    if (interimTranscript) {
      setText(interimTranscript);
    } else if (transcript) {
      setText(transcript);
    }
  }, [interimTranscript, transcript]);

  const handleClose = useCallback(() => {
    stopListening();
    setText('');
    setErrorMsg(null);
    onClose();
  }, [stopListening, onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    stopListening();
    try {
      const res = await composedPlateApi.composeFromUtterance(trimmed);
      const composedId = res.data?.plate?.id;
      if (composedId) {
        setText('');
        onClose();
        router.push({
          pathname: '/build-a-plate',
          params: { plateId: composedId },
        });
      } else {
        setErrorMsg("Sazon couldn't plate that yet — try a different way of saying it.");
      }
    } catch {
      setErrorMsg("Couldn't reach Sazon — check your connection and tap again.");
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, stopListening, router, onClose]);

  if (!visible) return null;

  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
  const sazonConfig = expressionToSazon('thinking');
  const accentOrange = '#FB923C';

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
          accessibilityLabel="Voice composer"
          testID="voice-composer-modal"
        >
          <View style={styles.headerRow}>
            <View style={styles.mascotWrap} testID="sazon-thinking">
              <Sazon
                variant={sazonConfig.variant}
                motion={sazonConfig.motion}
                fx={sazonConfig.fx}
                size={56}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[EditorialTypography.eyebrow, { color: Accent.sage }]}>
                COMPOSE BY VOICE
              </Text>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: titleColor }]}>
                  Listening for your{' '}
                </Text>
                <Text style={[styles.titleItalic, { color: titleColor }]}>plate</Text>
                <Text style={[styles.titlePeriod, { color: accentOrange }]}>…</Text>
              </View>
              <Text style={[styles.subtitle, { color: subtitleColor }]}>
                Say what you're craving — protein, base, veg, sauce. I'll fill the slots.
              </Text>
            </View>
            <HapticTouchableOpacity
              onPress={handleClose}
              accessibilityLabel="Close voice composer"
              testID="voice-composer-close"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={subtitleColor} />
            </HapticTouchableOpacity>
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type your plate (e.g. salmon farro carrots yogurt)"
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
            accessibilityLabel="Plate utterance input"
            testID="voice-composer-input"
          />

          {errorMsg ? (
            <Text
              style={[styles.errorMsg, { color: isDark ? '#FCA5A5' : '#B45309' }]}
              accessibilityLiveRegion="polite"
              testID="voice-composer-error"
            >
              {errorMsg}
            </Text>
          ) : null}

          <BrandButton
            label="Build my plate"
            variant="sage"
            onPress={handleSubmit}
            disabled={!text.trim() || submitting}
            accessibilityLabel="Build the plate from this utterance"
            testID="voice-composer-submit"
            style={styles.submit}
          />
        </View>
      </View>
    </Modal>
  );
}

const sheetShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  android: { elevation: 18 },
  default: {},
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 16,
    ...sheetShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mascotWrap: {
    width: 56,
    height: 56,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  titleItalic: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  titlePeriod: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderRadius: BorderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 84,
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  submit: {
    alignSelf: 'flex-start',
  },
  errorMsg: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
