// frontend/app/(tabs)/coach.tsx
// 10Y-B + Tier S: Sazon chat surface. Two views in one screen:
//   1) Thread list (default, no conversation selected)
//   2) Active conversation (header + bubbles + composer + streaming)
//
// Tier S additions:
//   - S0.1: chip taps auto-send (no longer just seed the composer)
//   - S1.3: header model label reflects classified intent (chat / deep_plan)
//   - S2.1/S2.2: hold-to-talk mic in composer + permission denial UX
//   - S3.1/S3.2: TTS toggle in header reads assistant replies aloud
//   - S5.1: live N=1 chips derived from /api/coach/context

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActionSheetIOS,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../../components/ui/AnimatedActivityIndicator';
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
import { chipsFromCoachContext } from '../../components/coach/QuickStartChips';
import CoachPaywallSheet, { type CoachPaywallReason } from '../../components/coach/CoachPaywallSheet';
import CoachMemoryHeaderPill from '../../components/coach/CoachMemoryHeaderPill';
import SazonHeader from '../../components/coach/SazonHeader';
import SazonDailyGreetingBanner from '../../components/coach/SazonDailyGreetingBanner';
import CookingModeRecipeCard from '../../components/cooking/CookingModeRecipeCard';
import { useCoachStream } from '../../hooks/useCoachStream';
import { useLastCookCuisine } from '../../hooks/useLastCookCuisine';
import { useCoachAttachments } from '../../hooks/useCoachAttachments';
import { useCoachMemoryCount } from '../../hooks/useCoachMemoryCount';
import { useCoachQuickChipContext } from '../../hooks/useCoachQuickChipContext';
import { useVoiceInput } from '../../hooks/useVoiceInput';
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
import { ComponentSpacing } from '../../constants/Spacing';
import { t } from '../../lib/i18n';
import { useSubscription } from '../../hooks/useSubscription';
import { deriveCoachFlags } from '../../lib/coachClient';
import { classifyCoachIntent } from '../../lib/coachIntentClassifier';
import { cleanForTts } from '../../lib/coachTtsClean';

type CoachView = 'list' | 'conversation';

const TTS_PREF_KEY = 'sazon.coach.tts.enabled';

interface CoachScreenProps {
  /**
   * IA2 follow-up — when rendered inside the SazonSheet (vs as a route),
   * `mode='sheet'` lets the screen know to skip route-coupled affordances
   * and accept its seed/conversation via props. Default 'route'.
   */
  mode?: 'route' | 'sheet';
  /** When mode='sheet', overrides params.seedMessage. */
  seedMessage?: string;
  /** When mode='sheet', overrides params.conversationId. */
  conversationId?: string;
  /** When mode='sheet', tapping the back/history icon calls this instead of view-toggling. */
  onShowHistory?: () => void;
  /** When mode='sheet', tapping a Close affordance calls this. */
  onClose?: () => void;
}

