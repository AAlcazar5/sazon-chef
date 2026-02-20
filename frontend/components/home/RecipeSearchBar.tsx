// frontend/components/home/RecipeSearchBar.tsx
// Enhanced search bar with auto-complete suggestions, search history, and popular searches

import { View, Text, TextInput, ScrollView } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { useSearchAutocomplete, type SearchSuggestion } from '../../hooks/useSearchAutocomplete';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { usePopularSearches, type PopularSearch } from '../../hooks/usePopularSearches';

interface RecipeSearchBarProps {
  /** Current search query value */
  value: string;
  /** Called when search text changes */
  onChangeText: (text: string) => void;
  /** Called when clear button is pressed */
  onClear: () => void;
  /** Called when a suggestion is selected (fills + submits search) */
  onSelectSuggestion?: (text: string) => void;
  /** Called when search is submitted */
  onSubmitSearch?: (query: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Pre-fetched popular searches from consolidated home feed — skips API call if provided */
  initialPopularSearches?: PopularSearch[];
}

/** Render text with a highlighted portion bolded */
function HighlightedText({
  text,
  highlight,
  isDark,
}: {
  text: string;
  highlight: { start: number; end: number };
  isDark: boolean;
}) {
  const before = text.slice(0, highlight.start);
  const match = text.slice(highlight.start, highlight.end);
  const after = text.slice(highlight.end);
  return (
    <Text
      className="text-sm text-gray-800 dark:text-gray-200"
      numberOfLines={1}
    >
      {before}
      <Text style={{ fontWeight: '700', color: isDark ? DarkColors.primary : Colors.primary }}>
        {match}
      </Text>
      {after}
    </Text>
  );
}

const SUGGESTION_TYPE_ICON: Record<string, string> = {
  recipe: Icons.RESTAURANT_OUTLINE,
  cuisine: Icons.GLOBE_OUTLINE,
  ingredient: Icons.NUTRITION_OUTLINE,
};

export default function RecipeSearchBar({
  value,
  onChangeText,
  onClear,
  onSelectSuggestion,
  onSubmitSearch,
  placeholder = 'Search recipes, ingredients, tags...',
  initialPopularSearches,
}: RecipeSearchBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isFocused, setIsFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const { suggestions, loading: suggestionsLoading, getSuggestions, clearSuggestions } =
    useSearchAutocomplete();
  const { searchHistory, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const { popularSearches } = usePopularSearches({ initialData: initialPopularSearches });

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
      getSuggestions(text);
    },
    [onChangeText, getSuggestions],
  );

  const handleClear = () => {
    onClear();
    clearSuggestions();
    HapticPatterns.buttonPress();
  };

  const handleSelectSuggestion = (text: string) => {
    onChangeText(text);
    clearSuggestions();
    addToHistory(text);
    setIsFocused(false);
    inputRef.current?.blur();
    HapticPatterns.buttonPress();
    onSelectSuggestion?.(text);
  };

  const handleSubmit = () => {
    if (value.trim().length > 0) {
      addToHistory(value.trim());
      clearSuggestions();
      setIsFocused(false);
      inputRef.current?.blur();
      onSubmitSearch?.(value.trim());
    }
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delay blur to allow tap events on dropdown items
    blurTimeoutRef.current = setTimeout(() => setIsFocused(false), 200);
  };

  const showDropdown = isFocused;
  const hasSuggestions = value.trim().length >= 2 && suggestions.length > 0;
  const showHistory = value.trim().length < 2 && searchHistory.length > 0;
  const showPopular = value.trim().length < 2 && !showHistory && popularSearches.length > 0;
  const showHistoryAndPopular = value.trim().length < 2 && searchHistory.length > 0 && popularSearches.length > 0;

