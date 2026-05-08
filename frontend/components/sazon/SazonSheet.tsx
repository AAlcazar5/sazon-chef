// frontend/components/sazon/SazonSheet.tsx
// ROADMAP 4.0 IA2.1 — SazonSheet modal bottom sheet.
//
// 90% snap modal that hosts a quick Sazon entry point. Tap from any
// screen's SazonFAB → sheet opens → user can fire off a quick question
// (composer + last 3 messages) or jump to "Open full Sazon" for the
// route's deeper features (TTS, attachments, paywall flows).
//
// History as the FIRST thing in the header — "← Past chats" toggles a
// list of recent conversations; tap one to open it in the route. This
// matches the user's IA framework decision (history first, never buried).

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import { useTheme } from '../../contexts/ThemeContext';
import { coachApi } from '../../lib/api';
import CoachScreen from '../../app/(tabs)/coach';

interface SazonSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Optional seed message — pre-fills the composer when set. */
  contextSeed?: string;
}

interface ConversationLite {
  id: string;
  title?: string;
  lastMessageAt?: string;
}

type SheetView = 'chat' | 'history';

const HISTORY_PREVIEW_LIMIT = 5;

export default function SazonSheet({ visible, onClose, contextSeed }: SazonSheetProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [view, setView] = useState<SheetView>('chat');
  const [conversations, setConversations] = useState<ConversationLite[]>([]);

  useEffect(() => {
    if (!visible) return;
    setView('chat');
  }, [visible, contextSeed]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await coachApi.listConversations();
        if (cancelled) return;
        const sorted = [...list].sort(
          (a: ConversationLite, b: ConversationLite) => {
            const aT = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const bT = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return bT - aT;
          },
        );
        setConversations(sorted);
      } catch {
        // Surface empty list on failure; never block UI.
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const screenBg = isDark ? DarkColors.background : '#FAF7F4';
  const titleColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtleColor = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const openConversation = (conversationId: string) => {
    onClose();
    router.push({
      pathname: '/coach',
      params: { conversationId },
    } as never);
  };

  const showHistoryFromChat = () => setView('history');

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID="sazon-sheet"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View
        style={[styles.sheet, { backgroundColor: screenBg }, Shadows.LG]}
        accessibilityRole="none"
        accessibilityLabel="Sazon chat sheet"
      >
        {/* Sheet header — only shown in history view; chat view uses
            CoachScreen's own header (history + TTS + export + close). */}
        {view === 'history' && (
          <View style={styles.header}>
            <HapticTouchableOpacity
              onPress={() => setView('chat')}
              accessibilityRole="button"
              accessibilityLabel="Back to chat"
              style={styles.headerLeftAction}
            >
              <Icon
                name={Icons.CHEVRON_BACK}
                size={IconSizes.MD}
                color={titleColor as string}
                accessibilityLabel=""
              />
              <Text style={[styles.headerLeftLabel, { color: titleColor }]}>Back</Text>
            </HapticTouchableOpacity>

            <Text style={[styles.title, { color: titleColor }]}>Past chats</Text>

            <HapticTouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close Sazon sheet"
              style={styles.headerRightAction}
            >
              <Icon
                name={Icons.CLOSE}
                size={IconSizes.MD}
                color={titleColor as string}
                accessibilityLabel=""
              />
            </HapticTouchableOpacity>
          </View>
        )}

        {/* Floating close X — chat view's CoachScreen has its own history
            and TTS buttons in its header; we just need a way to dismiss. */}
        {view === 'chat' && (
          <HapticTouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close Sazon sheet"
            style={styles.chatCloseOverlay}
          >
            <Icon
              name={Icons.CLOSE}
              size={IconSizes.SM}
              color={titleColor as string}
              accessibilityLabel=""
            />
          </HapticTouchableOpacity>
        )}

        {/* Body */}
        <TouchableWithoutFeedback onPress={view === 'history' ? Keyboard.dismiss : undefined}>
          <View style={styles.body}>
            {view === 'chat' ? (
              <View testID="sazon-sheet-chat" style={styles.chatBody}>
                <CoachScreen
                  mode="sheet"
                  seedMessage={contextSeed}
                  onShowHistory={showHistoryFromChat}
                  onClose={onClose}
                />
              </View>
            ) : (
              <ScrollView
                testID="sazon-sheet-history"
                contentContainerStyle={styles.historyBody}
                showsVerticalScrollIndicator={false}
              >
                {conversations.length === 0 ? (
                  <Text style={[styles.empty, { color: subtleColor }]}>
                    No past chats yet.
                  </Text>
                ) : (
                  conversations.slice(0, HISTORY_PREVIEW_LIMIT).map((c) => (
                    <HapticTouchableOpacity
                      key={c.id}
                      onPress={() => openConversation(c.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open conversation: ${c.title ?? 'Untitled'}`}
                      style={[
                        styles.historyRow,
                        {
                          borderBottomColor: isDark ? '#ffffff14' : '#0000000a',
                        },
                      ]}
                    >
                      <Icon
                        name={Icons.CHATBUBBLE_OUTLINE}
                        size={IconSizes.SM}
                        color={subtleColor as string}
                        accessibilityLabel="Conversation"
                      />
                      <Text
                        style={[styles.historyTitle, { color: titleColor }]}
                        numberOfLines={1}
                      >
                        {c.title ?? 'Untitled chat'}
                      </Text>
                    </HapticTouchableOpacity>
                  ))
                )}
                {conversations.length > HISTORY_PREVIEW_LIMIT && (
                  <HapticTouchableOpacity
                    onPress={() => {
                      onClose();
                      router.push('/coach' as never);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="View all past chats"
                    style={styles.viewAllRow}
                  >
                    <Text
                      style={[
                        styles.viewAllLabel,
                        { color: isDark ? DarkColors.primary : Colors.primary },
                      ]}
                    >
                      View all {conversations.length} chats →
                    </Text>
                  </HapticTouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '90%',
    borderTopLeftRadius: BorderRadius.sheet ?? 28,
    borderTopRightRadius: BorderRadius.sheet ?? 28,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0000000a',
  },
  headerLeftAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLeftLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRightAction: {
    padding: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 16,
  },
  chatBody: {
    flex: 1,
  },
  chatCloseOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    zIndex: 5,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
  },
  composer: {
    minHeight: 100,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  openFullCTA: {
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openFullCTALabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  historyBody: {
    paddingBottom: 24,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  historyTitle: {
    flex: 1,
    fontSize: 15,
  },
  viewAllRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewAllLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 32,
    textAlign: 'center',
    fontSize: 15,
  },
});
