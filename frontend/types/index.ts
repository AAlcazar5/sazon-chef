// Core Recipe Types

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

export interface RecipeScore {
  total: number;
  macroScore: number;
  tasteScore: number;
  matchPercentage: number;
  breakdown?: {
    macroMatch: number;
    tasteMatch: number;
    cookTimeMatch: number;
    ingredientMatch: number;
  };
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cookTime: number;
  cuisine: string;
  imageUrl?: string;
  // Macro nutrients - match backend structure
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  // Recipe content - handle both string[] and object formats
  ingredients: string[] | Array<{ id: string; text: string; order: number }>;
  instructions: string[] | Array<{ id: string; text: string; step: number }>;
  // Recipe source tracking
  source?: 'database' | 'user-created' | 'ai-generated' | 'external';
  isUserCreated?: boolean;
  // Optional timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface SuggestedRecipe extends Recipe {
  score: RecipeScore;
}

export interface SavedRecipe extends Recipe {
  savedDate: string;
}

// User & Preferences Types

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserPreferences {
  bannedIngredients: string[];
  likedCuisines: string[];
  dietaryRestrictions: string[];
  cookTimePreference: number; // in minutes
  healthGoals?: string[]; // e.g., ['weight-loss', 'muscle-gain', 'maintenance']
  spiceLevel?: 'mild' | 'medium' | 'spicy';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  macroGoals: MacroGoals;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotifications {
  mealReminders: boolean;
  newRecipes: boolean;
  goalUpdates: boolean;
}

// Component Prop Types

export interface FeedbackButtonsProps {
  recipeId: string;
  onLike?: (recipeId: string) => void;
  onDislike?: (recipeId: string) => void;
  initialLiked?: boolean;
  initialDisliked?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface FeedbackState {
  liked: boolean;
  disliked: boolean;
}

export interface RecipeCardProps {
  recipe: Recipe | SuggestedRecipe;
  variant?: 'default' | 'compact' | 'featured';
  showFeedback?: boolean;
  onLike?: (recipeId: string) => void;
  onDislike?: (recipeId: string) => void;
}

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export interface MacroPillProps {
  type: 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar';
  value: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'default' | 'outline' | 'subtle';
}

// API Types

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Hook Types

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface UseApiReturn<T> extends ApiState<T> {
  execute: (url?: string, options?: any) => Promise<void>;
  refetch: () => Promise<void>;
  clearError: () => void;
  clearData: () => void;
}

export interface MutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export interface UseMutationReturn<T, V> {
  execute: (variables: V) => Promise<T | null>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export interface UsePaginatedApiOptions extends UseApiOptions {
  page?: number;
  pageSize?: number;
}

// Meal Planning Types

export interface DailySuggestion {
  date: string;
  recipe: SuggestedRecipe;
  consumed?: boolean;
  feedback?: 'liked' | 'disliked' | null;
}

export interface WeeklyPlan {
  weekStart: string;
  weekEnd: string;
  days: DailySuggestion[];
  shoppingList?: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  purchased: boolean;
}

// Recipe Feedback & Scoring Types

export interface RecipeFeedback {
  recipeId: string;
  userId: string;
  liked: boolean;
  disliked: boolean;
  saved: boolean;
  consumed: boolean;
  createdAt: string;
}

export interface ScoringWeights {
  macroWeight: number; // 0.7 for 70%
  tasteWeight: number; // 0.3 for 30%
  cookTimeWeight?: number;
  ingredientMatchWeight?: number;
}

// Form & Input Types

export interface RecipeFormData {
  title: string;
  description: string;
  cookTime: number;
  ingredients: string[];
  instructions: string[];
  cuisine: string;
  macros: MacroNutrients;
}

export interface UserPreferencesFormData {
  bannedIngredients: string[];
  likedCuisines: string[];
  dietaryRestrictions: string[];
  cookTimePreference: number;
  healthGoals?: string[];
  spiceLevel?: 'mild' | 'medium' | 'spicy';
}

export interface MacroGoalsFormData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserPhysicalProfile {
  id: string;
  userId: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  fitnessGoal: 'lose_weight' | 'maintain' | 'gain_muscle' | 'gain_weight';
  bmr?: number;
  tdee?: number;
  targetWeightKg?: number;
  bodyFatPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MacroCalculations {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
}

// Navigation Types

export interface RootStackParamList {
  screens: undefined;
  modal: { id: string };
  // Add other screens as needed
}

// Utility Types

export type CuisineType = 
  | 'Asian' 
  | 'Mediterranean' 
  | 'Mexican' 
  | 'American' 
  | 'Italian' 
  | 'Indian' 
  | 'Middle Eastern' 
  | 'Latin American'
  | 'Other';

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'shellfish-free'
  | 'kosher'
  | 'halal';

export type HealthGoal =
  | 'weight-loss'
  | 'muscle-gain'
  | 'maintenance'
  | 'heart-healthy'
  | 'diabetic-friendly'
  | 'low-sodium'
  | 'high-fiber';