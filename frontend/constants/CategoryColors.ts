// frontend/constants/CategoryColors.ts
// Distinct colored backgrounds per food category — soft pastels + darker text
// Inspired by KOJO, Hi Chriz, and multiple food apps

export interface CategoryColor {
  bg: string;
  bgDark: string;
  text: string;
  textDark: string;
  /** 15% opacity tint for inactive state */
  tint: string;
  tintDark: string;
  emoji: string;
}

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  // Cuisines
  Italian: { bg: '#FDEBD0', bgDark: '#3E2723', text: '#8B4513', textDark: '#FDEBD0', tint: 'rgba(253,235,208,0.15)', tintDark: 'rgba(62,39,35,0.3)', emoji: '🍝' },
  Mexican: { bg: '#FCE4EC', bgDark: '#4A1A2E', text: '#C62828', textDark: '#FCE4EC', tint: 'rgba(252,228,236,0.15)', tintDark: 'rgba(74,26,46,0.3)', emoji: '🌮' },
  Japanese: { bg: '#E8F5E9', bgDark: '#1B3A1F', text: '#2E7D32', textDark: '#E8F5E9', tint: 'rgba(232,245,233,0.15)', tintDark: 'rgba(27,58,31,0.3)', emoji: '🍱' },
  Chinese: { bg: '#FFF3E0', bgDark: '#3E2B1A', text: '#E65100', textDark: '#FFF3E0', tint: 'rgba(255,243,224,0.15)', tintDark: 'rgba(62,43,26,0.3)', emoji: '🥡' },
  Indian: { bg: '#FFF8E1', bgDark: '#3E3A1A', text: '#F57F17', textDark: '#FFF8E1', tint: 'rgba(255,248,225,0.15)', tintDark: 'rgba(62,58,26,0.3)', emoji: '🍛' },
  Thai: { bg: '#F3E5F5', bgDark: '#2A1A3E', text: '#7B1FA2', textDark: '#F3E5F5', tint: 'rgba(243,229,245,0.15)', tintDark: 'rgba(42,26,62,0.3)', emoji: '🍜' },
  Korean: { bg: '#FFEBEE', bgDark: '#3E1A1A', text: '#C62828', textDark: '#FFEBEE', tint: 'rgba(255,235,238,0.15)', tintDark: 'rgba(62,26,26,0.3)', emoji: '🥘' },
  Mediterranean: { bg: '#E0F2F1', bgDark: '#1A3A38', text: '#00695C', textDark: '#E0F2F1', tint: 'rgba(224,242,241,0.15)', tintDark: 'rgba(26,58,56,0.3)', emoji: '🫒' },
  American: { bg: '#FBE9E7', bgDark: '#3E2420', text: '#BF360C', textDark: '#FBE9E7', tint: 'rgba(251,233,231,0.15)', tintDark: 'rgba(62,36,32,0.3)', emoji: '🍔' },
  French: { bg: '#EDE7F6', bgDark: '#1A1A3E', text: '#4527A0', textDark: '#EDE7F6', tint: 'rgba(237,231,246,0.15)', tintDark: 'rgba(26,26,62,0.3)', emoji: '🥐' },
  Greek: { bg: '#E3F2FD', bgDark: '#1A2A3E', text: '#1565C0', textDark: '#E3F2FD', tint: 'rgba(227,242,253,0.15)', tintDark: 'rgba(26,42,62,0.3)', emoji: '🥗' },
  Vietnamese: { bg: '#F1F8E9', bgDark: '#1F3A1A', text: '#558B2F', textDark: '#F1F8E9', tint: 'rgba(241,248,233,0.15)', tintDark: 'rgba(31,58,26,0.3)', emoji: '🍲' },
  Ethiopian: { bg: '#FFF9C4', bgDark: '#3E3A10', text: '#F9A825', textDark: '#FFF9C4', tint: 'rgba(255,249,196,0.15)', tintDark: 'rgba(62,58,16,0.3)', emoji: '🫓' },
  Caribbean: { bg: '#E0F7FA', bgDark: '#1A3A3E', text: '#00838F', textDark: '#E0F7FA', tint: 'rgba(224,247,250,0.15)', tintDark: 'rgba(26,58,62,0.3)', emoji: '🥥' },

  // Meal types
  Breakfast: { bg: '#FFFDE7', bgDark: '#3E3A10', text: '#F57F17', textDark: '#FFFDE7', tint: 'rgba(255,253,231,0.15)', tintDark: 'rgba(62,58,16,0.3)', emoji: '🍳' },
  Lunch: { bg: '#E8F5E9', bgDark: '#1B3A1F', text: '#2E7D32', textDark: '#E8F5E9', tint: 'rgba(232,245,233,0.15)', tintDark: 'rgba(27,58,31,0.3)', emoji: '🥪' },
  Dinner: { bg: '#EDE7F6', bgDark: '#1A1A3E', text: '#4527A0', textDark: '#EDE7F6', tint: 'rgba(237,231,246,0.15)', tintDark: 'rgba(26,26,62,0.3)', emoji: '🍽️' },
  Snack: { bg: '#FFF3E0', bgDark: '#3E2B1A', text: '#E65100', textDark: '#FFF3E0', tint: 'rgba(255,243,224,0.15)', tintDark: 'rgba(62,43,26,0.3)', emoji: '🍿' },
  Dessert: { bg: '#F3E5F5', bgDark: '#2A1A3E', text: '#7B1FA2', textDark: '#F3E5F5', tint: 'rgba(243,229,245,0.15)', tintDark: 'rgba(42,26,62,0.3)', emoji: '🍰' },
  Salad: { bg: '#E8F5E9', bgDark: '#1B3A1F', text: '#2E7D32', textDark: '#E8F5E9', tint: 'rgba(232,245,233,0.15)', tintDark: 'rgba(27,58,31,0.3)', emoji: '🥗' },
  Soup: { bg: '#FFF8E1', bgDark: '#3E3A1A', text: '#F57F17', textDark: '#FFF8E1', tint: 'rgba(255,248,225,0.15)', tintDark: 'rgba(62,58,26,0.3)', emoji: '🍲' },
  Smoothie: { bg: '#FCE4EC', bgDark: '#4A1A2E', text: '#C62828', textDark: '#FCE4EC', tint: 'rgba(252,228,236,0.15)', tintDark: 'rgba(74,26,46,0.3)', emoji: '🥤' },
  'Meal Prep': { bg: '#E3F2FD', bgDark: '#1A2A3E', text: '#1565C0', textDark: '#E3F2FD', tint: 'rgba(227,242,253,0.15)', tintDark: 'rgba(26,42,62,0.3)', emoji: '📦' },
  'High Protein': { bg: '#E0F2F1', bgDark: '#1A3A38', text: '#00695C', textDark: '#E0F2F1', tint: 'rgba(224,242,241,0.15)', tintDark: 'rgba(26,58,56,0.3)', emoji: '💪' },
  'Low Carb': { bg: '#F1F8E9', bgDark: '#1F3A1A', text: '#558B2F', textDark: '#F1F8E9', tint: 'rgba(241,248,233,0.15)', tintDark: 'rgba(31,58,26,0.3)', emoji: '🥑' },
  Vegan: { bg: '#E8F5E9', bgDark: '#1B3A1F', text: '#2E7D32', textDark: '#E8F5E9', tint: 'rgba(232,245,233,0.15)', tintDark: 'rgba(27,58,31,0.3)', emoji: '🌱' },

  // Attribute tags
  quick: { bg: '#E3F2FD', bgDark: '#1A2A3E', text: '#1565C0', textDark: '#E3F2FD', tint: 'rgba(227,242,253,0.15)', tintDark: 'rgba(26,42,62,0.3)', emoji: '⚡' },
  healthy: { bg: '#E8F5E9', bgDark: '#1B3A1F', text: '#2E7D32', textDark: '#E8F5E9', tint: 'rgba(232,245,233,0.15)', tintDark: 'rgba(27,58,31,0.3)', emoji: '💪' },
  budget: { bg: '#FFF8E1', bgDark: '#3E3A1A', text: '#F57F17', textDark: '#FFF8E1', tint: 'rgba(255,248,225,0.15)', tintDark: 'rgba(62,58,26,0.3)', emoji: '💰' },
};

/** Get category color config, with a neutral fallback for unknown categories */
export function getCategoryColor(category: string): CategoryColor {
  return CATEGORY_COLORS[category] ?? {
    bg: '#F5F5F5',
    bgDark: '#2C2C2E',
    text: '#616161',
    textDark: '#E0E0E0',
    tint: 'rgba(245,245,245,0.15)',
    tintDark: 'rgba(44,44,46,0.3)',
    emoji: '🍴',
  };
}
