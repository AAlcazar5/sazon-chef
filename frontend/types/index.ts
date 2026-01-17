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
  costScore?: number;
  breakdown?: {
    macroMatch: number;
    tasteMatch: number;
    cookTimeMatch: number;
    ingredientMatch: number;
  };
  healthGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  healthGradeScore?: number;
  healthGradeBreakdown?: {
    macronutrientBalance: number;
    calorieDensity: number;
    nutrientDensity: number;
    ingredientQuality: number;
    sugarAndSodium: number;
  };
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cookTime: number;
  cuisine: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  servings?: number; // Number of servings (defaults to 1)
  imageUrl?: string;
  // Macro nutrients - match backend structure
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  // Cost tracking (Phase 6, Group 13)
  estimatedCost?: number;
  estimatedCostPerServing?: number;
  costSource?: 'user' | 'api' | 'calculated' | 'estimated';
  pricePerServing?: number; // From external APIs
  // Recipe content - handle both string[] and object formats
  ingredients: string[] | Array<{ id: string; text: string; order: number }>;
  instructions: string[] | Array<{ id: string; text: string; step: number }>;
  // Recipe source tracking
  source?: 'database' | 'user-created' | 'ai-generated' | 'external';
  isUserCreated?: boolean;
  // Meal prep suitability (Phase 6, Group 14)
  mealPrepSuitable?: boolean;
  freezable?: boolean;
  batchFriendly?: boolean;
  weeklyPrepFriendly?: boolean;
  mealPrepScore?: number;
  // Storage instructions
  storageInstructions?: string;
  fridgeStorageDays?: number;
  freezerStorageMonths?: number;
  shelfStable?: boolean;
  // Health grade (Phase 6)
  healthGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  healthGradeScore?: number;
  healthGradeBreakdown?: {
    macronutrientBalance: number;
    calorieDensity: number;
    nutrientDensity: number;
    ingredientQuality: number;
    sugarAndSodium: number;
  };
  // Nutritional analysis (Phase 6, Group 12)
  nutritionalAnalysis?: {
    micronutrients: {
      vitamins: {
        vitaminA: number;
        vitaminC: number;
        vitaminD: number;
        vitaminE: number;
        vitaminK: number;
        thiamine: number;
        riboflavin: number;
        niacin: number;
        vitaminB6: number;
        folate: number;
        vitaminB12: number;
      };
      minerals: {
        calcium: number;
        iron: number;
        magnesium: number;
        phosphorus: number;
        potassium: number;
        zinc: number;
        copper: number;
        manganese: number;
        selenium: number;
      };
    };
    omega3: {
      totalOmega3: number;
      epa: number;
      dha: number;
      ala: number;
      omega3Score: number;
    };
    antioxidants: {
      totalAntioxidants: number;
      oracValue: number;
      polyphenols: number;
      flavonoids: number;
      carotenoids: number;
      vitaminC: number;
      vitaminE: number;
      antioxidantScore: number;
    };
    nutritionalDensityScore: number;
    keyNutrients: string[];
    nutrientGaps: string[];
  };
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

export interface NotificationHistoryEntry {
  type: 'mealReminders' | 'newRecipes' | 'goalUpdates';
  sentAt: string; // ISO timestamp
  status: 'success' | 'failed' | 'pending';
  message?: string;
}

export interface UserNotifications {
  mealReminders: boolean;
  mealReminderTimes?: string[]; // Array of times in HH:mm format (e.g., ["08:00", "12:00", "18:00"])
  newRecipes: boolean;
  goalUpdates: boolean;
  goalUpdateDay?: string; // Day of week for goal updates (e.g., "Monday")
  goalUpdateTime?: string; // Time for goal updates in HH:mm format
  // History tracking
  lastMealReminderSent?: string; // ISO timestamp
  lastNewRecipeSent?: string; // ISO timestamp
  lastGoalUpdateSent?: string; // ISO timestamp
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
  category?: string;
  purchased: boolean;
  notes?: string;
  recipeId?: string;
  recipe?: Recipe;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: ShoppingListItem[];
}

export interface ShoppingAppIntegration {
  id: string;
  userId: string;
  appName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportedShoppingApp {
  name: string;
  displayName: string;
  requiresAuth: boolean;
}

export interface IngredientCost {
  id: string;
  userId: string;
  ingredientName: string;
  unitCost: number;
  unit: string;
  store?: string;
  location?: string;
  lastUpdated: string;
  createdAt: string;
}

export interface BudgetSettings {
  maxRecipeCost?: number;
  maxMealCost?: number;
  maxDailyFoodBudget?: number;
  currency: string;
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