  return (
    <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700"
      style={{ zIndex: 50 }}
    >
      {/* Search input row */}
      <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2.5">
        <Icon
          name={Icons.SEARCH}
          size={IconSizes.MD}
          color={isDark ? '#9CA3AF' : '#6B7280'}
          accessibilityLabel="Search"
          style={{ marginRight: 8 }}
        />
        <TextInput
          ref={inputRef}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          className="flex-1 text-gray-900 dark:text-gray-100 text-base"
          style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
          returnKeyType="search"
          accessibilityLabel="Search recipes"
          accessibilityHint="Enter text to search for recipes"
        />
        {value.length > 0 && (
          <HapticTouchableOpacity onPress={handleClear} className="ml-2">
            <Icon
              name={Icons.CLOSE_CIRCLE}
              size={IconSizes.SM}
              color={isDark ? '#9CA3AF' : '#6B7280'}
              accessibilityLabel="Clear search"
            />
          </HapticTouchableOpacity>
        )}
      </View>

      {/* Results label */}
      {value.length > 0 && !isFocused && (
        <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2 ml-1">
          Results for &quot;{value}&quot;
        </Text>
      )}

      {/* Dropdown */}
      {showDropdown && (hasSuggestions || showHistory || showPopular || showHistoryAndPopular) && (
        <View
          className="bg-white dark:bg-gray-800 rounded-b-xl border border-t-0 border-gray-200 dark:border-gray-700 mt-1"
          style={{
            maxHeight: 320,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            {/* Auto-complete suggestions */}
            {hasSuggestions && (
              <>
                {suggestions.map((s, i) => (
                  <HapticTouchableOpacity
                    key={`${s.type}-${s.text}-${i}`}
                    onPress={() => handleSelectSuggestion(s.text)}
                    className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700"
                  >
                    <Icon
                      name={SUGGESTION_TYPE_ICON[s.type] as any}
                      size={16}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                      style={{ marginRight: 12 }}
                    />
                    <View className="flex-1">
                      <HighlightedText
                        text={s.text}
                        highlight={s.highlight}
                        isDark={isDark}
                      />
                      {s.metadata?.cuisine && s.type === 'recipe' && (
                        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {s.metadata.cuisine}
                        </Text>
                      )}
                    </View>
                    <Icon
                      name={Icons.CHEVRON_FORWARD as any}
                      size={14}
                      color={isDark ? '#4B5563' : '#D1D5DB'}
                    />
                  </HapticTouchableOpacity>
                ))}
              </>
            )}

            {/* Search history */}
            {(showHistory || showHistoryAndPopular) && (
              <>
                <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
                  <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Recent
                  </Text>
                  <HapticTouchableOpacity onPress={clearHistory}>
                    <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      Clear All
                    </Text>
                  </HapticTouchableOpacity>
                </View>
                {searchHistory.map((q) => (
                  <HapticTouchableOpacity
                    key={q}
                    onPress={() => handleSelectSuggestion(q)}
                    className="flex-row items-center px-4 py-2.5 border-b border-gray-100 dark:border-gray-700"
                  >
                    <Icon
                      name={Icons.TIME_OUTLINE as any}
                      size={16}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                      style={{ marginRight: 12 }}
                    />
                    <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200" numberOfLines={1}>
                      {q}
                    </Text>
                    <HapticTouchableOpacity
                      onPress={() => removeFromHistory(q)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon
                        name={Icons.CLOSE as any}
                        size={14}
                        color={isDark ? '#4B5563' : '#D1D5DB'}
                      />
                    </HapticTouchableOpacity>
                  </HapticTouchableOpacity>
                ))}
              </>
            )}

            {/* Popular searches */}
            {(showPopular || (showHistoryAndPopular && popularSearches.length > 0)) && (
              <>
                <View className="px-4 pt-3 pb-1">
                  <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Popular
                  </Text>
                </View>
                {popularSearches.map((p) => (
                  <HapticTouchableOpacity
                    key={p.query}
                    onPress={() => handleSelectSuggestion(p.query)}
                    className="flex-row items-center px-4 py-2.5 border-b border-gray-100 dark:border-gray-700"
                  >
                    <Icon
                      name={Icons.FLAME as any}
                      size={16}
                      color={isDark ? DarkColors.primary : Colors.primary}
                      style={{ marginRight: 12 }}
                    />
                    <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200" numberOfLines={1}>
                      {p.query}
                    </Text>
                  </HapticTouchableOpacity>
                ))}
              </>
            )}

            {/* Loading indicator */}
            {suggestionsLoading && value.trim().length >= 2 && suggestions.length === 0 && (
              <View className="px-4 py-4 items-center">
                <Text className="text-sm text-gray-400 dark:text-gray-500">Searching...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
