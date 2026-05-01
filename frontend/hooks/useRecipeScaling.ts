// frontend/hooks/useRecipeScaling.ts
// Manages per-recipe serving multipliers and ingredient scaling for BuildFromRecipesSheet.

import { useState, useCallback } from 'react';
import { Recipe } from '../types';

type IngredientItem = string | { id: string; text: string; order: number };

export interface RecipeScaling {
  servingsByRecipe: Record<string, number>;
  setServings: (recipeId: string, multiplier: number) => void;
  getScaledIngredients: (recipe: Pick<Recipe, 'id' | 'ingredients'>, multiplier: number) => string[];
}

// Parse a numeric prefix from an ingredient string.
// Handles: integers, decimals, fractions (1/2), mixed numbers (1 1/2).
// Returns { amount: number, rest: string } or null when no leading number found.
function parseLeadingAmount(text: string): { amount: number; rest: string } | null {
  const trimmed = text.trim();

  // Mixed number: "1 1/2 cups" — whole + fraction separated by a space
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)([\s\S]*)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    const rest = mixedMatch[4];
    return { amount: whole + num / den, rest };
  }

  // Plain fraction: "1/2 tsp"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)([\s\S]*)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10);
    const den = parseInt(fractionMatch[2], 10);
    const rest = fractionMatch[3];
    return { amount: num / den, rest };
  }

  // Decimal or integer: "1.5 cups" / "3 eggs"
  const numberMatch = trimmed.match(/^(\d+(?:\.\d+)?)([\s\S]*)$/);
  if (numberMatch) {
    const amount = parseFloat(numberMatch[1]);
    const rest = numberMatch[2];
    return { amount, rest };
  }

  return null;
}

// Format a scaled numeric result cleanly (avoid trailing .0, limit precision).
function formatAmount(value: number): string {
  if (value === Math.floor(value)) return String(Math.floor(value));
  // Up to 2 decimal places, strip trailing zeros
  return parseFloat(value.toFixed(2)).toString();
}

function scaleIngredientText(text: string, multiplier: number): string {
  const parsed = parseLeadingAmount(text);
  if (parsed === null) return text;

  const scaled = parsed.amount * multiplier;
  return `${formatAmount(scaled)}${parsed.rest}`;
}

function extractIngredientText(item: IngredientItem): string {
  if (typeof item === 'string') return item;
  return item.text;
}

export function useRecipeScaling(): RecipeScaling {
  const [servingsByRecipe, setServingsByRecipe] = useState<Record<string, number>>({});

  const setServings = useCallback((recipeId: string, multiplier: number) => {
    setServingsByRecipe(prev => ({ ...prev, [recipeId]: multiplier }));
  }, []);

  const getScaledIngredients = useCallback(
    (recipe: Pick<Recipe, 'id' | 'ingredients'>, multiplier: number): string[] => {
      const ingredients = recipe.ingredients as IngredientItem[];
      return ingredients.map(item => {
        const text = extractIngredientText(item);
        return scaleIngredientText(text, multiplier);
      });
    },
    []
  );

  return { servingsByRecipe, setServings, getScaledIngredients };
}
