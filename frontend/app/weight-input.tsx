// frontend/app/weight-input.tsx
// Log weight entry — uses EditScreenShell for chrome consistency.

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, Platform } from 'react-native';
import LoadingState from '../components/ui/LoadingState';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ShakeAnimation from '../components/ui/ShakeAnimation';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import BrandButton from '../components/ui/BrandButton';
import EditScreenShell from '../components/edit/EditScreenShell';
import { Brand, Ink, Radius, Surface } from '../constants/tokens';
import { Shadows } from '../constants/Shadows';
import { Spacing } from '../constants/Spacing';
import { apiClient } from '../lib/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from 'nativewind';

export default function WeightInputScreen() {
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakeWeight, setShakeWeight] = useState(false);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('lbs');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await apiClient.get('/user/physical-profile');
        const profile = response.data;
        if (profile && profile.heightCm) {
          setUnit('kg');
        } else {
          setUnit('lbs');
        }
      } catch (error) {
        setUnit('lbs');
      } finally {
        setLoadingProfile(false);
      }
    };
    loadUserProfile();
  }, []);

  const handleSave = async () => {
    if (!weight.trim()) {
      setShakeWeight(true);
      setTimeout(() => setShakeWeight(false), 500);
      Alert.alert('Oops!', 'Pop in your weight first!');
      return;
    }

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      setShakeWeight(true);
      setTimeout(() => setShakeWeight(false), 500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Oops!', 'That doesn\'t look like a valid weight — double check?');
      return;
    }

    const weightInKg = unit === 'lbs' ? weightValue * 0.453592 : weightValue;

    setLoading(true);
    try {
      await apiClient.post('/weight-goal/log', {
        date: date.toISOString(),
        weightKg: weightInKg,
        notes: notes.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Logged',
        'In the books.',
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Oops!', error.message || 'Couldn\'t log your weight — try again?');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loadingProfile) {
    return (
      <LoadingState
        expression="thinking"
        message="Pulling your profile up…"
        fullScreen
      />
    );
  }

  const inkPrimary = isDark ? Ink.dark.primary : Ink.light.primary;
  const inkSecondary = isDark ? Ink.dark.secondary : Ink.light.secondary;
  const inkTertiary = isDark ? Ink.dark.tertiary : Ink.light.tertiary;
  const inputBg = isDark ? Surface.dark.raised : Surface.light.base;
  const brandColor = isDark ? Brand.dark.base : Brand.light.base;

  const labelStyle = { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: inkPrimary, marginBottom: 8 };
  const fieldShadow = Shadows.SM;

  return (
    <EditScreenShell title="Log Weight">
      <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
        <Text style={{ fontSize: 15, color: inkSecondary, textAlign: 'center', marginBottom: Spacing.xl }}>
          Track your weight progress
        </Text>

        {/* Date Picker */}
        <View style={{ marginBottom: Spacing.lg + 4 }}>
          <Text style={labelStyle}>Date</Text>
          <HapticTouchableOpacity
            onPress={() => setShowDatePicker(true)}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={`Date: ${formatDate(date)}`}
          >
            <View style={[{
              borderRadius: Radius.input,
              paddingHorizontal: 12,
              paddingVertical: 14,
              backgroundColor: inputBg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }, fieldShadow]}>
              <Text style={{ fontSize: 16, color: inkPrimary }}>{formatDate(date)}</Text>
              <Ionicons name="calendar-outline" size={20} color={inkTertiary} />
            </View>
          </HapticTouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
            maximumDate={new Date()}
          />
        )}

        {/* Weight Input */}
        <View style={{ marginBottom: Spacing.lg + 4 }}>
          <Text style={labelStyle}>Weight ({unit})</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ShakeAnimation shake={shakeWeight}>
              <TextInput
                style={[{
                  flex: 1,
                  borderRadius: Radius.input,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                  fontSize: 16,
                  backgroundColor: inputBg,
                  color: inkPrimary,
                  minWidth: 200,
                }, fieldShadow]}
                placeholder={`Enter weight in ${unit}`}
                placeholderTextColor={inkTertiary}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                editable={!loading}
                accessibilityLabel="Weight"
              />
            </ShakeAnimation>

            {/* Unit Toggle */}
            <View style={[{ flexDirection: 'row', borderRadius: Radius.input, overflow: 'hidden' }, fieldShadow]}>
              <HapticTouchableOpacity
                onPress={() => setUnit('lbs')}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Use pounds"
                accessibilityState={{ selected: unit === 'lbs' }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  backgroundColor: unit === 'lbs' ? brandColor : inputBg,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: unit === 'lbs' ? Brand.light.ink : inkPrimary }}>
                  lbs
                </Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => setUnit('kg')}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Use kilograms"
                accessibilityState={{ selected: unit === 'kg' }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  backgroundColor: unit === 'kg' ? brandColor : inputBg,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: unit === 'kg' ? Brand.light.ink : inkPrimary }}>
                  kg
                </Text>
              </HapticTouchableOpacity>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: inkTertiary, marginTop: 6 }}>
            {unit === 'lbs' ? '1 lb = 0.45 kg' : '1 kg = 2.2 lbs'}
          </Text>
        </View>

        {/* Notes (Optional) */}
        <View style={{ marginBottom: Spacing.lg + 4 }}>
          <Text style={labelStyle}>Notes (Optional)</Text>
          <TextInput
            style={[{
              borderRadius: Radius.input,
              paddingHorizontal: 12,
              paddingVertical: 14,
              fontSize: 16,
              backgroundColor: inputBg,
              color: inkPrimary,
              minHeight: 80,
              textAlignVertical: 'top',
            }, fieldShadow]}
            placeholder="Add notes (e.g., morning weigh-in, after workout)"
            placeholderTextColor={inkTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!loading}
            accessibilityLabel="Notes (optional)"
          />
        </View>

        {/* Save Button */}
        <BrandButton
          label="Save Weight"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          variant="sage"
          style={{ marginTop: 8 }}
        />

        {/* Cancel Button */}
        <HapticTouchableOpacity
          onPress={() => router.back()}
          disabled={loading}
          accessibilityRole="link"
          accessibilityLabel="Cancel"
          style={{ marginTop: Spacing.lg }}
        >
          <Text style={{ textAlign: 'center', color: inkSecondary, fontSize: 14 }}>
            Cancel
          </Text>
        </HapticTouchableOpacity>
      </View>
    </EditScreenShell>
  );
}
