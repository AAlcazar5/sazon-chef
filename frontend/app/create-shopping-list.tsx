// frontend/app/create-shopping-list.tsx
// Screen for creating a new shopping list with items

import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../components/ui/AnimatedActivityIndicator';
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

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.92);

export default function CreateShoppingListScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [listName, setListName] = useState('');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingQuantity, setEditingQuantity] = useState('');

  const itemInputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 22,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: SHEET_HEIGHT,
      damping: 22,
      stiffness: 220,
      useNativeDriver: true,
    }).start(() => router.back());
  }, [slideAnim]);

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
    setTimeout(() => itemInputRef.current?.focus(), 100);
  }, [newItemName, newItemQuantity]);

  const handleQuickAdd = useCallback((itemName: string) => {
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

  const handleRemoveItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleStartEdit = useCallback((item: ShoppingItem) => {
    setEditingItemId(item.id);
    setEditingName(item.name);
    setEditingQuantity(item.quantity);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

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

  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null);
    setEditingName('');
    setEditingQuantity('');
  }, []);

  const handleCreateList = async () => {
    const name = listName.trim() || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const itemsToCreate = items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      category: item.category,
    }));

    setSaving(true);
    try {
      await shoppingListApi.createShoppingList({ name, items: itemsToCreate });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const availableSuggestions = QUICK_SUGGESTIONS.filter(
    suggestion => !items.some(item => item.name.toLowerCase() === suggestion.toLowerCase())
  );

  const sheetBg = isDark ? '#111827' : '#F9FAFB';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const labelColor = isDark ? '#F9FAFB' : '#111827';
  const subColor = isDark ? '#9CA3AF' : '#6B7280';
  const inputBg = isDark ? '#374151' : '#F3F4F6';
  const primaryColor = isDark ? DarkColors.primary : Colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      {/* Backdrop — tap to dismiss */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={{ flex: 1 }} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
          height: SHEET_HEIGHT,
          backgroundColor: sheetBg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: borderColor }} />
        </View>

        {/* Sheet header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: labelColor }}>Create Shopping List</Text>
          <HapticTouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
            <Icon name={Icons.CLOSE} size={IconSizes.MD} color={subColor} accessibilityLabel="Close" />
          </HapticTouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* List Name Input */}
            <TextInput
              placeholder="List name (optional)"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={listName}
              onChangeText={setListName}
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 16,
                color: labelColor,
                marginBottom: 12,
              }}
            />

            {/* Add Item Card */}
            <View style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: labelColor, marginBottom: 10 }}>Add Items</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  ref={itemInputRef}
                  placeholder="Item name"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  onSubmitEditing={handleAddItem}
                  style={{ flex: 1, backgroundColor: inputBg, borderWidth: 1, borderColor, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: labelColor }}
                  returnKeyType="done"
                />
                <TextInput
                  placeholder="Qty"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  onSubmitEditing={handleAddItem}
                  style={{ width: 60, backgroundColor: inputBg, borderWidth: 1, borderColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 11, fontSize: 16, color: labelColor, textAlign: 'center' }}
                  returnKeyType="done"
                />
                <HapticTouchableOpacity
                  onPress={handleAddItem}
                  disabled={!newItemName.trim()}
                  style={{ padding: 11, borderRadius: 8, backgroundColor: primaryColor, opacity: newItemName.trim() ? 1 : 0.45 }}
                >
                  <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Add item" />
                </HapticTouchableOpacity>
              </View>

              {/* Quick Suggestions */}
              {availableSuggestions.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 12, color: subColor, marginBottom: 8 }}>Quick add</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {availableSuggestions.slice(0, 12).map((suggestion) => (
                        <HapticTouchableOpacity
                          key={suggestion}
                          onPress={() => handleQuickAdd(suggestion)}
                          style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }}
                        >
                          <Text style={{ fontSize: 13, color: isDark ? '#D1D5DB' : '#374151' }}>{suggestion}</Text>
                        </HapticTouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Items List */}
            {items.length > 0 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: labelColor }}>Items ({items.length})</Text>
                  <HapticTouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Clear All Items',
                        'Are you sure you want to remove all items?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Clear All', style: 'destructive', onPress: () => { setItems([]); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
                        ]
                      );
                    }}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#F87171' : '#DC2626' }}>Clear All</Text>
                  </HapticTouchableOpacity>
                </View>

                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <View key={category} style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor, marginBottom: 10, overflow: 'hidden' }}>
                    <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB', borderBottomWidth: 1, borderBottomColor: borderColor }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: subColor }}>{category}</Text>
                    </View>

                    {categoryItems.map((item, index) => (
                      <View
                        key={item.id}
                        style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderTopWidth: index > 0 ? 1 : 0, borderTopColor: borderColor }}
                      >
                        {editingItemId === item.id ? (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TextInput
                              value={editingName}
                              onChangeText={setEditingName}
                              style={{ flex: 1, backgroundColor: inputBg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, color: labelColor, fontSize: 15 }}
                              autoFocus
                            />
                            <TextInput
                              value={editingQuantity}
                              onChangeText={setEditingQuantity}
                              style={{ width: 52, backgroundColor: inputBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 8, color: labelColor, fontSize: 15, textAlign: 'center' }}
                            />
                            <HapticTouchableOpacity onPress={handleSaveEdit} style={{ padding: 6 }}>
                              <Icon name={Icons.CHECKMARK} size={IconSizes.MD} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} accessibilityLabel="Save" />
                            </HapticTouchableOpacity>
                            <HapticTouchableOpacity onPress={handleCancelEdit} style={{ padding: 6 }}>
                              <Icon name={Icons.CLOSE} size={IconSizes.MD} color="#9CA3AF" accessibilityLabel="Cancel" />
                            </HapticTouchableOpacity>
                          </View>
                        ) : (
                          <>
                            <Text style={{ flex: 1, fontSize: 15, color: labelColor }}>{item.name}</Text>
                            <Text style={{ fontSize: 13, color: subColor, marginRight: 10 }}>{item.quantity}</Text>
                            <HapticTouchableOpacity onPress={() => handleStartEdit(item)} style={{ padding: 6, marginRight: 2 }}>
                              <Icon name={Icons.EDIT} size={IconSizes.SM} color="#9CA3AF" accessibilityLabel="Edit item" />
                            </HapticTouchableOpacity>
                            <HapticTouchableOpacity onPress={() => handleRemoveItem(item.id)} style={{ padding: 6 }}>
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
              <View style={{ alignItems: 'center', paddingTop: 24 }}>
                <Icon name={Icons.CART_OUTLINE} size={52} color="#9CA3AF" accessibilityLabel="No items" />
                <Text style={{ color: subColor, marginTop: 12, textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
                  Add items using the input above or tap a quick suggestion
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Create button — pinned above keyboard */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: sheetBg, borderTopWidth: 1, borderTopColor: borderColor }}>
            <HapticTouchableOpacity
              onPress={handleCreateList}
              disabled={saving}
              style={{ paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: primaryColor, opacity: saving ? 0.7 : 1 }}
              hapticStyle="medium"
            >
              {saving ? (
                <AnimatedActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Icon name={Icons.CHECKMARK} size={IconSizes.MD} color="white" accessibilityLabel="Create" style={{ marginRight: 8 }} />
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 17 }}>
                    {items.length > 0 ? `Create List (${items.length} items)` : 'Create Empty List'}
                  </Text>
                </>
              )}
            </HapticTouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}
