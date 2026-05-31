// Tier Q — Beta feedback sheet.
//
// Captures free-text feedback + optional NPS from beta testers and POSTs
// to `/api/feedback`. Public route (works while signed out). Sazon-voice
// copy ("texting a friend" — no "Error:" / "Failed").

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import BottomSheet from '../ui/BottomSheet';
import { useTheme } from '../../contexts/ThemeContext';
import { Brand } from '../../constants/tokens';
import { Spacing } from '../../constants/Spacing';
import { submitFeedback } from '../../lib/api/feedback';
import { BUILD_CHANNEL, APP_VERSION } from '../../constants/build';

interface FeedbackSheetProps {
  visible: boolean;
  onClose: () => void;
  screen?: string;
}

const NPS_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function FeedbackSheet({ visible, onClose, screen }: FeedbackSheetProps) {
  const { isDark } = useTheme();
  const [message, setMessage] = useState('');
  const [nps, setNps] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent = isDark ? Brand.dark.base : Brand.light.base;
  const bodyColor = isDark ? '#F4EFEA' : '#1F1B17';
  const subColor = isDark ? '#B8B0A6' : '#665E54';

  const reset = () => {
    setMessage('');
    setNps(undefined);
    setSubmitting(false);
    setDone(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      setError('Add a quick note so we know what to look at.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback({ message: trimmed, screen, nps });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't send that just now — give it another try in a sec.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={done ? 'Got it — thanks!' : 'Send feedback to Sazon'}
      snapPoints={['70%']}
      scrollable
    >
      {done ? (
        <View style={styles.body}>
          <Text style={[styles.heading, { color: bodyColor }]}>
            Chef-kiss. Your note's in.
          </Text>
          <Text style={[styles.sub, { color: subColor }]}>
            We read every one. If something's broken we'll usually push a fix in
            the next build.
          </Text>
          <Pressable
            onPress={handleClose}
            style={[styles.primary, { backgroundColor: accent }]}
            accessibilityRole="button"
            accessibilityLabel="Close feedback sheet"
          >
            <Text style={styles.primaryLabel}>Close</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={[styles.sub, { color: subColor }]}>
            What worked? What annoyed you? What's missing? We read every one.
          </Text>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what's on your mind…"
            placeholderTextColor={subColor}
            multiline
            numberOfLines={6}
            maxLength={5000}
            style={[
              styles.input,
              {
                color: bodyColor,
                backgroundColor: isDark ? '#1F1B17' : '#FAF7F4',
              },
            ]}
            accessibilityLabel="Feedback message"
          />

          <Text style={[styles.label, { color: subColor }]}>
            Would you recommend Sazon? (optional)
          </Text>
          <View style={styles.npsRow}>
            {NPS_VALUES.map((v) => {
              const active = nps === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => setNps(active ? undefined : v)}
                  accessibilityRole="button"
                  accessibilityLabel={`NPS ${v}`}
                  style={[
                    styles.npsBtn,
                    {
                      backgroundColor: active ? accent : 'transparent',
                      borderColor: accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.npsLabel,
                      { color: active ? '#FFFFFF' : accent },
                    ]}
                  >
                    {v}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text style={[styles.error, { color: accent }]}>{error}</Text>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[
              styles.primary,
              { backgroundColor: accent, opacity: submitting ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send feedback"
          >
            <Text style={styles.primaryLabel}>
              {submitting ? 'Sending…' : 'Send to Sazon'}
            </Text>
          </Pressable>

          <Text style={[styles.meta, { color: subColor }]}>
            Build {APP_VERSION} · {BUILD_CHANNEL}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing?.lg ?? 16,
    paddingTop: Spacing?.md ?? 12,
    paddingBottom: 28,
    gap: 14,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    minHeight: 120,
    borderRadius: 20,
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  npsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  npsBtn: {
    minWidth: 36,
    height: 36,
    borderRadius: 100,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  npsLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  primary: {
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
  },
  meta: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.4,
  },
});
