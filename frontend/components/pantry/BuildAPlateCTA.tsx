import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import BrandButton from '../ui/BrandButton';
import { Pastel } from '../../constants/Colors';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';

interface BuildAPlateCTAProps {
  isDark?: boolean;
}

export default function BuildAPlateCTA({ isDark = false }: BuildAPlateCTAProps) {
  const router = useRouter();

  const gradient = isDark
    ? (['rgba(129,199,132,0.18)', 'rgba(15,23,42,0.4)'] as const)
    : ([Pastel.sage, '#FAF7F4'] as const);

  const eyebrowColor = isDark ? '#A8C8AA' : '#5C7A60';
  const titleColor = isDark ? '#F5F5F5' : '#1A1A1A';
  const accentColor = '#fa7e12';
  const subtitleColor = isDark ? 'rgba(245,245,245,0.72)' : '#6B7280';

  return (
    <View
      testID="build-a-plate-cta-card"
      accessibilityLabel="Build a plate from your pantry"
      style={[styles.card, Shadows.SM]}
    >
      <LinearGradient
        colors={gradient as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={[styles.eyebrow, { color: eyebrowColor }]}>
          WHAT YOU HAVE IS ENOUGH
        </Text>
        <Text style={[styles.title, { color: titleColor }]}>
          Build a <Text style={[styles.titleAccent, { color: titleColor }]}>plate</Text>
          <Text style={[styles.titleTerminator, { color: accentColor }]}>.</Text>
        </Text>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>
          Compose tonight's dinner from what's already in your kitchen.
        </Text>
        <View style={styles.ctaRow}>
          <BrandButton
            label="Build a plate"
            variant="sage"
            icon="restaurant-outline"
            onPress={() => router.push('/build-a-plate?pantryOnly=true' as any)}
            testID="build-a-plate-cta"
            accessibilityLabel="Build a plate from your pantry"
          />
        </View>
      </LinearGradient>
    </View>
  );
}

const TITLE_SIZE = 34;

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    marginVertical: 14,
  },
  gradient: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.card,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    marginBottom: 8,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.05,
    letterSpacing: -1.1,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.1,
  },
  titleTerminator: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 18,
  },
  ctaRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
});
