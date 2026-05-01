// frontend/components/shopping/BuildFromRecipesSheet.tsx
// Shopping List Intelligence — Recipe → List core flow (Group 10Q)

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import BottomSheet from '../ui/BottomSheet';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import { AnimatedLogoMascot } from '../mascot';
import { useTheme } from '../../contexts/ThemeContext';
import { useRecipeScaling } from '../../hooks/useRecipeScaling';
import { recipeApi, shoppingListApi } from '../../lib/api';
import { Recipe } from '../../types';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { Pastel, PastelDark, DarkColors } from '../../constants/Colors';
import { Icons, IconSizes } from '../../constants/Icons';
import Icon from '../ui/Icon';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onListCreated: (listId: string) => void;
}

type StepperOption = '1x' | '2x' | '3x' | 'custom';

const STEPPER_OPTIONS: StepperOption[] = ['1x', '2x', '3x', 'custom'];
const STEPPER_MULTIPLIERS: Record<Exclude<StepperOption, 'custom'>, number> = {
  '1x': 1,
  '2x': 2,
  '3x': 3,
};

// ── Budget preview hook (resilient) ───────────────────────────────────────────
// POST /api/shopping-lists/budget-preview — parallel backend agent is building this.
// Until the endpoint is live, we render "~$ —" as a safe placeholder.

function useBudgetPreviewLine(
  selectedIds: string[],
  servingsByRecipe: Record<string, number>
): string {
  const [line, setLine] = useState<string>('~$ —');

  useEffect(() => {
    if (selectedIds.length === 0) {
      setLine('~$ —');
      return;
    }
    let cancelled = false;

    // Attempt the dedicated budget-preview endpoint (expected shape:
    //   body { recipeIds, servingsMultiplier? } → { items, totalCents })
    // If it returns 404 (not yet deployed) or any error, degrade to placeholder.
    const fetchBudgetPreview = async () => {
      try {
        // Dynamically import to keep the module mockable in tests
        // and to avoid crashes when apiClient is not available.
        const apiModule = require('../../lib/api');
        const client = apiModule?.apiClient;
        if (!client?.post) {
          // apiClient not available (e.g. in tests) — keep placeholder
          return;
        }
        const res: any = await client.post('/shopping-lists/budget-preview', {
          recipeIds: selectedIds,
          servingsByRecipe,
        });
        const totalCents: number | undefined = res?.data?.totalCents ?? res?.totalCents;
        if (!cancelled && totalCents != null) {
          const dollars = (totalCents / 100).toFixed(2);
          setLine(`~$${dollars}`);
        }
      } catch {
        // 404 or network error — keep placeholder, do NOT crash
        if (!cancelled) setLine('~$ —');
      }
    };

    fetchBudgetPreview();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join(','), JSON.stringify(servingsByRecipe)]);

  return line;
}

// ── RecipeCard ────────────────────────────────────────────────────────────────

interface RecipeCardProps {
  recipe: Recipe;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
}

