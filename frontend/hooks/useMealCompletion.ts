// frontend/hooks/useMealCompletion.ts
// Custom hook for managing meal completion and notes

import { useState } from 'react';
import { Alert } from 'react-native';
import { mealPlanApi } from '../lib/api';
import { HapticPatterns } from '../constants/Haptics';

interface UseMealCompletionProps {
  /** Hourly meals for finding meal details */
  hourlyMeals: Record<number, any[]>;
  /** Weekly plan data for finding meals */
  weeklyPlan: any | null;
  /** Meal completion status */
  mealCompletionStatus: Record<string, boolean>;
  /** Meal notes */
  mealNotes: Record<string, string>;
  /** Update meal completion status */
  setMealCompletionStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /** Update meal notes */
  setMealNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

interface UseMealCompletionReturn {
  /** Whether notes modal is visible */
  showNotesModal: boolean;
  /** ID of meal being edited */
  editingMealId: string | null;
  /** Name of meal being edited */
  editingMealName: string;
  /** Notes text being edited */
  editingNotes: string;
  /** Whether celebration toast is visible */
  showCelebrationToast: boolean;
  /** Celebration message text */
  celebrationMessage: string;
  /** Quick note templates */
  quickTemplates: Array<{ label: string; text: string }>;
  /** Handle meal completion toggle */
  handleToggleMealCompletion: (mealId: string, isCompleted: boolean) => Promise<void>;
  /** Open notes modal for a meal */
  handleOpenNotes: (mealId: string) => void;
  /** Save meal notes */
  handleSaveNotes: () => Promise<void>;
  /** Close notes modal */
  handleCloseNotesModal: () => void;
  /** Insert bullet point in notes */
  insertBulletPoint: () => void;
  /** Insert template in notes */
  insertTemplate: (template: string) => void;
  /** Set editing notes */
  setEditingNotes: React.Dispatch<React.SetStateAction<string>>;
  /** Set show celebration toast */
  setShowCelebrationToast: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Quick note templates for meal notes
 */
const QUICK_TEMPLATES = [
  { label: 'Taste Notes', text: 'Taste: \n• \n• ' },
  { label: 'Modifications', text: 'Modifications:\n• \n• ' },
  { label: 'Prep Tips', text: 'Prep Tips:\n• \n• ' },
  { label: 'Rating', text: 'Rating: ⭐⭐⭐⭐⭐\n\nNotes: ' },
];

/**
 * Custom hook for meal completion and notes management
 * Handles completion status, celebration toasts, and meal notes
 */
export function useMealCompletion({
  hourlyMeals,
  weeklyPlan,
  mealCompletionStatus,
  mealNotes,
  setMealCompletionStatus,
  setMealNotes,
}: UseMealCompletionProps): UseMealCompletionReturn {
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingMealName, setEditingMealName] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState('');
  const [showCelebrationToast, setShowCelebrationToast] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');

  /**
   * Handle meal completion toggle with celebration
   */
  const handleToggleMealCompletion = async (mealId: string, isCompleted: boolean) => {
    try {
      await mealPlanApi.updateMealCompletion(mealId, isCompleted);
      setMealCompletionStatus(prev => ({
        ...prev,
        [mealId]: isCompleted,
      }));

      if (isCompleted) {
        // Find the meal name for celebration message
        // Check hourlyMeals first (24-hour view)
        let meal = Object.values(hourlyMeals)
          .flat()
          .find(m => m.mealPlanMealId === mealId);

        // If not found, check weeklyPlan (compact/collapsible views)
        if (!meal && weeklyPlan?.weeklyPlan) {
          const allMeals: any[] = [];
          Object.values(weeklyPlan.weeklyPlan).forEach((day: any) => {
            if (day?.meals) {
              if (day.meals.breakfast?.recipe) allMeals.push(day.meals.breakfast.recipe);
              if (day.meals.lunch?.recipe) allMeals.push(day.meals.lunch.recipe);
              if (day.meals.dinner?.recipe) allMeals.push(day.meals.dinner.recipe);
              if (day.meals.snacks) {
                day.meals.snacks.forEach((snack: any) => {
                  if (snack?.recipe) allMeals.push(snack.recipe);
                });
              }
            }
          });
          meal = allMeals.find(m => m.mealPlanMealId === mealId);
        }

        const mealName = meal?.name || meal?.title || 'Meal';

        // Show celebration
        setCelebrationMessage(`🎉 ${mealName} completed!`);
        setShowCelebrationToast(true);

        // Auto-hide toast after 2 seconds
        setTimeout(() => {
          setShowCelebrationToast(false);
        }, 2000);
      }

      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error updating meal completion:', error);
      Alert.alert('Error', 'Failed to update meal completion status');
    }
  };

  /**
   * Open notes modal for a meal
   */
  const handleOpenNotes = (mealId: string) => {
    // Find the meal to get its name
    let mealName = '';
    Object.values(hourlyMeals).forEach((meals) => {
      const meal = meals.find(m => m.mealPlanMealId === mealId);
      if (meal) {
        mealName = meal.name || meal.title || 'Meal';
      }
    });

    setEditingMealId(mealId);
    setEditingMealName(mealName);
    setEditingNotes(mealNotes[mealId] || '');
    setShowNotesModal(true);
  };

  /**
   * Insert bullet point at end of notes
   */
  const insertBulletPoint = () => {
    setEditingNotes(prev => prev + '\n• ');
  };

  /**
   * Insert template into notes
   */
  const insertTemplate = (template: string) => {
    setEditingNotes(prev => prev + (prev ? '\n\n' : '') + template);
  };

  /**
   * Save meal notes to backend
   */
  const handleSaveNotes = async () => {
    if (!editingMealId) return;

    try {
      await mealPlanApi.updateMealNotes(editingMealId, editingNotes);
      setMealNotes(prev => ({
        ...prev,
        [editingMealId]: editingNotes,
      }));
      setShowNotesModal(false);
      setEditingMealId(null);
      setEditingMealName('');
      setEditingNotes('');
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error saving meal notes:', error);
      Alert.alert('Error', 'Failed to save meal notes');
    }
  };

  /**
   * Close notes modal and reset state
   */
  const handleCloseNotesModal = () => {
    setShowNotesModal(false);
    setEditingMealId(null);
    setEditingMealName('');
    setEditingNotes('');
  };

  return {
    showNotesModal,
    editingMealId,
    editingMealName,
    editingNotes,
    showCelebrationToast,
    celebrationMessage,
    quickTemplates: QUICK_TEMPLATES,
    handleToggleMealCompletion,
    handleOpenNotes,
    handleSaveNotes,
    handleCloseNotesModal,
    insertBulletPoint,
    insertTemplate,
    setEditingNotes,
    setShowCelebrationToast,
  };
}
