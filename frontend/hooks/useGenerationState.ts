// frontend/hooks/useGenerationState.ts
// Custom hook for managing AI generation state and modals

import { useState, Dispatch, SetStateAction } from 'react';

interface SuccessMessage {
  title: string;
  message: string;
}

interface UseGenerationStateReturn {
  /** Whether meal plan is being generated */
  generatingPlan: boolean;
  /** Whether meal/snack selector modal is visible */
  showMealSnackSelector: boolean;
  /** Number of meals selected for generation */
  selectedMeals: number;
  /** Number of snacks selected for generation */
  selectedSnacks: number;
  /** Maximum total prep time (minutes) */
  maxTotalPrepTime: number;
  /** Maximum weekly budget (dollars) */
  maxWeeklyBudget: number | null;
  /** Type of generation: full day or weekly */
  generationType: 'fullDay' | 'weekly' | null;
  /** Whether day meals modal is visible */
  showDayMealsModal: boolean;
  /** Date selected for day meals modal */
  selectedDayForModal: Date | null;
  /** Whether shopping list is being generated */
  generatingShoppingList: boolean;
  /** Whether success modal is visible */
  showSuccessModal: boolean;
  /** Success modal message */
  successMessage: SuccessMessage;
  /** Whether shopping list success modal is visible */
  showShoppingListSuccessModal: boolean;
  /** Shopping list success message */
  shoppingListSuccessMessage: SuccessMessage;
  /** Whether shopping list name modal is visible */
  showShoppingListNameModal: boolean;
  /** Shopping list name */
  shoppingListName: string;
  /** Set generating plan state */
  setGeneratingPlan: Dispatch<SetStateAction<boolean>>;
  /** Set meal/snack selector visibility */
  setShowMealSnackSelector: Dispatch<SetStateAction<boolean>>;
  /** Set selected meals count */
  setSelectedMeals: Dispatch<SetStateAction<number>>;
  /** Set selected snacks count */
  setSelectedSnacks: Dispatch<SetStateAction<number>>;
  /** Set max total prep time */
  setMaxTotalPrepTime: Dispatch<SetStateAction<number>>;
  /** Set max weekly budget */
  setMaxWeeklyBudget: Dispatch<SetStateAction<number | null>>;
  /** Set generation type */
  setGenerationType: Dispatch<SetStateAction<'fullDay' | 'weekly' | null>>;
  /** Set day meals modal visibility */
  setShowDayMealsModal: Dispatch<SetStateAction<boolean>>;
  /** Set selected day for modal */
  setSelectedDayForModal: Dispatch<SetStateAction<Date | null>>;
  /** Set generating shopping list state */
  setGeneratingShoppingList: Dispatch<SetStateAction<boolean>>;
  /** Set success modal visibility */
  setShowSuccessModal: Dispatch<SetStateAction<boolean>>;
  /** Set success message */
  setSuccessMessage: Dispatch<SetStateAction<SuccessMessage>>;
  /** Set shopping list success modal visibility */
  setShowShoppingListSuccessModal: Dispatch<SetStateAction<boolean>>;
  /** Set shopping list success message */
  setShoppingListSuccessMessage: Dispatch<SetStateAction<SuccessMessage>>;
  /** Set shopping list name modal visibility */
  setShowShoppingListNameModal: Dispatch<SetStateAction<boolean>>;
  /** Set shopping list name */
  setShoppingListName: Dispatch<SetStateAction<string>>;
}

/**
 * Custom hook for managing AI generation state
 * Handles meal plan generation, shopping list generation, and related modals
 */
export function useGenerationState(): UseGenerationStateReturn {
  // AI Generation state
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showMealSnackSelector, setShowMealSnackSelector] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState(3);
  const [selectedSnacks, setSelectedSnacks] = useState(1);
  const [maxTotalPrepTime, setMaxTotalPrepTime] = useState(60); // Default: 60 minutes
  const [maxWeeklyBudget, setMaxWeeklyBudget] = useState<number | null>(null);
  const [generationType, setGenerationType] = useState<'fullDay' | 'weekly' | null>(null);
  const [showDayMealsModal, setShowDayMealsModal] = useState(false);
  const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);

  // Shopping list generation state
  const [generatingShoppingList, setGeneratingShoppingList] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<SuccessMessage>({ title: '', message: '' });

  // Shopping list success state
  const [showShoppingListSuccessModal, setShowShoppingListSuccessModal] = useState(false);
  const [shoppingListSuccessMessage, setShoppingListSuccessMessage] = useState<SuccessMessage>({
    title: '',
    message: ''
  });
  const [showShoppingListNameModal, setShowShoppingListNameModal] = useState(false);
  const [shoppingListName, setShoppingListName] = useState('');

  return {
    generatingPlan,
    showMealSnackSelector,
    selectedMeals,
    selectedSnacks,
    maxTotalPrepTime,
    maxWeeklyBudget,
    generationType,
    showDayMealsModal,
    selectedDayForModal,
    generatingShoppingList,
    showSuccessModal,
    successMessage,
    showShoppingListSuccessModal,
    shoppingListSuccessMessage,
    showShoppingListNameModal,
    shoppingListName,
    setGeneratingPlan,
    setShowMealSnackSelector,
    setSelectedMeals,
    setSelectedSnacks,
    setMaxTotalPrepTime,
    setMaxWeeklyBudget,
    setGenerationType,
    setShowDayMealsModal,
    setSelectedDayForModal,
    setGeneratingShoppingList,
    setShowSuccessModal,
    setSuccessMessage,
    setShowShoppingListSuccessModal,
    setShoppingListSuccessMessage,
    setShowShoppingListNameModal,
    setShoppingListName,
  };
}
