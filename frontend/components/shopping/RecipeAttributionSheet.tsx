// frontend/components/shopping/RecipeAttributionSheet.tsx
// Group 10Q: sheet listing all recipes that contributed to a shopping list item

import { View, Text, Modal, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

interface SourceRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
}

interface RecipeAttributionSheetProps {
  visible: boolean;
  recipes: SourceRecipe[];
  onClose: () => void;
}

export default function RecipeAttributionSheet({
  visible,
  recipes,
  onClose,
}: RecipeAttributionSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  if (!visible) return null;

  const handleRecipeTap = (recipeId: string) => {
    onClose();
    router.push(`/recipe/${recipeId}` as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? DarkColors.card : '#FAF7F4',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 16,
            paddingBottom: 40,
            paddingHorizontal: 20,
            ...Shadows.MD,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text
              style={{
                flex: 1,
                fontSize: 17,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: isDark ? '#F9FAFB' : '#111827',
              }}
            >
              Source recipes
            </Text>
            <HapticTouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 15, color: isDark ? '#9CA3AF' : '#6B7280' }}>Done</Text>
            </HapticTouchableOpacity>
          </View>

          {/* Recipe rows */}
          {recipes.length === 0 ? (
            <Text
              style={{ color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center', paddingVertical: 16 }}
            >
              No source recipes
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {recipes.map((recipe) => (
                <HapticTouchableOpacity
                  key={recipe.id}
                  onPress={() => handleRecipeTap(recipe.id)}
                  accessibilityLabel={`Go to ${recipe.title}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: 0.5,
                    borderBottomColor: isDark ? '#374151' : '#E5E7EB',
                  }}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📖</Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontFamily: 'PlusJakartaSans_500Medium',
                      color: isDark ? '#F3F4F6' : '#1F2937',
                    }}
                    numberOfLines={1}
                  >
                    {recipe.title}
                  </Text>
                  <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280' }}>›</Text>
                </HapticTouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
