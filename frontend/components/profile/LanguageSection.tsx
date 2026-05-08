// frontend/components/profile/LanguageSection.tsx
// ROADMAP 4.0 i18n-OPS4.1 — language picker.
//
// Lets a power user / bilingual override the auto-detected device locale.
// Writes User.locale via PATCH /user/locale and updates the in-app i18n
// active locale immediately so strings switch without a restart.

import { View, Text, Animated, Easing, Alert } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useState, useRef, useEffect } from 'react';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { Duration } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { setLocale, getLocale, t, type SazonLocale } from '../../lib/i18n';
import { userApi } from '../../lib/api';

interface LocaleOption {
  code: SazonLocale;
  label: string;
  flag: string;
}

const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🌎' },
  { code: 'es-MX', label: 'Español (México)', flag: '🇲🇽' },
  { code: 'es-AR', label: 'Español (Argentina)', flag: '🇦🇷' },
  { code: 'es-CO', label: 'Español (Colombia)', flag: '🇨🇴' },
  { code: 'es-ES', label: 'Español (España)', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🌎' },
  { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'pt-PT', label: 'Português (Portugal)', flag: '🇵🇹' },
  // 'fr' bundle, persona, push templates, and resolver are wired (Tier I1B.1–.4)
  // but the picker entry is intentionally withheld until i18n-OPS7.3 review
  // clears the DeepL draft. Add `{ code: 'fr', label: 'Français', flag: '🇫🇷' }`
  // to expose it once a native speaker has signed off on fr.json.
];