function RecipeCard({ recipe, selected, onPress, isDark }: RecipeCardProps) {
  const bg = isDark
    ? selected ? PastelDark.sage : '#2C2C2E'
    : selected ? Pastel.sage : '#F9FAFB';

  const borderColor = selected
    ? isDark ? '#66BB6A' : '#4CAF50'
    : 'transparent';

  return (
    <HapticTouchableOpacity
      testID={`bfr-recipe-card-${recipe.id}`}
      accessibilityLabel={`Select recipe ${recipe.title}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.recipeCard,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: selected ? 2 : 1,
        },
        Shadows.SM,
      ]}
    >
      {/* Checkmark overlay */}
      {selected && (
        <View
          testID={`bfr-recipe-check-${recipe.id}`}
          style={[styles.checkBadge, { backgroundColor: isDark ? '#66BB6A' : '#4CAF50' }]}
        >
          <Text style={styles.checkmark}>✓</Text>
        </View>
      )}

      {/* Recipe info */}
      <View style={styles.recipeCardBody}>
        <Text
          numberOfLines={2}
          style={[styles.recipeTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}
        >
          {recipe.title}
        </Text>
        <Text style={[styles.recipeMeta, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {recipe.cookTime} min · {recipe.cuisine}
        </Text>
      </View>
    </HapticTouchableOpacity>
  );
}

// ── ServingsStepper ───────────────────────────────────────────────────────────

interface StepperProps {
  recipeId: string;
  isDark: boolean;
  selected: StepperOption;
  onSelect: (opt: StepperOption) => void;
}

function ServingsStepper({ recipeId, isDark, selected, onSelect }: StepperProps) {
  return (
    <View testID={`bfr-stepper-${recipeId}`} style={styles.stepperRow}>
      {STEPPER_OPTIONS.map(opt => {
        const isActive = selected === opt;
        return (
          <HapticTouchableOpacity
            key={opt}
            testID={`bfr-step-${opt}-${recipeId}`}
            accessibilityLabel={`${opt} servings`}
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelect(opt)}
            style={[
              styles.stepperBtn,
              {
                backgroundColor: isActive
                  ? isDark ? '#4CAF50' : '#66BB6A'
                  : isDark ? '#3A3A3C' : '#F3F4F6',
              },
            ]}
          >
            <Text
              style={[
                styles.stepperLabel,
                { color: isActive ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280' },
              ]}
            >
              {opt}
            </Text>
          </HapticTouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuildFromRecipesSheet({ visible, onClose, onListCreated }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { servingsByRecipe, setServings } = useRecipeScaling();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stepperSelections, setStepperSelections] = useState<Record<string, StepperOption>>({});
  const [subtractPantry, setSubtractPantry] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [duplicateState, setDuplicateState] = useState<{
    duplicateOf: string;
    similarity: number;
  } | null>(null);

  const budgetLine = useBudgetPreviewLine(selectedIds, servingsByRecipe);

  // Load recipes when sheet opens
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    recipeApi
      .getSavedRecipes()
      .then((res: any) => {
        const data: Recipe[] = res?.data ?? [];
        setRecipes(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setRecipes([]);
      })
      .finally(() => setLoading(false));
  }, [visible]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!visible) {
      setSearch('');
      setSelectedIds([]);
      setStepperSelections({});
      setSubtractPantry(false);
      setDuplicateState(null);
      setGenerating(false);
    }
  }, [visible]);

  // Filtered recipes
  const filteredRecipes = recipes.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.cuisine ?? '').toLowerCase().includes(q)
    );
  });

  const toggleRecipe = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
    setStepperSelections(prev => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: '1x' };
    });
    setServings(id, 1);
  }, [setServings]);

  const handleStepperSelect = useCallback((recipeId: string, opt: StepperOption) => {
    setStepperSelections(prev => ({ ...prev, [recipeId]: opt }));
    if (opt !== 'custom') {
      setServings(recipeId, STEPPER_MULTIPLIERS[opt]);
    }
  }, [setServings]);

  const handleGenerate = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setGenerating(true);
    try {
      const res: any = await (shoppingListApi as any).generateFromRecipes({
        recipeIds: selectedIds,
        subtractPantry,
        servingsByRecipe,
      });
      const data = res?.data ?? res;

      if (data?.duplicateOf) {
        setDuplicateState({ duplicateOf: data.duplicateOf, similarity: data.similarity ?? 1 });
      } else {
        const listId: string = data?.id ?? data?.listId ?? '';
        onListCreated(listId);
        onClose();
      }
    } catch {
      // Non-crashing: keep sheet open, let user retry
    } finally {
      setGenerating(false);
    }
  }, [selectedIds, subtractPantry, servingsByRecipe, onListCreated, onClose]);

  const handleMerge = useCallback(() => {
    if (duplicateState) {
      onListCreated(duplicateState.duplicateOf);
      onClose();
    }
  }, [duplicateState, onListCreated, onClose]);

  const handleOpenExisting = useCallback(() => {
    if (duplicateState) {
      onClose();
      router.push(`/shopping-list?listId=${duplicateState.duplicateOf}` as any);
    }
  }, [duplicateState, onClose]);

  const bg = isDark ? DarkColors.card : '#FAF7F4';
  const inputBg = isDark ? '#2C2C2E' : '#F3F4F6';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['85%', '95%']}
      scrollable
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          Build from Recipes
        </Text>
        <HapticTouchableOpacity
          testID="bfr-close-btn"
          accessibilityLabel="Close sheet"
          onPress={onClose}
          style={styles.closeBtn}
        >
          <Icon
            name={Icons.CLOSE}
            size={IconSizes.MD}
            color={textSecondary}
            accessibilityLabel="Close"
          />
        </HapticTouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={[styles.searchContainer, { backgroundColor: inputBg }]}>
        <TextInput
          testID="bfr-search"
          placeholder="Search by name or cuisine…"
          placeholderTextColor={textSecondary}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: textPrimary }]}
          accessibilityLabel="Search recipes"
          returnKeyType="search"
        />
      </View>

      {/* ── Recipe grid ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <AnimatedLogoMascot expression="thinking" size="small" animationType="idle" />
        </View>
      ) : (
        <View style={styles.grid}>
          {filteredRecipes.map(recipe => {
            const isSelected = selectedIds.includes(recipe.id);
            const stepOpt = stepperSelections[recipe.id] ?? '1x';
            return (
              <View key={recipe.id}>
                <RecipeCard
                  recipe={recipe}
                  selected={isSelected}
                  onPress={() => toggleRecipe(recipe.id)}
                  isDark={isDark}
                />
                {isSelected && (
                  <ServingsStepper
                    recipeId={recipe.id}
                    isDark={isDark}
                    selected={stepOpt}
                    onSelect={opt => handleStepperSelect(recipe.id, opt)}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Pantry toggle ── */}
      <HapticTouchableOpacity
        testID="bfr-pantry-toggle"
        accessibilityLabel="Subtract items I already have (pantry)"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: subtractPantry }}
        onPress={() => setSubtractPantry(v => !v)}
        style={[
          styles.pantryToggle,
          {
            backgroundColor: subtractPantry
              ? isDark ? PastelDark.sage : Pastel.sage
              : isDark ? '#2C2C2E' : '#F3F4F6',
          },
        ]}
      >
        <Text style={[styles.pantryToggleLabel, { color: textPrimary }]}>
          {subtractPantry ? '✓ ' : ''}I already have these (subtract pantry)
        </Text>
      </HapticTouchableOpacity>

      {/* ── Budget preview ── */}
      <View style={styles.budgetRow}>
        <Text style={[styles.budgetLabel, { color: textSecondary }]}>Estimated total</Text>
        <Text
          testID="bfr-budget-preview"
          style={[styles.budgetValue, { color: textPrimary }]}
        >
          {budgetLine}
        </Text>
      </View>

      {/* ── Footer CTA ── */}
      <View style={styles.footer}>
        {duplicateState ? (
          <View style={styles.duplicateActions}>
            <BrandButton
              label="Merge into existing"
              onPress={handleMerge}
              variant="sage"
              hapticStyle="medium"
              accessibilityLabel="Merge into existing list"
            />
            <BrandButton
              label="Open existing list"
              onPress={handleOpenExisting}
              variant="ghost"
              hapticStyle="light"
              accessibilityLabel="Open existing list"
            />
          </View>
        ) : (
          <BrandButton
            testID="bfr-generate-btn"
            label="Generate List"
            onPress={handleGenerate}
            variant="sage"
            loading={generating}
            disabled={selectedIds.length === 0 || generating}
            hapticStyle="medium"
            accessibilityLabel="Generate shopping list from selected recipes"
          />
        )}
      </View>
    </BottomSheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    flex: 1,
  },
  closeBtn: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  searchContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  grid: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  recipeCard: {
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  recipeCardBody: {
    flex: 1,
  },
  recipeTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    marginBottom: 2,
  },
  recipeMeta: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  stepperBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  stepperLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
  },
  pantryToggle: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  pantryToggleLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  budgetLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
  },
  budgetValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  duplicateActions: {
    gap: Spacing.sm,
  },
});
