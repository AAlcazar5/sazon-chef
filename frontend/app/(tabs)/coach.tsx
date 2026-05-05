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
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import AnimatedLogoMascot from '../../components/mascot/AnimatedLogoMascot';
import {
  MessageBubble,
  QuickStartChips,
  AttachmentBar,
  PantryConfirmSheet,
  CostNotice,
  ConversationExport,
} from '../../components/coach';
import CoachPaywallSheet, { type CoachPaywallReason } from '../../components/coach/CoachPaywallSheet';
import CoachMemoryHeaderPill from '../../components/coach/CoachMemoryHeaderPill';
import SazonHeader from '../../components/coach/SazonHeader';
import { useCoachStream } from '../../hooks/useCoachStream';
import { useCoachAttachments } from '../../hooks/useCoachAttachments';
import { useCoachMemoryCount } from '../../hooks/useCoachMemoryCount';
import { router, useLocalSearchParams } from 'expo-router';
import {
  coachApi,
  type CoachAttachment,
  type CoachConversation,
  type CoachIdentifiedIngredient,
} from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useFoodIntelUserState } from '../../hooks/useFoodIntelUserState';
import { useSubscription } from '../../hooks/useSubscription';
import { deriveCoachFlags } from '../../lib/coachClient';

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
  const { subscription } = useSubscription();
  const flags = useMemo(
    () => deriveCoachFlags({ tier: subscription.tier, isPremium: subscription.isPremium }),
    [subscription.tier, subscription.isPremium],
  );
  // 10Y entry-points: contextual deep-links pass conversationId + optional
  // seedMessage so we can jump directly into an active conversation.
  const params = useLocalSearchParams<{ conversationId?: string; seedMessage?: string }>();

  const [view, setView] = useState<CoachView>('list');
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [composerText, setComposerText] = useState('');
  const [manualPaywallReason, setManualPaywallReason] = useState<CoachPaywallReason | null>(null);
  const [pantryConfirm, setPantryConfirm] = useState<CoachIdentifiedIngredient[] | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('Sazon');

  const stream = useCoachStream();
  const attachments = useCoachAttachments();
  const chips = useMemo(() => deriveChips(userState), [userState]);
  const memoryCount = useCoachMemoryCount();

  const paywallReason: CoachPaywallReason | null =
    manualPaywallReason ?? stream.paywallReason ?? (stream.paywall ? 'cap' : null);

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
    setActiveTitle('Sazon');
    setView('conversation');
  }, [stream]);

  const openExisting = useCallback(async (id: string) => {
    setView('conversation');
    try {
      const detail = await coachApi.getConversation(id);
      stream.setConversationId(detail.id);
      stream.setMessages(detail.messages.map(m => ({ id: m.id, role: m.role, content: m.content })));
      setActiveTitle(detail.title || 'Sazon');
    } catch {
      // Conversation may have been deleted; reset to fresh.
      stream.reset();
    }
  }, [stream]);

  // Deep-link entry: if conversationId is present, jump into the active view
  // immediately. We split this into two effects: (1) load the conversation
  // exactly once on mount, (2) auto-send seedMessage after the stream's
  // conversationId reflects the loaded thread (so sendMessage's closure
  // doesn't create a duplicate conversation).
  const loadedRef = React.useRef(false);
  const seededRef = React.useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    const convId = typeof params.conversationId === 'string' ? params.conversationId : undefined;
    if (!convId) return;
    loadedRef.current = true;
    void openExisting(convId);
  }, [params.conversationId, openExisting]);

  useEffect(() => {
    if (seededRef.current) return;
    const convId = typeof params.conversationId === 'string' ? params.conversationId : undefined;
    const seed = typeof params.seedMessage === 'string' ? params.seedMessage : undefined;
    if (!convId || !seed || seed.trim().length === 0) return;
    if (stream.conversationId !== convId) return;
    seededRef.current = true;
    void stream.sendMessage(seed);
  }, [params.conversationId, params.seedMessage, stream]);

  const onSelectChip = useCallback((value: string) => {
    setComposerText(value);
  }, []);

  const onSend = useCallback(async () => {
    const value = composerText.trim();
    if (!value) return;
    setComposerText('');
    const pending = attachments.attachments;
    const wireAttachments: CoachAttachment[] = pending.map((a) => ({
      type: 'image_base64',
      mediaType: a.mediaType,
      data: a.base64,
    }));
    attachments.clear();

    // Run extraction in parallel with the chat send so the confirm sheet can
    // pop up after the assistant reply lands. First photo only — multi-photo
    // pantry extraction is deferred.
    let extractPromise: Promise<CoachIdentifiedIngredient[]> | null = null;
    if (pending.length > 0) {
      const first = pending[0];
      extractPromise = coachApi
        .extractPantryFromImage({ imageBase64: first.base64, mediaType: first.mediaType })
        .then((r) => r.ingredients)
        .catch(() => []);
    }

    await stream.sendMessage(value, wireAttachments.length > 0 ? wireAttachments : undefined);

    if (extractPromise) {
      const ingredients = await extractPromise;
      if (ingredients.length > 0) {
        setPantryConfirm(ingredients);
      }
    }
  }, [composerText, stream, attachments]);

  const onPickPhoto = useCallback(() => {
    if (!flags.canAttachPhotos) {
      setManualPaywallReason('photos');
      return;
    }
    if (!attachments.canAdd) {
      Alert.alert('Photo limit reached', 'You can attach up to 4 photos.');
      return;
    }
    const launchCamera = () => attachments.pickFromCamera();
    const launchLibrary = () => attachments.pickFromLibrary();

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Camera', 'Photo Library'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) void launchCamera();
          else if (idx === 2) void launchLibrary();
        },
      );
    } else {
      Alert.alert('Add a photo', 'Where from?', [
        { text: 'Camera', onPress: () => void launchCamera() },
        { text: 'Photo Library', onPress: () => void launchLibrary() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [attachments, flags.canAttachPhotos]);

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
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
              Sazon
            </Text>
            <Text style={[styles.headerModel, { color: subtle }]} numberOfLines={1}>
              {flags.modelLabel}
            </Text>
          </View>
          <ConversationExport
            conversationId={stream.conversationId}
            conversationTitle={activeTitle}
            isPremium={subscription.isPremium}
          />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.bubbles}
          keyboardShouldPersistTaps="handled"
        >
          {flags.hasMemory && (
            <CoachMemoryHeaderPill
              count={memoryCount}
              onPress={() => router.push('/profile/coach-memory' as never)}
            />
          )}

          <CostNotice message={stream.costNotice} />

          {stream.medicalDeflection && (
            <View
              accessibilityLabel="Medical deflection notice"
              style={styles.medicalNotice}
            >
              <Text style={styles.medicalNoticeText}>
                Sazon's not a medical pro — try a registered dietitian for that one.
              </Text>
            </View>
          )}

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

          {stream.error && !stream.paywall && (
            <Text style={[styles.errorText, { color: isDark ? DarkColors.error : Colors.error }]}>
              Hmm, the coach went quiet. Try again in a sec.
            </Text>
          )}
        </ScrollView>

        <View style={[styles.composerBar, { backgroundColor: screenBg }]}>
          {stream.attachmentError && (
            <Text style={[styles.errorText, { color: isDark ? DarkColors.error : Colors.error }]}>
              {stream.attachmentError}
            </Text>
          )}
          <AttachmentBar
            attachments={attachments.attachments}
            onRemove={attachments.remove}
          />
          <View
            style={[
              styles.composerInner,
              Shadows.SM as any,
              { backgroundColor: isDark ? DarkColors.surface : '#FFFFFF' },
            ]}
          >
            <HapticTouchableOpacity
              onPress={onPickPhoto}
              accessibilityLabel={
                flags.canAttachPhotos
                  ? 'Attach a photo'
                  : 'Attach a photo (Pro only)'
              }
              accessibilityRole="button"
              style={styles.attachBtn}
            >
              <Ionicons
                name="image-outline"
                size={20}
                color={flags.canAttachPhotos ? text : subtle}
              />
              {!flags.canAttachPhotos && (
                <View style={styles.attachLock}>
                  <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
                </View>
              )}
            </HapticTouchableOpacity>
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
                // TODO: Design system has no spinner that fits a 40x40 button —
                // keep ActivityIndicator until a ProgressDot/inline mascot lands.
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              )}
            </HapticTouchableOpacity>
          </View>
        </View>

        <CoachPaywallSheet
          visible={paywallReason !== null}
          reason={paywallReason ?? 'generic'}
          onClose={() => {
            setManualPaywallReason(null);
            stream.dismissPaywall();
          }}
        />

        <PantryConfirmSheet
          visible={pantryConfirm !== null}
          ingredients={pantryConfirm ?? []}
          onClose={() => setPantryConfirm(null)}
        />
      </KeyboardAvoidingView>
    );
  }

  // ─── Thread list view ──────────────────────────────────────────────────────
  return (
    <View style={[styles.flex, { backgroundColor: screenBg }]}>
      {/* ROADMAP 4.0 — header matches Home/Kitchen/Week pattern + ProfileAvatarButton */}
      <SazonHeader onNewConversation={() => openNewConversation()} />

      {loadingList ? (
        <View style={styles.center}>
          <AnimatedLogoMascot expression="thinking" size="medium" />
          <Text style={[styles.loadingText, { color: subtle }]}>
            Loading conversations…
          </Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.flex}>
          <AnimatedEmptyState
            useMascot
            mascotExpression="curious"
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerModel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLock: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 14,
    height: 14,
    borderRadius: 100,
    backgroundColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
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
  errorText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  medicalNotice: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF4D6',
  },
  medicalNoticeText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7A4F00',
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
