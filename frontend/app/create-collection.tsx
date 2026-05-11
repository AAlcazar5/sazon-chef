// frontend/app/create-collection.tsx
// ROADMAP 4.0 R15 — Sheet chrome (backdrop + slide-up + drag handle +
// header + close + KAV/ScrollView wrapper) extracted to
// <BottomSheetShell>. This screen now contains only the form body.

import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { showPermissionDenied } from '../lib/permissionDeniedHelpers';
import { sazonAlert, sazonAlertRaw } from '../lib/sazonAlert';
import { useTheme } from '../contexts/ThemeContext';
import ShakeAnimation from '../components/ui/ShakeAnimation';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import BottomSheetShell from '../components/ui/BottomSheetShell';
import { collectionsApi } from '../lib/api';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../constants/Colors';

export default function CreateCollectionScreen() {
  const [name, setName] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shakeName, setShakeName] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark' || theme === 'dark';

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPermissionDenied('photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverImageUrl(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      sazonAlert('alerts.image_load_failed.title', 'alerts.image_load_failed.body');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setShakeName(true);
      setTimeout(() => setShakeName(false), 500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      sazonAlert('alerts.collection_name_required.title', 'alerts.collection_name_required.body');
      return;
    }

    setLoading(true);
    try {
      await collectionsApi.create({
        name: name.trim(),
        coverImageUrl: coverImageUrl || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error?.message) {
        sazonAlertRaw('Oops!', error.message);
      } else {
        sazonAlert('alerts.collection_create_failed.title', 'alerts.collection_create_failed.body');
      }
    } finally {
      setLoading(false);
    }
  };

  const labelColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subColor = isDark ? DarkColors.text.tertiary : Colors.text.secondary;
  const inputBg = isDark ? DarkColors.card : Colors.surface;
  const borderColor = isDark ? '#374151' : '#D1D5DB';

  return (
    <BottomSheetShell
      title="Create Collection"
      onClose={() => router.back()}
      closeDisabled={loading}
      heightFraction={0.82}
      testID="create-collection-sheet"
    >
      {/* Collection Name */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: labelColor, marginBottom: 8 }}>
          Collection Name <Text style={{ color: '#DC2626' }}>*</Text>
        </Text>
        <ShakeAnimation shake={shakeName}>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 13,
              fontSize: 16,
              backgroundColor: inputBg,
              color: labelColor,
            }}
            placeholder="e.g., Quick Weeknight Dinners"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
            maxLength={50}
            autoFocus
          />
        </ShakeAnimation>
        <Text style={{ fontSize: 12, color: subColor, marginTop: 4 }}>{name.length}/50 characters</Text>
      </View>

      {/* Cover Image */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: labelColor, marginBottom: 8 }}>
          Cover Image <Text style={{ color: subColor, fontFamily: 'PlusJakartaSans_400Regular' }}>(Optional)</Text>
        </Text>

        {coverImageUrl ? (
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: coverImageUrl }}
              style={{ width: '100%', height: 160, borderRadius: 10, backgroundColor: borderColor }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
            <HapticTouchableOpacity
              onPress={() => setCoverImageUrl(null)}
              disabled={loading}
              style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={18} color="white" />
            </HapticTouchableOpacity>
          </View>
        ) : (
          <HapticTouchableOpacity
            onPress={handlePickImage}
            disabled={loading}
            style={{ borderWidth: 2, borderStyle: 'dashed', borderColor, borderRadius: 10, height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: inputBg }}
          >
            <Ionicons name="image-outline" size={36} color={subColor} />
            <Text style={{ color: subColor, fontSize: 14, marginTop: 8 }}>Tap to select image</Text>
            <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF', fontSize: 12, marginTop: 3 }}>Recommended: 16:9 ratio</Text>
          </HapticTouchableOpacity>
        )}
      </View>

      {/* Create button */}
      <GradientButton
        label="Create Collection"
        onPress={handleCreate}
        disabled={loading}
        loading={loading}
        colors={GradientPresets.brand}
        icon="add-circle-outline"
      />

      {/* What are collections info */}
      <View style={{ marginTop: 20, padding: 16, backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF', borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#BFDBFE', flexDirection: 'row' }}>
        <Ionicons name="information-circle-outline" size={18} color="#3B82F6" style={{ marginRight: 8, marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: isDark ? '#93C5FD' : '#1D4ED8', fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 3 }}>What are collections?</Text>
          <Text style={{ fontSize: 12, color: isDark ? '#93C5FD' : '#3B82F6', lineHeight: 18 }}>
            Collections help you organize saved recipes into custom groups like "Family Favorites" or "Meal Prep Ideas".
          </Text>
        </View>
      </View>
    </BottomSheetShell>
  );
}
