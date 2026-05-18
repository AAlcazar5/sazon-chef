// frontend/components/cook/LogAClaudeCookSheet.tsx
//
// W-D Phase 1 / D-6 — "Cooked with help elsewhere? Log it." The literal
// §9a complement-Claude surface: ingest a cook the user did outside Sazon
// so the memory still accumulates. Invisible-AI (§9c): copy never names
// "AI"/"Claude" — it's "with help elsewhere". ≤2 taps.
import React, { useState } from 'react';
import { View, Text, Modal, TextInput, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Brand, PastelTokens } from '../../constants/tokens';
import { cookApi } from '../../lib/api/cook';

interface LogAClaudeCookSheetProps {
  visible: boolean;
  onClose: () => void;
  onLogged?: () => void;
}

export default function LogAClaudeCookSheet({
  visible,
  onClose,
  onLogged,
}: LogAClaudeCookSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setHint(null);
    try {
      await cookApi.logCookEvent({
        type: 'made_it',
        payload: {
          source: 'elsewhere',
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
      setNote('');
      onLogged?.();
      onClose();
    } catch {
      // Sazon voice, never "Error:" / raw codes.
      setHint("Hmm, that didn't save — give it another tap in a sec.");
    } finally {
      setSubmitting(false);
    }
  };

  const accent = isDark ? Brand.dark.base : Brand.light.base;
  const surface = isDark ? PastelTokens.dark.peach : PastelTokens.light.peach;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[styles.sheet, { backgroundColor: isDark ? '#1F2937' : '#FFF7F0' }]}
          accessibilityViewIsModal
        >
          <Text style={[styles.title, isDark && styles.titleDark]}>
            Cooked with help elsewhere?
          </Text>
          <Text style={styles.subtitle}>
            Log it so Sazon still learns how you cook — your kitchen keeps
            getting to know you.
          </Text>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional: what did you make?"
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            style={[styles.input, { backgroundColor: surface }]}
            accessibilityLabel="Optional note about what you cooked"
            editable={!submitting}
          />

          {hint ? <Text style={styles.hint}>{hint}</Text> : null}

          <HapticTouchableOpacity
            onPress={submit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Log this cook"
            style={[styles.primary, { backgroundColor: accent }, submitting && styles.primaryDisabled]}
          >
            <Text style={styles.primaryText}>
              {submitting ? 'Logging…' : 'Log this cook'}
            </Text>
          </HapticTouchableOpacity>

          <HapticTouchableOpacity
            onPress={onClose}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.cancel}
          >
            <Text style={[styles.cancelText, { color: accent }]}>Not now</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  titleDark: { color: '#F9FAFB' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 6, marginBottom: 16 },
  input: { borderRadius: 16, padding: 14, fontSize: 15, color: '#1F2937' },
  hint: { fontSize: 13, color: '#B45309', marginTop: 10 },
  primary: {
    marginTop: 18,
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cancel: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 14, fontWeight: '600' },
});