export default function CoachScreen({
  mode = 'route',
  seedMessage: propSeedMessage,
  conversationId: propConversationId,
  onShowHistory,
  onClose,
}: CoachScreenProps = {}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { subscription } = useSubscription();
  const chipContext = useCoachQuickChipContext();
  const routeParams = useLocalSearchParams<{ conversationId?: string; seedMessage?: string }>();
  // Sheet mode: prop seed wins; route mode: route param wins.
  const params = useMemo(
    () => ({
      conversationId: mode === 'sheet' ? propConversationId : routeParams.conversationId,
      seedMessage: mode === 'sheet' ? propSeedMessage : routeParams.seedMessage,
    }),
    [mode, propSeedMessage, propConversationId, routeParams.conversationId, routeParams.seedMessage],
  );

  // ROADMAP 4.0 S15.1 — composer-first landing. Default to the conversation
  // view so tapping the Sazon tab shows the text input immediately. The
  // history list is a side surface accessed via the header history icon.
  const [view, setView] = useState<CoachView>('conversation');
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [composerText, setComposerText] = useState('');
  const [manualPaywallReason, setManualPaywallReason] = useState<CoachPaywallReason | null>(null);
  const [pantryConfirm, setPantryConfirm] = useState<CoachIdentifiedIngredient[] | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('Sazon');
  const [pendingSeed, setPendingSeed] = useState<string | null>(null);
  const [lastSentText, setLastSentText] = useState<string>('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [voicePermDenied, setVoicePermDenied] = useState(false);

  const stream = useCoachStream();
  const attachments = useCoachAttachments();
  const memoryCount = useCoachMemoryCount();

  // Tier S S1.3: classify the most recent user message to set the model label.
  const intent = useMemo(() => classifyCoachIntent(lastSentText), [lastSentText]);
  const flags = useMemo(
    () => deriveCoachFlags({ tier: subscription.tier, isPremium: subscription.isPremium }, intent),
    [subscription.tier, subscription.isPremium, intent],
  );

  const chips = useMemo(() => chipsFromCoachContext(chipContext), [chipContext]);
  // P2 retention — proactive Sazon greeting signal.
  const { cuisine: lastCookCuisine } = useLastCookCuisine();

  const paywallReason: CoachPaywallReason | null =
    manualPaywallReason ?? stream.paywallReason ?? (stream.paywall ? 'cap' : null);

  const screenBg = isDark ? DarkColors.background : '#FAF7F4';
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(TTS_PREF_KEY)
      .then((v) => {
        if (cancelled) return;
        setTtsEnabled(v === '1');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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

  // Tier S S0.1: chip taps from the list view set pendingSeed; the effect
  // below fires once stream.reset() has flushed and sends automatically so
  // the user never has to tap send.
  const openNewConversation = useCallback((seed?: string) => {
    stream.reset();
    setComposerText('');
    setActiveTitle('Sazon');
    setView('conversation');
    const trimmed = seed?.trim();
    setPendingSeed(trimmed && trimmed.length > 0 ? trimmed : null);
  }, [stream]);

  useEffect(() => {
    if (!pendingSeed) return;
    if (view !== 'conversation') return;
    if (stream.isStreaming) return;
    if (stream.conversationId !== null) return;
    if (stream.messages.length > 0) return;
    const seed = pendingSeed;
    setPendingSeed(null);
    setLastSentText(seed);
    void stream.sendMessage(seed);
  }, [pendingSeed, view, stream]);

  const openExisting = useCallback(async (id: string) => {
    setView('conversation');
    try {
      const detail = await coachApi.getConversation(id);
      stream.setConversationId(detail.id);
      stream.setMessages(detail.messages.map(m => ({ id: m.id, role: m.role, content: m.content })));
      setActiveTitle(detail.title || 'Sazon');
    } catch {
      stream.reset();
    }
  }, [stream]);

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
    setLastSentText(seed);
    void stream.sendMessage(seed);
  }, [params.conversationId, params.seedMessage, stream]);

  // Tier S S0.1: chip tap inside an active conversation sends immediately.
  const onSelectChip = useCallback((value: string) => {
    if (stream.isStreaming) return;
    setLastSentText(value);
    void stream.sendMessage(value);
  }, [stream]);

  const onSend = useCallback(async () => {
    const value = composerText.trim();
    if (!value) return;
    setComposerText('');
    setLastSentText(value);
    const pending = attachments.attachments;
    const wireAttachments: CoachAttachment[] = pending.map((a) => ({
      type: 'image_base64',
      mediaType: a.mediaType,
      data: a.base64,
    }));
    attachments.clear();

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
    // Sheet mode: tap the history icon → switch to the sheet's own
    // past-chats list (caller-supplied). Route mode: flip to the
    // in-screen list view.
    if (mode === 'sheet' && onShowHistory) {
      onShowHistory();
      return;
    }
    setView('list');
  }, [mode, onShowHistory]);

  // ─── Tier S S2.1: voice input — hold-to-talk mic ─────────────────────────
  const voice = useVoiceInput({
    continuous: false,
    onIntent: (parsed) => {
      // ParsedVoiceIntent's transcript is `rawText` (base VoiceIntent) —
      // `.original` never existed, so the final spoken text silently
      // never reached the composer.
      const finalText = parsed?.rawText ?? '';
      if (finalText) setComposerText(finalText);
    },
  });
  useEffect(() => {
    if (voice.isListening && voice.interimTranscript) {
      setComposerText(voice.interimTranscript);
    }
  }, [voice.isListening, voice.interimTranscript]);
  useEffect(() => {
    if (voice.hasPermission === false) setVoicePermDenied(true);
  }, [voice.hasPermission]);

  const onMicPressIn = useCallback(async () => {
    if (!voice.isAvailable) {
      Alert.alert(
        'Voice not available',
        "This device can't hear me right now — try typing instead.",
      );
      return;
    }
    if (voice.hasPermission === false) {
      Alert.alert(
        "Can't hear you yet",
        "Mic permission is off — flip it on in Settings and we're back in business.",
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }
    await voice.startListening();
  }, [voice]);

  const onMicPressOut = useCallback(() => {
    if (voice.isListening) voice.stopListening();
  }, [voice]);

  // ─── Tier S S3.1: TTS toggle reads completed assistant messages aloud ────
  const lastSpokenIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ttsEnabled) return;
    if (stream.isStreaming) return;
    const last = stream.messages[stream.messages.length - 1];
    if (!last || last.role !== 'assistant' || !last.content) return;
    if (lastSpokenIdRef.current === last.id) return;
    lastSpokenIdRef.current = last.id;
    const cleaned = cleanForTts(last.content);
    if (cleaned.length === 0) return;
    Speech.stop();
    Speech.speak(cleaned, { rate: 1.0 });
  }, [ttsEnabled, stream.isStreaming, stream.messages]);

  const onToggleTts = useCallback(() => {
    setTtsEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(TTS_PREF_KEY, next ? '1' : '0').catch(() => {});
      if (!next) Speech.stop();
      return next;
    });
  }, []);

  // ─── Active conversation view ──────────────────────────────────────────────
  if (view === 'conversation') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.flex, { backgroundColor: screenBg }]}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: screenBg },
            mode === 'sheet' && styles.headerSheet,
          ]}
        >
          <HapticTouchableOpacity
            onPress={onBack}
            accessibilityLabel="View conversation history"
            accessibilityRole="button"
            style={styles.headerBtn}
            testID="coach-history-button"
          >
            <Ionicons name="time-outline" size={24} color={text} />
          </HapticTouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
              Sazon
            </Text>
            {/* Model label intentionally removed — §9c invisible-AI: no
                AI/model indication in user copy. */}
          </View>
          <View style={styles.headerRight}>
            <HapticTouchableOpacity
              onPress={onToggleTts}
              accessibilityLabel={ttsEnabled ? 'Disable voice replies' : 'Enable voice replies'}
              accessibilityRole="button"
              accessibilityState={{ selected: ttsEnabled }}
              style={styles.headerBtn}
              testID="coach-tts-toggle"
            >
              <Ionicons
                name={ttsEnabled ? 'volume-high' : 'volume-mute-outline'}
                size={22}
                color={ttsEnabled ? (isDark ? DarkColors.primary : Colors.primary) : text}
              />
            </HapticTouchableOpacity>
            <ConversationExport
              conversationId={stream.conversationId}
              conversationTitle={activeTitle}
              isPremium={subscription.isPremium}
            />
            {onClose && (
              <HapticTouchableOpacity
                onPress={onClose}
                accessibilityLabel="Close Sazon"
                accessibilityRole="button"
                style={styles.headerBtn}
                testID="coach-close-button"
              >
                <Ionicons name="close" size={24} color={text} />
              </HapticTouchableOpacity>
            )}
          </View>
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

          {voicePermDenied && (
            <View style={styles.voiceNotice} accessibilityLabel="Voice permission notice">
              <Text style={styles.voiceNoticeText}>
                Mic's muted on this device — flip it on in Settings if you want to talk.
              </Text>
            </View>
          )}

          {stream.messages.length === 0 && (
            <View testID="mascot" style={styles.intro}>
              {/* Mascot is already in the app title header above —
                  duplicating it here was decorative noise. */}
              <Text style={[styles.introText, { color: subtle }]}>
                Tell me what you're hungry for — I know your pantry, macros, and taste.
              </Text>
              {/* P2 retention — once-per-day proactive greeting. */}
              <SazonDailyGreetingBanner
                signals={{ lastCookCuisine }}
                onStart={(starter) => onSelectChip(starter)}
              />
              <View style={styles.chipsWrap}>
                <QuickStartChips chips={chips} onSelect={onSelectChip} />
              </View>
            </View>
          )}

          {stream.messages.map(m => {
            // Tier Y live-wiring — recipe asks render the rich card,
            // never paragraph prose.
            if (m.kind === 'recipe-card' && m.recipe) {
              return (
                <CookingModeRecipeCard
                  key={m.id}
                  title={m.recipe.title}
                  description={m.recipe.description}
                  imageUrls={m.recipe.imageUrls}
                  baseServings={m.recipe.baseServings}
                  ingredients={m.recipe.ingredients}
                  steps={m.recipe.steps}
                  macros={m.recipe.macros}
                  notes={m.recipe.notes}
                />
              );
            }
            return <MessageBubble key={m.id} role={m.role} content={m.content} />;
          })}

          {stream.error && !stream.paywall && (
            <Text style={[styles.errorText, { color: isDark ? DarkColors.error : Colors.error }]}>
              {t('sazon.error.generic')}
            </Text>
          )}
        </ScrollView>

        <View
          style={[
            styles.composerBar,
            { backgroundColor: screenBg },
            mode === 'sheet' && styles.composerBarSheet,
          ]}
        >
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
              placeholder={voice.isListening ? 'Listening…' : t('sazon.composer.placeholder')}
              placeholderTextColor={subtle}
              multiline
              accessibilityLabel="Coach message composer"
              style={[styles.composer, { color: text }]}
              editable={!stream.isStreaming && !voice.isListening}
            />
            <HapticTouchableOpacity
              onPressIn={onMicPressIn}
              onPressOut={onMicPressOut}
              accessibilityLabel={voice.isListening ? 'Stop listening' : 'Hold to talk'}
              accessibilityRole="button"
              accessibilityState={{ disabled: voice.hasPermission === false }}
              style={[
                styles.attachBtn,
                voice.isListening && {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                },
              ]}
              testID="coach-mic-button"
            >
              <Ionicons
                name={voice.isListening ? 'mic' : 'mic-outline'}
                size={20}
                color={
                  voice.isListening
                    ? '#FFFFFF'
                    : voice.hasPermission === false
                      ? subtle
                      : text
                }
              />
              {voice.hasPermission === false && (
                <View style={styles.attachLock}>
                  <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
                </View>
              )}
            </HapticTouchableOpacity>
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
                <AnimatedActivityIndicator size="small" color="#FFFFFF" />
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
            title={t('sazon.empty.title')}
            description={t('sazon.empty.description')}
            actionLabel={t('sazon.composer.placeholder')}
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
  // Sheet mode sits below the app title header (no device notch under
  // it) — drop the big safe-area top pad so the control bar sits right
  // under the title.
  headerSheet: {
    paddingTop: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    paddingBottom: 8,
    paddingTop: 8,
    // ROADMAP 4.0 S15.2 — the tabs layout uses an absolutely-positioned
    // tab bar + search-bar overlay that together occlude ~140px at the
    // bottom of every screen. Use marginBottom (not paddingBottom) so the
    // composer's background doesn't paint OVER the search bar — we just
    // shift the whole bar up to sit cleanly above it.
    marginBottom: ComponentSpacing.tabBar.scrollPaddingBottom + 8,
  },
  // Sheet mode has no tab bar — the composer reaches the sheet bottom
  // instead of leaving the ~140px tab-bar gap. 16 clears the home
  // indicator (sheet bottom = screen bottom).
  composerBarSheet: {
    marginBottom: 16,
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
  voiceNotice: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFE9E5',
  },
  voiceNoticeText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7A2E20',
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
