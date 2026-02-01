// frontend/app/create-shopping-list.tsx
// Screen for creating a new shopping list with items

import { View, Text, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../components/ui/AnimatedActivityIndicator';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import Icon from '../components/ui/Icon';
import { Icons, IconSizes } from '../constants/Icons';
import { Colors, DarkColors } from '../constants/Colors';
import { shoppingListApi } from '../lib/api';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
}

// Common grocery categories for auto-detection
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Produce': ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'onion', 'garlic', 'potato', 'carrot', 'broccoli', 'spinach', 'kale', 'avocado', 'pepper', 'cucumber', 'celery', 'mushroom', 'lemon', 'lime', 'berry', 'grape', 'melon', 'mango', 'pineapple', 'strawberry', 'blueberry', 'raspberry', 'peach', 'pear', 'plum', 'cherry', 'ginger', 'herbs', 'basil', 'cilantro', 'parsley', 'mint', 'thyme', 'rosemary', 'zucchini', 'squash', 'corn', 'peas', 'beans', 'asparagus', 'cabbage', 'cauliflower', 'eggplant', 'beet', 'radish', 'turnip', 'leek', 'scallion', 'shallot', 'arugula', 'chard', 'collard', 'endive', 'fennel', 'artichoke', 'fruit', 'vegetable', 'salad'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'steak', 'ground', 'turkey', 'lamb', 'bacon', 'sausage', 'ham', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop', 'tilapia', 'cod', 'halibut', 'trout', 'mahi', 'snapper', 'catfish', 'clam', 'mussel', 'oyster', 'squid', 'octopus', 'anchovy', 'sardine', 'meat', 'seafood', 'poultry', 'ribs', 'roast', 'chop', 'tenderloin', 'brisket', 'wings', 'thigh', 'breast', 'drumstick'],
  'Dairy & Eggs': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'sour cream', 'cottage', 'ricotta', 'mozzarella', 'cheddar', 'parmesan', 'feta', 'gouda', 'brie', 'swiss', 'provolone', 'jack', 'colby', 'american', 'cream cheese', 'half and half', 'whipping', 'heavy cream', 'buttermilk', 'kefir', 'ghee', 'dairy'],
  'Bakery': ['bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'tortilla', 'pita', 'naan', 'baguette', 'sourdough', 'ciabatta', 'focaccia', 'brioche', 'english muffin', 'crumpet', 'flatbread', 'wrap', 'cake', 'pie', 'pastry', 'donut', 'danish', 'scone', 'cookie', 'brownie', 'cupcake', 'bakery'],
  'Pantry': ['rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'spice', 'seasoning', 'broth', 'stock', 'can', 'bean', 'lentil', 'chickpea', 'quinoa', 'oat', 'cereal', 'granola', 'nut', 'seed', 'peanut butter', 'almond butter', 'jam', 'jelly', 'honey', 'maple', 'syrup', 'ketchup', 'mustard', 'mayo', 'mayonnaise', 'soy sauce', 'hot sauce', 'bbq', 'salsa', 'dressing', 'marinade', 'coconut', 'chocolate', 'cocoa', 'baking', 'yeast', 'baking powder', 'baking soda', 'vanilla', 'extract', 'cornstarch', 'breadcrumb', 'cracker', 'chip', 'pretzel', 'popcorn', 'dried', 'canned', 'tomato sauce', 'tomato paste', 'olive oil', 'vegetable oil', 'canola'],
  'Frozen': ['frozen', 'ice cream', 'pizza', 'french fries', 'frozen vegetable', 'frozen fruit', 'frozen dinner', 'popsicle', 'sorbet', 'gelato', 'frozen yogurt', 'waffle', 'pancake', 'frozen fish', 'frozen chicken', 'frozen shrimp', 'frozen berries', 'ice'],
  'Beverages': ['water', 'juice', 'soda', 'pop', 'cola', 'coffee', 'tea', 'beer', 'wine', 'spirit', 'liquor', 'whiskey', 'vodka', 'rum', 'gin', 'tequila', 'energy drink', 'sports drink', 'sparkling', 'seltzer', 'lemonade', 'iced tea', 'milk alternative', 'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'smoothie', 'shake', 'drink', 'beverage'],
  'Household': ['paper towel', 'toilet paper', 'tissue', 'napkin', 'trash bag', 'aluminum foil', 'plastic wrap', 'ziplock', 'bag', 'detergent', 'soap', 'dish soap', 'laundry', 'cleaner', 'bleach', 'sponge', 'brush', 'mop', 'broom', 'vacuum', 'air freshener', 'candle', 'light bulb', 'battery', 'household'],
  'Personal Care': ['shampoo', 'conditioner', 'body wash', 'soap', 'lotion', 'deodorant', 'toothpaste', 'toothbrush', 'floss', 'mouthwash', 'razor', 'shaving', 'cotton', 'bandage', 'medicine', 'vitamin', 'supplement', 'sunscreen', 'makeup', 'cosmetic', 'personal'],
};

// Quick add suggestions
const QUICK_SUGGESTIONS = [
  'Milk', 'Eggs', 'Bread', 'Butter', 'Cheese', 'Chicken', 'Rice', 'Pasta',
  'Onion', 'Garlic', 'Tomatoes', 'Lettuce', 'Apples', 'Bananas', 'Yogurt',
  'Coffee', 'Sugar', 'Salt', 'Olive Oil', 'Ground Beef'
];

// Detect category based on item name
const detectCategory = (itemName: string): string => {
  const lowerName = itemName.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }

  return 'Other';
};

export default function CreateShoppingListScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [listName, setListName] = useState('');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingQuantity, setEditingQuantity] = useState('');

  const itemInputRef = useRef<TextInput>(null);
  const quantityInputRef = useRef<TextInput>(null);

  // Generate unique ID for items
  const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add a new item to the list
  const handleAddItem = useCallback(() => {
    const name = newItemName.trim();
    if (!name) return;

    const category = detectCategory(name);
    const newItem: ShoppingItem = {
      id: generateId(),
      name,
      quantity: newItemQuantity.trim() || '1',
      category,
    };

    setItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemQuantity('1');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Focus back on item input for quick adding
    setTimeout(() => itemInputRef.current?.focus(), 100);
  }, [newItemName, newItemQuantity]);

  // Add item from quick suggestions
  const handleQuickAdd = useCallback((itemName: string) => {
    // Check if item already exists
    if (items.some(item => item.name.toLowerCase() === itemName.toLowerCase())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const category = detectCategory(itemName);
    const newItem: ShoppingItem = {
      id: generateId(),
      name: itemName,
      quantity: '1',
      category,
    };

    setItems(prev => [...prev, newItem]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [items]);

  // Remove an item
  const handleRemoveItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Start editing an item
  const handleStartEdit = useCallback((item: ShoppingItem) => {
    setEditingItemId(item.id);
    setEditingName(item.name);
    setEditingQuantity(item.quantity);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Save edited item
  const handleSaveEdit = useCallback(() => {
    if (!editingItemId || !editingName.trim()) return;

    setItems(prev => prev.map(item => {
      if (item.id === editingItemId) {
        return {
          ...item,
          name: editingName.trim(),
          quantity: editingQuantity.trim() || '1',
          category: detectCategory(editingName.trim()),
        };
      }
      return item;
    }));

    setEditingItemId(null);
    setEditingName('');
    setEditingQuantity('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [editingItemId, editingName, editingQuantity]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null);
    setEditingName('');
    setEditingQuantity('');
  }, []);

  // Create the shopping list
  const handleCreateList = async () => {
    const name = listName.trim() || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const itemsToCreate = items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      category: item.category,
    }));

    setSaving(true);
    try {
      await shoppingListApi.createShoppingList({
        name,
        items: itemsToCreate,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to shopping list tab
      router.replace('/(tabs)/shopping-list');
    } catch (error: any) {
      console.error('Error creating shopping list:', error);
      Alert.alert('Error', error.message || 'Failed to create shopping list');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  // Group items by category for display
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  // Filter quick suggestions to exclude already added items
  const availableSuggestions = QUICK_SUGGESTIONS.filter(
    suggestion => !items.some(item => item.name.toLowerCase() === suggestion.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <KeyboardAvoidingContainer>
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-3">
            <HapticTouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2"
            >
              <Icon name={Icons.CHEVRON_BACK} size={IconSizes.LG} color={isDark ? '#D1D5DB' : '#374151'} accessibilityLabel="Go back" />
            </HapticTouchableOpacity>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Shopping List</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* List Name Input */}
          <TextInput
            placeholder="List name (optional)"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={listName}
            onChangeText={setListName}
            className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
            style={{ fontSize: 16 }}
          />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Add Item Section */}
          <View className="bg-white dark:bg-gray-800 mx-4 mt-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Add Items</Text>

            <View className="flex-row items-center" style={{ gap: 8 }}>
              <TextInput
                ref={itemInputRef}
                placeholder="Item name"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={newItemName}
                onChangeText={setNewItemName}
                onSubmitEditing={handleAddItem}
                className="flex-1 bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
                style={{ fontSize: 16 }}
                returnKeyType="next"
              />
              <TextInput
                ref={quantityInputRef}
                placeholder="Qty"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={newItemQuantity}
                onChangeText={setNewItemQuantity}
                onSubmitEditing={handleAddItem}
                className="w-20 bg-gray-100 dark:bg-gray-700 px-3 py-3 rounded-lg text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 text-center"
                style={{ fontSize: 16 }}
                keyboardType="default"
                returnKeyType="done"
              />
              <HapticTouchableOpacity
                onPress={handleAddItem}
                disabled={!newItemName.trim()}
                className={`p-3 rounded-lg ${!newItemName.trim() ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Add item" />
              </HapticTouchableOpacity>
            </View>

            {/* Quick Suggestions */}
            {availableSuggestions.length > 0 && (
              <View className="mt-4">
                <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quick add</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row" style={{ gap: 8 }}>
                    {availableSuggestions.slice(0, 12).map((suggestion) => (
                      <HapticTouchableOpacity
                        key={suggestion}
                        onPress={() => handleQuickAdd(suggestion)}
                        className="px-3 py-2 rounded-full border"
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                          borderColor: isDark ? '#374151' : '#E5E7EB',
                        }}
                      >
                        <Text className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</Text>
                      </HapticTouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>

          {/* Items List */}
          {items.length > 0 && (
            <View className="mx-4 mt-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Items ({items.length})
                </Text>
                {items.length > 0 && (
                  <HapticTouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Clear All Items',
                        'Are you sure you want to remove all items?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Clear All',
                            style: 'destructive',
                            onPress: () => {
                              setItems([]);
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                          },
                        ]
                      );
                    }}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)' }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: isDark ? '#F87171' : '#DC2626' }}>Clear All</Text>
                  </HapticTouchableOpacity>
                )}
              </View>

              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <View key={category} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-3 overflow-hidden">
                  <View className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <Text className="text-sm font-semibold text-gray-600 dark:text-gray-300">{category}</Text>
                  </View>

                  {categoryItems.map((item, index) => (
                    <View
                      key={item.id}
                      className={`px-4 py-3 flex-row items-center ${index < categoryItems.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                    >
                      {editingItemId === item.id ? (
                        // Editing mode
                        <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
                          <TextInput
                            value={editingName}
                            onChangeText={setEditingName}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                          <TextInput
                            value={editingQuantity}
                            onChangeText={setEditingQuantity}
                            className="w-16 bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded-lg text-gray-900 dark:text-gray-100 text-center"
                          />
                          <HapticTouchableOpacity onPress={handleSaveEdit} className="p-2">
                            <Icon name={Icons.CHECKMARK} size={IconSizes.MD} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} accessibilityLabel="Save" />
                          </HapticTouchableOpacity>
                          <HapticTouchableOpacity onPress={handleCancelEdit} className="p-2">
                            <Icon name={Icons.CLOSE} size={IconSizes.MD} color="#9CA3AF" accessibilityLabel="Cancel" />
                          </HapticTouchableOpacity>
                        </View>
                      ) : (
                        // Display mode
                        <>
                          <View className="flex-1">
                            <Text className="text-base text-gray-900 dark:text-gray-100">{item.name}</Text>
                          </View>
                          <Text className="text-sm text-gray-500 dark:text-gray-400 mr-3">{item.quantity}</Text>
                          <HapticTouchableOpacity
                            onPress={() => handleStartEdit(item)}
                            className="p-2 mr-1"
                          >
                            <Icon name={Icons.EDIT} size={IconSizes.SM} color="#9CA3AF" accessibilityLabel="Edit item" />
                          </HapticTouchableOpacity>
                          <HapticTouchableOpacity
                            onPress={() => handleRemoveItem(item.id)}
                            className="p-2"
                          >
                            <Icon name={Icons.DELETE_OUTLINE} size={IconSizes.SM} color="#EF4444" accessibilityLabel="Remove item" />
                          </HapticTouchableOpacity>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {items.length === 0 && (
            <View className="mx-4 mt-8 items-center">
              <Icon name={Icons.CART_OUTLINE} size={64} color="#9CA3AF" accessibilityLabel="No items" />
              <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                Add items to your shopping list using the input above or tap the quick suggestions
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Create Button */}
        <View
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4"
          style={{ paddingBottom: Platform.OS === 'ios' ? 34 : 16 }}
        >
          <HapticTouchableOpacity
            onPress={handleCreateList}
            disabled={saving}
            className={`py-4 rounded-xl flex-row items-center justify-center ${saving ? 'opacity-70' : ''}`}
            style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
            hapticStyle="medium"
          >
            {saving ? (
              <AnimatedActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name={Icons.CHECKMARK} size={IconSizes.MD} color="white" accessibilityLabel="Create" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-lg">
                  {items.length > 0 ? `Create List (${items.length} items)` : 'Create Empty List'}
                </Text>
              </>
            )}
          </HapticTouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}
