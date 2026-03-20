// frontend/app/create-collection.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import ShakeAnimation from '../components/ui/ShakeAnimation';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import { collectionsApi } from '../lib/api';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../constants/Colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.82);

export default function CreateCollectionScreen() {
  const [name, setName] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shakeName, setShakeName] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 22,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleClose = () => {
    Animated.spring(slideAnim, {
      toValue: SHEET_HEIGHT,
      damping: 22,
      stiffness: 220,
      useNativeDriver: true,
    }).start(() => router.back());
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to select a cover image.');
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
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setShakeName(true);
      setTimeout(() => setShakeName(false), 500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    setLoading(true);
    try {
      await collectionsApi.create({
        name: name.trim(),
        coverImageUrl: coverImageUrl || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create collection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sheetBg = isDark ? DarkColors.background : '#FFFFFF';
  const labelColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subColor = isDark ? DarkColors.text.tertiary : Colors.text.secondary;
  const inputBg = isDark ? DarkColors.card : Colors.surface;
  const borderColor = isDark ? '#374151' : '#D1D5DB';

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      {/* Backdrop — tap to dismiss */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={{ flex: 1 }} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
          height: SHEET_HEIGHT,
          backgroundColor: sheetBg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: borderColor }} />
        </View>

        {/* Sheet header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: labelColor }}>Create Collection</Text>
          <HapticTouchableOpacity onPress={handleClose} disabled={loading} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color={subColor} />
          </HapticTouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Collection Name */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: labelColor, marginBottom: 8 }}>
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: labelColor, marginBottom: 8 }}>
                Cover Image <Text style={{ color: subColor, fontWeight: '400' }}>(Optional)</Text>
              </Text>

              {coverImageUrl ? (
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: coverImageUrl }}
                    style={{ width: '100%', height: 160, borderRadius: 10, backgroundColor: borderColor }}
                    resizeMode="cover"
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
                <Text style={{ fontSize: 13, color: isDark ? '#93C5FD' : '#1D4ED8', fontWeight: '600', marginBottom: 3 }}>What are collections?</Text>
                <Text style={{ fontSize: 12, color: isDark ? '#93C5FD' : '#3B82F6', lineHeight: 18 }}>
                  Collections help you organize saved recipes into custom groups like "Family Favorites" or "Meal Prep Ideas".
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}
