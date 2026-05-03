// frontend/app/(tabs)/coach.tsx
// 10Y-B: Sazon Coach chat surface. Two views in one screen:
//   1) Thread list (default, no conversation selected)
//   2) Active conversation (header + bubbles + composer + streaming)
// Free-tier text-only. Photo attachments + tool cards land in later phases.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import { MessageBubble, QuickStartChips } from '../../components/coach';
import { useCoachStream } from '../../hooks/useCoachStream';
import { coachApi, type CoachConversation } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useFoodIntelUserState } from '../../hooks/useFoodIntelUserState';

type CoachView = 'list' | 'conversation';

const FALLBACK_CHIPS: string[] = [
  'Chicken thighs + 30 min — what should I make?',
  'I have leftover rice — bridge it forward',
  '320 cal under — got dessert ideas?',
  "Try a cuisine I haven't yet",
];

// 10Y-B follow-up: read pantry.expiringSoon, today.remainingMacros, leftoverInventory, cuisineAdjacency for true N=1 chips
function deriveChips(_userState: ReturnType<typeof useFoodIntelUserState>): string[] {
  return FALLBACK_CHIPS;
}

export default function CoachScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const userState = useFoodIntelUserState();

  const [view, setView] = useState<CoachView>('list');
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [composerText, setComposerText] = useState('');

  const stream = useCoachStream();
  const chips = useMemo(() => deriveChips(userState), [userState]);

  const screenBg = isDark ? DarkColors.background : '#FAF7F4';
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await coachApi.listConversations();
        if (cancelled) return;
        const sorted = [...list].sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
        );
        setConversations(sorted);
      } catch {
        // Surface empty state on failure — do not block UI.
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openNewConversation = useCallback((seed?: string) => {
    stream.reset();
    setComposerText(seed ?? '');
    setView('conversation');
  }, [stream]);

  const openExisting = useCallback(async (id: string) => {
    setView('conversation');
    try {
      const detail = await coachApi.getConversation(id);
      stream.setConversationId(detail.id);
      stream.setMessages(detail.messages.map(m => ({ id: m.id, role: m.role, content: m.content })));
    } catch {
      // Conversation may have been deleted; reset to fresh.
      stream.reset();
    }
  }, [stream]);

  const onSelectChip = useCallback((value: string) => {
    setComposerText(value);
  }, []);

  const onSend = useCallback(async () => {
    const value = composerText.trim();
    if (!value) return;
    setComposerText('');
    await stream.sendMessage(value);
  }, [composerText, stream]);

  const onBack = useCallback(() => {
    setView('list');
  }, []);

  // ─── Active conversation view ──────────────────────────────────────────────
  if (view === 'conversation') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.flex, { backgroundColor: screenBg }]}
      >
        <View style={[styles.header, { backgroundColor: screenBg }]}>
          <HapticTouchableOpacity
            onPress={onBack}
            accessibilityLabel="Back to coach conversations"
            accessibilityRole="button"
            style={styles.headerBtn}
          >
            <Ionicons name="chevron-back" size={24} color={text} />
          </HapticTouchableOpacity>
          <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
            Sazon Coach
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.bubbles}
          keyboardShouldPersistTaps="handled"
        >
          {stream.messages.length === 0 && (
            <View style={styles.intro}>
              <Text style={[styles.introText, { color: subtle }]}>
                Tell me what you're hungry for — I know your pantry, macros, and taste.
              </Text>
              <View style={styles.chipsWrap}>
                <QuickStartChips chips={chips} onSelect={onSelectChip} />
              </View>
            </View>
          )}

          {stream.messages.map(m => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}

          {stream.paywall && (
            <View
              accessibilityLabel="Coach upgrade card"
              style={[
                styles.paywallCard,
                Shadows.MD as any,
                { backgroundColor: isDark ? PastelDark.peach : Pastel.peach },
              ]}
            >
              <Text style={[styles.paywallHeadline, { color: text }]}>
                {stream.paywall.headline}
              </Text>
              <Text style={[styles.paywallCta, { color: isDark ? DarkColors.primary : Colors.primary }]}>
                {stream.paywall.cta}
              </Text>
            </View>
          )}

          {stream.error && !stream.paywall && (
            <Text style={[styles.errorText, { color: isDark ? DarkColors.error : Colors.error }]}>
              Hmm, the coach went quiet. Try again in a sec.
            </Text>
          )}
        </ScrollView>

        <View style={[styles.composerBar, { backgroundColor: screenBg }]}>
          <View
            style={[
              styles.composerInner,
              Shadows.SM as any,
              { backgroundColor: isDark ? DarkColors.surface : '#FFFFFF' },
            ]}
          >
            <TextInput
              value={composerText}
              onChangeText={setComposerText}
              placeholder="Tell me what you're hungry for..."
              placeholderTextColor={subtle}
              multiline
              accessibilityLabel="Coach message composer"
              style={[styles.composer, { color: text }]}
              editable={!stream.isStreaming}
            />
            <HapticTouchableOpacity
              onPress={onSend}
              disabled={!composerText.trim() || stream.isStreaming}
              accessibilityLabel="Send message to coach"
              accessibilityRole="button"
              style={[
                styles.sendBtn,
                {
                  backgroundColor: composerText.trim() && !stream.isStreaming
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? DarkColors.surfaceTint : '#EFE9E2'),
                },
              ]}
            >
              {stream.isStreaming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              )}
            </HapticTouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Thread list view ──────────────────────────────────────────────────────
  return (
    <View style={[styles.flex, { backgroundColor: screenBg }]}>
      <View style={[styles.header, { backgroundColor: screenBg }]}>
        <View style={styles.headerBtn} />
        <Text style={[styles.headerTitle, { color: text }]}>Coach</Text>
        <HapticTouchableOpacity
          onPress={() => openNewConversation()}
          accessibilityLabel="New coach conversation"
          accessibilityRole="button"
          style={styles.headerBtn}
        >
          <Ionicons name="add" size={24} color={text} />
        </HapticTouchableOpacity>
      </View>

      {loadingList ? (
        <View style={styles.center}>
          <ActivityIndicator color={isDark ? DarkColors.primary : Colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.flex}>
          <AnimatedEmptyState
            useMascot
            mascotExpression="chef-kiss"
            title="Your private chef, ready when you are"
            description="Pantry, macros, leftovers — I know it all. Ask me anything about tonight."
            actionLabel="Tell me what you're hungry for."
            onAction={openNewConversation}
          />
          <View style={styles.chipsWrap}>
            <QuickStartChips
              chips={chips}
              onSelect={(value) => {
                openNewConversation(value);
              }}
            />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listPad}>
          {conversations.map(c => (
            <HapticTouchableOpacity
              key={c.id}
              onPress={() => openExisting(c.id)}
              accessibilityLabel={`Open conversation: ${c.title}`}
              accessibilityRole="button"
              style={[
                styles.threadRow,
                Shadows.SM as any,
                { backgroundColor: isDark ? DarkColors.surface : '#FFFFFF' },
              ]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={text} />
              <View style={styles.threadText}>
                <Text style={[styles.threadTitle, { color: text }]} numberOfLines={1}>
                  {c.title}
                </Text>
                <Text style={[styles.threadSub, { color: subtle }]}>
                  {new Date(c.lastMessageAt).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={subtle} />
            </HapticTouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  bubbles: {
    paddingVertical: 12,
    paddingBottom: 24,
  },
  intro: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  chipsWrap: {
    paddingVertical: 12,
  },
  composerBar: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
  },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  composer: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 40,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  paywallHeadline: {
    fontSize: 16,
    fontWeight: '700',
  },
  paywallCta: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
  },
  listPad: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  threadText: {
    flex: 1,
    gap: 2,
  },
  threadTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  threadSub: {
    fontSize: 12,
  },
});
