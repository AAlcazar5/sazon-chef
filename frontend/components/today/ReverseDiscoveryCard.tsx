// frontend/components/today/ReverseDiscoveryCard.tsx
// ROADMAP 4.0 I2.4 — "Your market has..." reverse-discovery card.
//
// Renders one candidate ingredient that the user's locale stocks commonly
// AND the user has never cooked. Tap → opens Sazon seeded with the
// ingredient. Returns null when payload is null (en-US users, unsupported
// locale, or no candidates left). Caller fetches from /api/today/reverse-
// discovery and passes the response in.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export type AvailabilityTier = 'common' | 'specialty' | 'rare';

export interface ReverseDiscoveryCandidate {
  canonical: string;
  locale: string;
  localName: string;
  availabilityTier: AvailabilityTier;
  notes: string | null;
}

export interface DiscoveryCopy {
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
}

export interface ReverseDiscoveryPayload {
  candidate: ReverseDiscoveryCandidate | null;
  copy: DiscoveryCopy | null;
}

interface ReverseDiscoveryCardProps {
  payload: ReverseDiscoveryPayload;
  /** Fired when user taps the CTA — caller seeds Sazon with `ingredient`. */
  onAsk: (ingredient: ReverseDiscoveryCandidate) => void;
}

export const ReverseDiscoveryCard: React.FC<ReverseDiscoveryCardProps> = ({
  payload,
  onAsk,
}) => {
  if (!payload.candidate || !payload.copy) return null;
  const { candidate, copy } = payload;

  return (
    <View style={styles.card} testID="reverse-discovery-card">
      <Text
        style={styles.eyebrow}
        accessibilityRole="header"
        testID="reverse-discovery-eyebrow"
      >
        {copy.eyebrow}
      </Text>
      <Text style={styles.headline} testID="reverse-discovery-headline">
        {copy.headline}
      </Text>
      <Text style={styles.body} testID="reverse-discovery-body">
        {copy.body}
      </Text>
      {candidate.notes && (
        <Text style={styles.notes} testID="reverse-discovery-notes">
          {candidate.notes}
        </Text>
      )}
      <HapticTouchableOpacity
        onPress={() => onAsk(candidate)}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityLabel={`${copy.cta} — ${candidate.localName}`}
        testID="reverse-discovery-cta"
      >
        <Text style={styles.ctaLabel}>{copy.cta}</Text>
      </HapticTouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Pastel.peach ?? '#FFF3E0',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: PastelDark.peach ?? '#8a4a00',
    fontFamily: EditorialFontFamily.body.bold,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 26,
    color: '#1F1B16',
    fontFamily: EditorialFontFamily.display.bold,
    marginBottom: 6,
    lineHeight: 32,
  },
  body: {
    fontSize: 15,
    color: '#3F3A33',
    fontFamily: EditorialFontFamily.body.regular,
    lineHeight: 21,
    marginBottom: 4,
  },
  notes: {
    fontSize: 13,
    color: '#665E55',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },
  cta: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: '#1F1B16',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
  },
  ctaLabel: {
    fontSize: 14,
    color: '#FAF7F4',
    fontFamily: EditorialFontFamily.body.bold,
  },
});

export default ReverseDiscoveryCard;
