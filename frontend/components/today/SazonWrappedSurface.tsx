// frontend/components/today/SazonWrappedSurface.tsx
// ROADMAP 4.0 J13 — Sazon Wrapped surface.
//
// Spotify-Wrapped-style 5-card retrospective shown once a year (Dec 28 –
// Jan 2). Each card has Fraunces title + body + share-as-image button.
// The composition draws on Tier C9 weekly recap data + Tier J5 milestones
// + ShareCardCapture pattern — no new datastore, only new surface.
//
// Renders ONLY when its parent has resolved that the gating hook says
// `shouldShow=true`. The component itself is unconditional — it trusts
// its caller to gate on (window + has-data + not-yet-seen).
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Share,
  Platform,
} from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export type WrappedSlideType =
  | 'top_cuisines'
  | 'ingredients_tasted'
  | 'longest_streak'
  | 'micros'
  | 'first_time';

export interface WrappedSlide {
  type: WrappedSlideType;
  title: string;
  subtitle?: string;
  primary: string;
  detail?: string[];
}

export interface YearlyWrappedPayload {
  userId: string;
  year: number;
  cookCount: number;
  isSparse: boolean;
  slides: WrappedSlide[];
}

interface SazonWrappedSurfaceProps {
  /** Wrapped payload (typically from `/api/recap/wrapped`). */
  payload: YearlyWrappedPayload;
  /** Visible state — caller controls; close calls `onDismiss`. */
  visible: boolean;
  /** Fired when user taps "Done" — caller should call `markSeen()`. */
  onDismiss: () => void;
  /**
   * Optional Share function for testing — defaults to React Native's
   * built-in `Share.share`. Tests can inject a spy without mocking RN.
   */
  shareFn?: (msg: string) => Promise<unknown>;
}

const SLIDE_TINTS: Record<WrappedSlideType, keyof typeof Pastel> = {
  top_cuisines: 'peach',
  ingredients_tasted: 'sage',
  longest_streak: 'lavender',
  micros: 'sky',
  first_time: 'golden',
};

function shareTextForSlide(slide: WrappedSlide, year: number): string {
  const lines = [
    `Sazon Wrapped ${year}`,
    slide.title,
    slide.primary,
  ];
  if (slide.subtitle) lines.push(slide.subtitle);
  return lines.join('\n');
}

export const SazonWrappedSurface: React.FC<SazonWrappedSurfaceProps> = ({
  payload,
  visible,
  onDismiss,
  shareFn,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  const handleShare = async (slide: WrappedSlide): Promise<void> => {
    const message = shareTextForSlide(slide, payload.year);
    const fn = shareFn ?? ((msg: string) => Share.share({ message: msg }));
    try {
      await fn(message);
    } catch {
      // Share cancellations are common; non-fatal.
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'formSheet' : 'overFullScreen'}
      onRequestClose={onDismiss}
      testID="sazon-wrapped-modal"
    >
      <View style={styles.container} testID="sazon-wrapped-surface">
        <View style={styles.header}>
          <Text
            style={styles.eyebrow}
            accessibilityRole="header"
            testID="wrapped-eyebrow"
          >
            SAZON WRAPPED · {payload.year}
          </Text>
          <Text style={styles.headline}>
            {payload.isSparse ? 'Your first year cooking with Sazon' : 'Your year, on a plate'}
          </Text>
          <Text style={styles.cookCount}>{payload.cookCount} plates cooked</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          testID="wrapped-scroll"
        >
          {payload.slides.map((slide, idx) => (
            <View
              key={`${slide.type}-${idx}`}
              style={[styles.card, { backgroundColor: Pastel[SLIDE_TINTS[slide.type]] }]}
              testID={`wrapped-slide-${slide.type}`}
            >
              <Text style={styles.cardTitle}>{slide.title}</Text>
              <Text style={styles.cardPrimary}>{slide.primary}</Text>
              {slide.subtitle && (
                <Text style={styles.cardSubtitle}>{slide.subtitle}</Text>
              )}
              {slide.detail && slide.detail.length > 0 && (
                <View style={styles.cardDetail}>
                  {slide.detail.map((line, i) => (
                    <Text key={i} style={styles.cardDetailLine}>
                      {line}
                    </Text>
                  ))}
                </View>
              )}
              <HapticTouchableOpacity
                onPress={() => handleShare(slide)}
                style={styles.shareBtn}
                accessibilityRole="button"
                accessibilityLabel={`Share ${slide.title}`}
                testID={`wrapped-share-${slide.type}`}
              >
                <Text style={styles.shareBtnLabel}>Share</Text>
              </HapticTouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <HapticTouchableOpacity
            onPress={onDismiss}
            style={styles.doneBtn}
            accessibilityRole="button"
            accessibilityLabel="Close Sazon Wrapped"
            testID="wrapped-done"
          >
            <Text style={styles.doneBtnLabel}>Done</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F4',
  },
  header: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: PastelDark.peach ?? '#C24A1F',
    fontFamily: EditorialFontFamily.body.bold,
    marginBottom: 8,
  },
  headline: {
    fontSize: 28,
    textAlign: 'center',
    color: '#1F1B16',
    fontFamily: EditorialFontFamily.display.bold,
    marginBottom: 4,
  },
  cookCount: {
    fontSize: 14,
    color: '#665E55',
    fontFamily: EditorialFontFamily.body.regular,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    minHeight: 200,
  },
  cardTitle: {
    fontSize: 14,
    letterSpacing: 1.2,
    color: '#665E55',
    fontFamily: EditorialFontFamily.body.bold,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  cardPrimary: {
    fontSize: 32,
    color: '#1F1B16',
    fontFamily: EditorialFontFamily.display.bold,
    marginBottom: 8,
    lineHeight: 38,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#3F3A33',
    fontFamily: EditorialFontFamily.body.regular,
    lineHeight: 22,
  },
  cardDetail: {
    marginTop: 16,
    gap: 4,
  },
  cardDetailLine: {
    fontSize: 16,
    color: '#3F3A33',
    fontFamily: EditorialFontFamily.body.regular,
  },
  shareBtn: {
    marginTop: 20,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.07)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  shareBtnLabel: {
    fontSize: 14,
    color: '#1F1B16',
    fontFamily: EditorialFontFamily.body.bold,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  doneBtn: {
    backgroundColor: '#1F1B16',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    minWidth: 160,
  },
  doneBtnLabel: {
    fontSize: 16,
    color: '#FAF7F4',
    fontFamily: EditorialFontFamily.body.bold,
  },
});

export default SazonWrappedSurface;
