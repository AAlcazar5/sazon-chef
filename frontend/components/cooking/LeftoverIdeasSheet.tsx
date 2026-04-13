// frontend/components/cooking/LeftoverIdeasSheet.tsx
// 10H: Leftover transformer — shown after cooking completes.
//
// Pulls 3-5 recipes that reuse ≥2 of the ingredients from the recipe the user
// just cooked, excluding the source recipe and its cuisine so suggestions feel
// genuinely different. Silent when no ideas are found.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, ScrollView, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { pantryApi } from '../../lib/api';

export interface LeftoverIdeasSheetProps {
  visible: boolean;
  ingredients: string[];
  excludeRecipeId?: string;
  excludeCuisine?: string;
  onClose: () => void;
  onSelectRecipe: (recipeId: string) => void;
}

interface LeftoverRecipe {
  id: string;
  title: string;
  cuisine: string;
  cookTime: number;
  calories: number;
  protein: number;
  reuseCount: number;
}

function LeftoverIdeasSheet({
  visible,
  ingredients,
  excludeRecipeId,
  excludeCuisine,
  onClose,
  onSelectRecipe,
}: LeftoverIdeasSheetProps) {
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<LeftoverRecipe[]>([]);

  const fetchIdeas = useCallback(async () => {
    if (ingredients.length === 0) return;
    try {
      setLoading(true);
      const res = await pantryApi.leftoverIdeas(ingredients, {
        excludeRecipeId,
        excludeCuisine,
        limit: 5,
      });
      setRecipes(((res as any).data.recipes as LeftoverRecipe[]) || []);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [ingredients, excludeRecipeId, excludeCuisine]);

  useEffect(() => {
    if (visible) fetchIdeas();
  }, [visible, fetchIdeas]);

  // Don't show anything if we finished loading and got zero suggestions.
  if (!visible) return null;
  if (!loading && recipes.length === 0) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: DarkColors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 16,
            paddingHorizontal: 20,
            paddingBottom: 32,
            maxHeight: '80%',
          }}
          testID="leftover-ideas-sheet"
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              backgroundColor: '#444',
              borderRadius: 100,
              marginBottom: 12,
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                fontSize: FontSize.xl,
                fontWeight: FontWeight.extrabold,
                color: DarkColors.text.primary,
              }}
            >
              Got leftovers?
            </Text>
            <HapticTouchableOpacity onPress={onClose} accessibilityLabel="Close leftover ideas">
              <Icon name={Icons.CLOSE} size={IconSizes.MD} color={DarkColors.text.secondary} />
            </HapticTouchableOpacity>
          </View>
          <Text
            style={{
              fontSize: FontSize.sm,
              color: DarkColors.text.secondary,
              marginBottom: 14,
            }}
          >
            Use up what you have in a totally different way
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={Accent.peach} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {recipes.map((r) => (
                <HapticTouchableOpacity
                  key={r.id}
                  testID={`leftover-idea-${r.id}`}
                  accessibilityLabel={`${r.title}, reuses ${r.reuseCount} leftover ingredients`}
                  onPress={() => {
                    onSelectRecipe(r.id);
                    onClose();
                  }}
                  style={[
                    {
                      backgroundColor: PastelDark.sky,
                      borderRadius: BorderRadius.card,
                      padding: 14,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    },
                    Shadows.SM,
                  ]}
                >
                  <Text style={{ fontSize: 28 }}>♻️</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: FontSize.md,
                        fontWeight: FontWeight.extrabold,
                        color: DarkColors.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {r.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: FontSize.xs,
                        color: DarkColors.text.secondary,
                        marginTop: 2,
                      }}
                    >
                      {r.cuisine} · {r.cookTime}m · reuses {r.reuseCount} ingredients
                    </Text>
                  </View>
                  <Icon
                    name={Icons.CHEVRON_FORWARD}
                    size={IconSizes.SM}
                    color={DarkColors.text.tertiary}
                  />
                </HapticTouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default LeftoverIdeasSheet;
