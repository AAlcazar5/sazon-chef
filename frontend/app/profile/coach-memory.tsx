// Phase 6 (10Y-C): Sazon coach memory — Pro-only screen showing what Sazon
// has learned about this user. Edit/delete each note. Free users see an upsell.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AnimatedLogoMascot from '../../components/mascot/AnimatedLogoMascot';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import BrandButton from '../../components/ui/BrandButton';
import CoachPaywallSheet from '../../components/coach/CoachPaywallSheet';
import { coachApi, type CoachMemory, type CoachMemoryKind } from '../../lib/api';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

const KIND_ORDER: CoachMemoryKind[] = [
  'preference',
  'goal',
  'constraint',
  'milestone',
];

const KIND_LABELS: Record<CoachMemoryKind, string> = {
  preference: 'Preferences',
  goal: 'Goals',
  constraint: 'Constraints',
  milestone: 'Milestones',
};

const MAX_CONTENT_LEN = 280;

export default function CoachMemoryScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { subscription } = useSubscription();
  const isPro =
    subscription.isPremium === true && subscription.tier === 'premium';

  const [memories, setMemories] = useState<CoachMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CoachMemory | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(!isPro);

  useEffect(() => {
    if (!isPro) {
      setLoading(false);
      setPaywallOpen(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await coachApi.listMemories();
        if (!cancelled) setMemories(list);
      } catch {
        if (!cancelled) setMemories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPro]);

  const grouped = useMemo(() => {
    const out: Record<CoachMemoryKind, CoachMemory[]> = {
      preference: [],
      goal: [],
      constraint: [],
      milestone: [],
    };
    for (const m of memories) {
      const kind: CoachMemoryKind = KIND_ORDER.includes(m.kind)
        ? m.kind
        : 'preference';
      out[kind] = [...out[kind], m];
    }
    return out;
  }, [memories]);

  const handleEdit = useCallback((m: CoachMemory) => {
    setEditing(m);
    setEditText(m.content);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editing) return;
    const trimmed = editText.trim();
    if (!trimmed || trimmed === editing.content) {
      setEditing(null);
      return;
    }
    setSaving(true);
    try {
      const updated = await coachApi.updateMemory(editing.id, {
        content: trimmed.slice(0, MAX_CONTENT_LEN),
      });
      setMemories((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      setEditing(null);
    } catch {
      Alert.alert(
        'Could not save',
        "Sazon couldn't update that note. Try again in a moment.",
      );
    } finally {
      setSaving(false);
    }
  }, [editing, editText]);

  const handleDelete = useCallback((m: CoachMemory) => {
    Alert.alert('Forget this note?', `"${m.content}"`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Forget',
        style: 'destructive',
        onPress: async () => {
          try {
            await coachApi.deleteMemory(m.id);
            setMemories((prev) => prev.filter((x) => x.id !== m.id));
          } catch {
            Alert.alert(
              'Could not delete',
              "Sazon couldn't forget that one. Try again.",
            );
          }
        },
      },
    ]);
  }, []);

  const screenBg = isDark ? DarkColors.background : '#FAF7F4';
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const cardBg = isDark ? DarkColors.surface : '#FFFFFF';

  return (
    <View style={[styles.flex, { backgroundColor: screenBg }]}>
      <View style={[styles.header, { backgroundColor: screenBg }]}>
        <HapticTouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Back to profile"
          accessibilityRole="button"
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={24} color={text} />
        </HapticTouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
            {isPro
              ? 'Sazon remembers'
              : "Sazon's memory is a Pro feature."}
          </Text>
          {isPro && (
            <Text
              style={[styles.headerSub, { color: subtle }]}
              numberOfLines={2}
            >
              What Sazon's learned about your kitchen, taste, and goals. Edit
              anything that's wrong.
            </Text>
          )}
        </View>
        <View style={styles.headerBtn} />
      </View>

      {!isPro ? (
        <View style={styles.upsellWrap}>
          <View
            style={[
              styles.upsellCard,
              Shadows.SM as object,
              {
                backgroundColor: isDark ? PastelDark.lavender : Pastel.lavender,
              },
            ]}
            accessibilityLabel="Pro feature card"
          >
            <Ionicons
              name="sparkles"
              size={28}
              color={isDark ? '#fff' : '#5E35B1'}
            />
            <Text style={[styles.upsellTitle, { color: text }]}>
              Pro Coach remembers what works.
            </Text>
            <Text style={[styles.upsellBody, { color: subtle }]}>
              Free Coach starts fresh every chat. Pro keeps a private set of
              notes — preferences, goals, constraints — and uses them in every
              recommendation.
            </Text>
            <BrandButton
              label="See what Pro unlocks"
              variant="lavender"
              onPress={() => setPaywallOpen(true)}
              icon="star"
              accessibilityLabel="Open Pro upgrade sheet"
            />
          </View>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <AnimatedLogoMascot expression="thinking" size="medium" />
          <Text style={[styles.loadingText, { color: subtle }]}>
            Loading conversations…
          </Text>
        </View>
      ) : memories.length === 0 ? (
        <AnimatedEmptyState
          useMascot
          mascotExpression="curious"
          mascotSize="large"
          title="Nothing learned yet"
          description="Coach hasn't picked up your patterns yet — keep chatting and Sazon will start to remember the things that matter to you."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listPad}>
          {KIND_ORDER.map((kind) => {
            const rows = grouped[kind];
            if (rows.length === 0) return null;
            return (
              <View key={kind} style={styles.group}>
                <Text style={[styles.groupTitle, { color: subtle }]}>
                  {KIND_LABELS[kind]}
                </Text>
                {rows.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.row,
                      Shadows.SM as object,
                      { backgroundColor: cardBg },
                    ]}
                    accessibilityLabel={`Memory: ${m.content}`}
                  >
                    <View style={styles.rowMain}>
                      <Text style={[styles.rowText, { color: text }]}>
                        {m.content}
                      </Text>
                      <View style={styles.rowMeta}>
                        <View
                          style={[
                            styles.confidencePill,
                            {
                              backgroundColor: isDark
                                ? PastelDark.sage
                                : Pastel.sage,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.confidenceText,
                              { color: isDark ? '#A5D6A7' : '#1B5E20' },
                            ]}
                          >
                            {Math.round((m.confidence ?? 0) * 100)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.rowActions}>
                      <HapticTouchableOpacity
                        onPress={() => handleEdit(m)}
                        accessibilityLabel={`Edit memory: ${m.content}`}
                        accessibilityRole="button"
                        style={styles.iconBtn}
                      >
                        <Ionicons name="pencil" size={18} color={subtle} />
                      </HapticTouchableOpacity>
                      <HapticTouchableOpacity
                        onPress={() => handleDelete(m)}
                        accessibilityLabel={`Delete memory: ${m.content}`}
                        accessibilityRole="button"
                        style={styles.iconBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color={subtle} />
                      </HapticTouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      <CoachPaywallSheet
        visible={paywallOpen}
        reason="memory"
        onClose={() => {
          setPaywallOpen(false);
          if (!isPro) router.back();
        }}
      />

      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.editSheet,
              Shadows.MD as object,
              { backgroundColor: cardBg },
            ]}
          >
            <Text style={[styles.editTitle, { color: text }]}>Edit memory</Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="What should Sazon remember?"
              placeholderTextColor={subtle}
              multiline
              maxLength={MAX_CONTENT_LEN}
              accessibilityLabel="Memory content"
              style={[
                styles.editInput,
                {
                  color: text,
                  backgroundColor: isDark
                    ? DarkColors.surfaceTint
                    : '#F5F1EC',
                },
              ]}
            />
            <Text style={[styles.editCount, { color: subtle }]}>
              {editText.length}/{MAX_CONTENT_LEN}
            </Text>
            <View style={styles.editActions}>
              <HapticTouchableOpacity
                onPress={() => setEditing(null)}
                accessibilityLabel="Cancel edit"
                accessibilityRole="button"
                style={styles.cancelBtn}
              >
                <Text style={[styles.cancelText, { color: subtle }]}>
                  Cancel
                </Text>
              </HapticTouchableOpacity>
              <BrandButton
                label={saving ? 'Saving…' : 'Save'}
                variant="brand"
                size="compact"
                onPress={handleSaveEdit}
                disabled={saving || editText.trim().length === 0}
                accessibilityLabel="Save memory"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 12,
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    paddingTop: 4,
    gap: 6,
  },
  headerTitle: {
    fontFamily: Platform.select({
      ios: 'Fraunces_700Bold',
      default: 'Fraunces_700Bold',
    }),
    fontSize: 22,
    lineHeight: 28,
  },
  headerSub: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_500Medium',
      default: 'PlusJakartaSans_500Medium',
    }),
    fontSize: 13,
    lineHeight: 18,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  upsellWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  upsellCard: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  upsellTitle: {
    fontFamily: Platform.select({
      ios: 'Fraunces_700Bold',
      default: 'Fraunces_700Bold',
    }),
    fontSize: 18,
  },
  upsellBody: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_500Medium',
      default: 'PlusJakartaSans_500Medium',
    }),
    fontSize: 14,
    lineHeight: 20,
  },
  listPad: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 18,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_600SemiBold',
      default: 'PlusJakartaSans_600SemiBold',
    }),
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 20,
    padding: 14,
    gap: 8,
  },
  rowMain: {
    flex: 1,
    gap: 6,
  },
  rowText: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_500Medium',
      default: 'PlusJakartaSans_500Medium',
    }),
    fontSize: 15,
    lineHeight: 21,
  },
  rowMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  confidencePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  confidenceText: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_600SemiBold',
      default: 'PlusJakartaSans_600SemiBold',
    }),
    fontSize: 11,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  editSheet: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  editTitle: {
    fontFamily: Platform.select({
      ios: 'Fraunces_700Bold',
      default: 'Fraunces_700Bold',
    }),
    fontSize: 18,
  },
  editInput: {
    minHeight: 100,
    borderRadius: 16,
    padding: 12,
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_500Medium',
      default: 'PlusJakartaSans_500Medium',
    }),
    fontSize: 15,
    textAlignVertical: 'top',
  },
  editCount: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_500Medium',
      default: 'PlusJakartaSans_500Medium',
    }),
    fontSize: 12,
    textAlign: 'right',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_600SemiBold',
      default: 'PlusJakartaSans_600SemiBold',
    }),
    fontSize: 14,
  },
});