export default function LanguageSection() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [active, setActive] = useState<SazonLocale>(getLocale());
  const [saving, setSaving] = useState<SazonLocale | null>(null);
  // G1.2 — coach voice override: null means "match app language".
  const [coachLocale, setCoachLocale] = useState<'es' | 'pt' | null>(null);
  const [savingCoach, setSavingCoach] = useState<'es' | 'pt' | null | 'inherit'>(null);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isCollapsed ? 0 : 1,
      duration: Duration.medium,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isCollapsed, animValue]);

  const toggleSection = () => {
    setIsCollapsed((prev) => !prev);
    HapticPatterns.buttonPress();
  };

  const handleSelect = async (code: SazonLocale) => {
    if (code === active) return;
    HapticPatterns.buttonPress();
    setSaving(code);
    try {
      await userApi.updateLocale(code);
      setLocale(code);
      setActive(code);
    } catch (error) {
      Alert.alert(
        t('language.error.title'),
        t('language.error.body'),
      );
    } finally {
      setSaving(null);
    }
  };

  const handleCoachVoiceSelect = async (next: 'es' | 'pt' | null) => {
    if (next === coachLocale) return;
    HapticPatterns.buttonPress();
    setSavingCoach(next ?? 'inherit');
    try {
      await userApi.updateCoachLocale(next);
      setCoachLocale(next);
    } catch (error) {
      Alert.alert(t('language.error.title'), t('language.error.body'));
    } finally {
      setSavingCoach(null);
    }
  };

  const activeOption =
    LOCALE_OPTIONS.find((o) => o.code === active) ?? LOCALE_OPTIONS[0];

  const COACH_VOICE_OPTIONS: Array<{
    value: 'es' | 'pt' | null;
    label: string;
    flag: string;
    savingKey: 'es' | 'pt' | 'inherit';
  }> = [
    { value: null, label: t('language.coachVoice.inherit'), flag: '🔗', savingKey: 'inherit' },
    { value: 'es', label: 'Español', flag: '🌎', savingKey: 'es' },
    { value: 'pt', label: 'Português', flag: '🌎', savingKey: 'pt' },
  ];

  return (
    <View
      className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 "
      style={Shadows.MD}
    >
      <HapticTouchableOpacity
        onPress={toggleSection}
        className="flex-row items-center justify-between"
        activeOpacity={0.7}
        accessibilityLabel={t('language.toggle')}
      >
        <View className="flex-row items-center flex-1">
          <View
            className="rounded-full p-2 mr-3"
            style={{
              backgroundColor: isDark
                ? `${Colors.tertiaryGreenLight}33`
                : Colors.tertiaryGreenDark,
            }}
          >
            <Text className="text-xl">🌐</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('language.title')}
            </Text>
            <Text className="text-gray-500 dark:text-gray-200 text-sm mt-0.5">
              {activeOption.flag} {activeOption.label}
            </Text>
          </View>
        </View>
        <Animated.View
          style={{
            transform: [
              {
                rotate: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          }}
        >
          <Icon
            name={Icons.CHEVRON_DOWN}
            size={IconSizes.MD}
            color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
            accessibilityLabel={isCollapsed ? t('common.expand') : t('common.collapse')}
          />
        </Animated.View>
      </HapticTouchableOpacity>

      <Animated.View
        style={{
          maxHeight: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1000],
          }),
          opacity: animValue,
          overflow: 'hidden',
        }}
      >
        <Text className="text-gray-500 dark:text-gray-200 text-xs mt-3 mb-3">
          {t('language.description')}
        </Text>
        <View className="gap-2">
          {LOCALE_OPTIONS.map((opt) => {
            const isSelected = opt.code === active;
            const isSaving = saving === opt.code;
            return (
              <HapticTouchableOpacity
                key={opt.code}
                onPress={() => handleSelect(opt.code)}
                disabled={saving != null}
                accessibilityLabel={opt.label}
                accessibilityRole="button"
                className={`flex-row items-center justify-between py-3 px-3 rounded-lg ${
                  isSelected
                    ? ''
                    : 'bg-gray-50 dark:bg-gray-700'
                } ${saving != null && !isSaving ? 'opacity-50' : ''}`}
                style={
                  isSelected
                    ? {
                        backgroundColor: isDark
                          ? DarkColors.primary
                          : Colors.primary,
                      }
                    : undefined
                }
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-xl mr-3">{opt.flag}</Text>
                  <Text
                    className={`flex-1 font-medium ${
                      isSelected
                        ? 'text-white'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </View>
                {isSelected && !isSaving && (
                  <Icon
                    name={Icons.CHECKMARK}
                    size={IconSizes.SM}
                    color="#FFFFFF"
                    accessibilityLabel={t('common.selected')}
                  />
                )}
                {isSaving && (
                  <Text className="text-xs text-gray-500 dark:text-gray-300">
                    {t('common.saving')}
                  </Text>
                )}
              </HapticTouchableOpacity>
            );
          })}
        </View>

        {/* G1.2 — Sazon's voice override (independent of UI locale) */}
        <View className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t('language.coachVoice.title')}
          </Text>
          <Text className="text-gray-500 dark:text-gray-200 text-xs mb-3">
            {t('language.coachVoice.description')}
          </Text>
          <View className="gap-2">
            {COACH_VOICE_OPTIONS.map((opt) => {
              const isSelected = opt.value === coachLocale;
              const isSavingThis = savingCoach === opt.savingKey;
              return (
                <HapticTouchableOpacity
                  key={opt.savingKey}
                  onPress={() => handleCoachVoiceSelect(opt.value)}
                  disabled={savingCoach != null}
                  accessibilityLabel={opt.label}
                  accessibilityRole="button"
                  className={`flex-row items-center justify-between py-3 px-3 rounded-lg ${
                    isSelected ? '' : 'bg-gray-50 dark:bg-gray-700'
                  } ${savingCoach != null && !isSavingThis ? 'opacity-50' : ''}`}
                  style={
                    isSelected
                      ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary }
                      : undefined
                  }
                >
                  <View className="flex-row items-center flex-1">
                    <Text className="text-xl mr-3">{opt.flag}</Text>
                    <Text
                      className={`flex-1 font-medium ${
                        isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  {isSelected && !isSavingThis && (
                    <Icon
                      name={Icons.CHECKMARK}
                      size={IconSizes.SM}
                      color="#FFFFFF"
                      accessibilityLabel={t('common.selected')}
                    />
                  )}
                  {isSavingThis && (
                    <Text className="text-xs text-gray-500 dark:text-gray-300">
                      {t('common.saving')}
                    </Text>
                  )}
                </HapticTouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
