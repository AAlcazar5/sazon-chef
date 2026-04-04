// frontend/components/shopping/AddItemModal.tsx
// Add item bottom sheet with tabs: Add New / Buy Again / Pantry
// Edit quantity bottom sheet for inline editing

import { View, Text, TextInput, Image, Alert, ScrollView } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useColorScheme } from 'nativewind';
import * as ImagePicker from 'expo-image-picker';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import BottomSheet from '../ui/BottomSheet';
import BrandButton from '../ui/BrandButton';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { HapticPatterns } from '../../constants/Haptics';
import { ShoppingListItem, PurchaseHistoryItem, PantryItem } from '../../types';
import type { ShoppingListState } from '../../hooks/useShoppingList';
import { isMultiItemInput, parseShoppingInput, extractEmbeddedQuantity } from '../../lib/shoppingItemParser';
import { VoiceMicButton } from '../voice';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import type { ParsedVoiceIntent, AddToListIntent } from '../../lib/voiceIntentParser';

type AddItemTab = 'add' | 'buyAgain' | 'pantry';

interface AddItemModalProps {
  state: ShoppingListState;
  dispatch: React.Dispatch<any>;
  onAddItem: () => void;
  onAddMultipleItems: (items: Array<{ name: string; quantity: string }>) => void;
  onSaveQuantity: () => void;
  onPickItemPhoto: (imageUri: string) => void;
  purchaseHistoryPriceMap: Map<string, number>;
  onBuyAgainItem: (item: PurchaseHistoryItem) => void;
  onToggleFavorite: (item: PurchaseHistoryItem) => void;
  onReorderLastWeek: () => void;
  onRemoveFromPantry: (itemId: string) => void;
  onSetupDefaultPantry: () => void;
  onQuickAddSuggestion: (suggestion: string) => void;
}

export default function AddItemModal({
  state,
  dispatch,
  onAddItem,
  onAddMultipleItems,
  onSaveQuantity,
  onPickItemPhoto,
  purchaseHistoryPriceMap,
  onBuyAgainItem,
  onToggleFavorite,
  onReorderLastWeek,
  onRemoveFromPantry,
  onSetupDefaultPantry,
  onQuickAddSuggestion,
}: AddItemModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<AddItemTab>('add');

  const multiItemDetected = useMemo(
    () => isMultiItemInput(state.newItemName),
    [state.newItemName]
  );

  const parsedItems = useMemo(
    () => multiItemDetected ? parseShoppingInput(state.newItemName) : [],
    [multiItemDetected, state.newItemName]
  );

  // "You usually buy" hint — match current item name against purchase history
  const usuallyBuyHint = useMemo(() => {
    const name = state.newItemName.trim().toLowerCase();
    if (!name || name.length < 2) return null;
    const match = state.purchaseHistory.find(
      h => h.itemName.toLowerCase() === name
    );
    return match?.quantity || null;
  }, [state.newItemName, state.purchaseHistory]);

  // Auto-populate quantity field when user types a single item with embedded quantity
  const handleItemNameChange = useCallback((text: string) => {
    dispatch({ type: 'UPDATE', payload: { newItemName: text } });

    // Only auto-extract for single-item input (not multi-item)
    if (!isMultiItemInput(text)) {
      const extracted = extractEmbeddedQuantity(text);
      if (extracted && !state.newItemQuantity) {
        dispatch({ type: 'UPDATE', payload: { newItemQuantity: extracted.quantity } });
      } else if (!state.newItemQuantity) {
        // Auto-populate from purchase history
        const normalized = text.trim().toLowerCase();
        const historyMatch = state.purchaseHistory.find(
          h => h.itemName.toLowerCase() === normalized
        );
        if (historyMatch?.quantity) {
          dispatch({ type: 'UPDATE', payload: { newItemQuantity: historyMatch.quantity } });
        }
      }
    }
  }, [dispatch, state.newItemQuantity, state.purchaseHistory]);

  const handleAdd = useCallback(() => {
    if (multiItemDetected && parsedItems.length > 1) {
      onAddMultipleItems(parsedItems);
    } else {
      onAddItem();
    }
  }, [multiItemDetected, parsedItems, onAddMultipleItems, onAddItem]);

  // Voice input for adding items
  const handleVoiceIntent = useCallback((intent: ParsedVoiceIntent) => {
    if (intent.type === 'ADD_TO_LIST') {
      const addIntent = intent as AddToListIntent;
      if (addIntent.items.length === 1) {
        dispatch({ type: 'UPDATE', payload: { newItemName: addIntent.items[0].name, newItemQuantity: addIntent.items[0].quantity } });
      } else if (addIntent.items.length > 1) {
        onAddMultipleItems(addIntent.items);
      }
    } else if (intent.type === 'UNKNOWN' && intent.rawText) {
      // Treat unknown as item name
      dispatch({ type: 'UPDATE', payload: { newItemName: intent.rawText } });
    }
  }, [dispatch, onAddMultipleItems]);

  const { isListening, startListening, stopListening, isAvailable: voiceAvailable } = useVoiceInput({
    onIntent: handleVoiceIntent,
  });

  const handleMicPress = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const editItemLastPrice = state.selectedItem
    ? purchaseHistoryPriceMap.get(state.selectedItem.name.toLowerCase().trim())
    : undefined;

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach item photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      onPickItemPhoto(result.assets[0].uri);
    }
  };

  const handleCloseAddModal = () => {
    dispatch({ type: 'CLOSE_ADD_ITEM_MODAL' });
    setActiveTab('add');
  };

  const tabs: { key: AddItemTab; label: string; icon: string }[] = [
    { key: 'add', label: 'Add New', icon: Icons.ADD },
    { key: 'buyAgain', label: 'Buy Again', icon: Icons.REFRESH },
    { key: 'pantry', label: 'Pantry', icon: Icons.HOME_OUTLINE },
  ];

  const favorites = state.purchaseHistory.filter(item => item.isFavorite);
  const frequent = state.purchaseHistory.filter(item => !item.isFavorite);
  const formatItemName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  // Pastel tint per tab for visual variety
  const TAB_TINTS: Record<AddItemTab, { light: string; dark: string; accent: string }> = {
    add:      { light: Pastel.peach, dark: PastelDark.peach, accent: Accent.peach },
    buyAgain: { light: Pastel.golden, dark: PastelDark.golden, accent: Accent.golden },
    pantry:   { light: Pastel.sage, dark: PastelDark.sage, accent: Accent.sage },
  };

  // Category emoji for quick-add suggestions
  const ITEM_EMOJI: Record<string, string> = {
    milk: '🥛', eggs: '🥚', bread: '🍞', butter: '🧈', cheese: '🧀',
    'chicken breast': '🍗', chicken: '🍗', 'ground beef': '🥩', beef: '🥩',
    onions: '🧅', garlic: '🧄', tomatoes: '🍅', lettuce: '🥬', carrots: '🥕',
    potatoes: '🥔', rice: '🍚', pasta: '🍝', 'olive oil': '🫒', bananas: '🍌',
    avocados: '🥑', apples: '🍎', yogurt: '🥛', salmon: '🐟', shrimp: '🦐',
    sugar: '🍬', flour: '🌾', salt: '🧂', pepper: '🌶️',
  };

  const getItemEmoji = (name: string) => ITEM_EMOJI[name.toLowerCase().trim()] || '🛒';

  return (
    <>
      {/* Add Item Bottom Sheet */}
      <BottomSheet
        visible={state.showAddItemModal}
        onClose={handleCloseAddModal}
        title="Add Items"
        snapPoints={['75%', '92%']}
        scrollable
      >
        <View className="px-6 pb-8">
          {/* Tab Bar — pastel pill style */}
          <View
            className="flex-row mb-5 p-1"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.surfaceTint,
              borderRadius: BorderRadius.full,
              ...Shadows.SM,
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const tint = TAB_TINTS[tab.key];
              return (
                <HapticTouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className="flex-1 flex-row items-center justify-center"
                  style={[{
                    paddingVertical: 10,
                    borderRadius: BorderRadius.full,
                  }, isActive ? {
                    backgroundColor: isDark ? tint.dark : tint.light,
                    ...Shadows.SM,
                  } : undefined]}
                >
                  <Icon
                    name={tab.icon as any}
                    size={14}
                    color={isActive
                      ? (isDark ? tint.accent : Colors.primary)
                      : (isDark ? '#6B7280' : '#9CA3AF')
                    }
                    accessibilityLabel={tab.label}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? '700' : '500',
                      color: isActive
                        ? (isDark ? tint.accent : Colors.primaryDark)
                        : (isDark ? '#6B7280' : '#9CA3AF'),
                    }}
                  >
                    {tab.label}
                  </Text>
                </HapticTouchableOpacity>
              );
            })}
          </View>

          {/* Tab Content */}
          {activeTab === 'add' && (
            <View>
              {/* Quick Suggestions — colorful grid */}
              {state.quickSuggestions.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E5E7EB' : Colors.text.primary }}>
                      {state.purchaseHistory.length > 0 ? 'Your most added' : 'Popular items'}
                    </Text>
                    <View style={{
                      backgroundColor: isDark ? PastelDark.peach : Pastel.peach,
                      borderRadius: BorderRadius.full,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginLeft: 8,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: isDark ? Accent.peach : Colors.primary }}>
                        tap to add
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {state.quickSuggestions.slice(0, 12).map((suggestion, idx) => {
                      // Cycle through pastel tints for visual variety
                      const tintKeys = ['sage', 'peach', 'sky', 'lavender', 'golden', 'blush'] as const;
                      const tintKey = tintKeys[idx % tintKeys.length];
                      const bgColor = isDark ? PastelDark[tintKey] : Pastel[tintKey];
                      const textColor = isDark ? Accent[tintKey] : Colors.text.primary;

                      return (
                        <HapticTouchableOpacity
                          key={idx}
                          onPress={() => {
                            onQuickAddSuggestion(suggestion);
                            HapticPatterns.buttonPress();
                          }}
                          style={[{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: BorderRadius.full,
                            backgroundColor: bgColor,
                          }, Shadows.SM]}
                        >
                          <Text style={{ fontSize: 14, marginRight: 5 }}>
                            {getItemEmoji(suggestion)}
                          </Text>
                          <Text
                            style={{ fontSize: 13, fontWeight: '600', color: textColor }}
                            numberOfLines={1}
                          >
                            {suggestion}
                          </Text>
                        </HapticTouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Item name input */}
              <View className="flex-row items-center" style={{ gap: 8, marginBottom: 6 }}>
                <TextInput
                  placeholder="Item name (or multiple: milk, eggs, bread)"
                  value={state.newItemName}
                  onChangeText={handleItemNameChange}
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.surfaceTint,
                    borderRadius: BorderRadius.input,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: isDark ? '#F3F4F6' : Colors.text.primary,
                    ...Shadows.SM,
                  }}
                  placeholderTextColor={Colors.text.tertiary}
                  autoFocus={true}
                />
                {voiceAvailable && (
                  <VoiceMicButton
                    isListening={isListening}
                    onPress={handleMicPress}
                    size="small"
                  />
                )}
              </View>

              {/* Multi-item detection hint */}
              {multiItemDetected && parsedItems.length > 1 && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                  marginLeft: 4,
                  backgroundColor: isDark ? PastelDark.sky : Pastel.sky,
                  borderRadius: BorderRadius.full,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  alignSelf: 'flex-start',
                }}>
                  <Icon name={Icons.INFO} size={14} color={isDark ? Accent.sky : '#1565C0'} accessibilityLabel="Info" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? Accent.sky : '#1565C0' }}>
                    {parsedItems.length} items detected — tap Add to add all
                  </Text>
                </View>
              )}

              {/* Quantity field */}
              {!multiItemDetected && (
                <View>
                  <TextInput
                    placeholder="Quantity (e.g., 2 cups, 1 lb)"
                    value={state.newItemQuantity}
                    onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { newItemQuantity: text } })}
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.surfaceTint,
                      borderRadius: BorderRadius.input,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 15,
                      color: isDark ? '#F3F4F6' : Colors.text.primary,
                      ...Shadows.SM,
                    }}
                    placeholderTextColor={Colors.text.tertiary}
                  />
                  {usuallyBuyHint && (
                    <View style={{
                      backgroundColor: isDark ? PastelDark.sage : Pastel.sage,
                      borderRadius: BorderRadius.full,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      alignSelf: 'flex-start',
                      marginTop: 6,
                      marginLeft: 4,
                      marginBottom: 8,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? Accent.sage : '#2E7D32' }}>
                        usually {usuallyBuyHint}
                      </Text>
                    </View>
                  )}
                  {!usuallyBuyHint && <View style={{ marginBottom: 12 }} />}
                </View>
              )}
              {multiItemDetected && <View style={{ marginBottom: 8 }} />}

              {/* Quantity Suggestions */}
              {state.quantitySuggestions.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 8 }}>
                    Suggested from meal plan:
                  </Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {state.quantitySuggestions.map((suggestion, index) => (
                      <HapticTouchableOpacity
                        key={index}
                        onPress={() => {
                          dispatch({ type: 'UPDATE', payload: { newItemQuantity: suggestion } });
                          HapticPatterns.buttonPress();
                        }}
                        style={[{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: BorderRadius.full,
                          backgroundColor: isDark ? PastelDark.peach : Pastel.peach,
                        }, Shadows.SM]}
                      >
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: isDark ? Accent.peach : Colors.primary }}
                        >
                          {suggestion}
                        </Text>
                      </HapticTouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View className="flex-row" style={{ gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <BrandButton
                    label="Cancel"
                    onPress={handleCloseAddModal}
                    variant="ghost"
                    accessibilityLabel="Cancel"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <BrandButton
                    label={multiItemDetected && parsedItems.length > 1
                      ? `Add ${parsedItems.length} Items`
                      : 'Add'}
                    onPress={handleAdd}
                    variant="brand"
                    icon="add-circle"
                    accessibilityLabel="Add item"
                  />
                </View>
              </View>
            </View>
          )}

          {activeTab === 'buyAgain' && (
            <View>
              {state.loadingPurchaseHistory ? (
                <View className="items-center py-8">
                  <AnimatedActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                </View>
              ) : state.purchaseHistory.length === 0 ? (
                <View className="items-center py-8">
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🛒</Text>
                  <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
                    No purchase history yet.{'\n'}Items you buy will appear here.
                  </Text>
                </View>
              ) : (
                <View>
                  {/* Reorder Last Week — vibrant card */}
                  <HapticTouchableOpacity
                    onPress={onReorderLastWeek}
                    style={[{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderRadius: BorderRadius.card,
                      marginBottom: 16,
                      backgroundColor: isDark ? PastelDark.sky : Pastel.sky,
                    }, Shadows.SM]}
                  >
                    <Icon
                      name={Icons.REFRESH}
                      size={18}
                      color={isDark ? Accent.sky : '#1565C0'}
                      accessibilityLabel="Reorder last week"
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{ fontWeight: '700', fontSize: 14, color: isDark ? Accent.sky : '#1565C0' }}
                    >
                      Reorder Last Week
                    </Text>
                  </HapticTouchableOpacity>

                  {/* Favorites */}
                  {favorites.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E5E7EB' : Colors.text.primary }}>
                          Favorites
                        </Text>
                        <Text style={{ fontSize: 16, marginLeft: 4 }}>⭐</Text>
                      </View>
                      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                        {favorites.map((item) => (
                          <HapticTouchableOpacity
                            key={item.id}
                            onPress={() => onBuyAgainItem(item)}
                            onLongPress={() => onToggleFavorite(item)}
                            style={[{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: BorderRadius.full,
                              backgroundColor: isDark ? PastelDark.golden : Pastel.golden,
                            }, Shadows.SM]}
                          >
                            <Icon
                              name={Icons.STAR}
                              size={14}
                              color={isDark ? Accent.golden : '#F59E0B'}
                              accessibilityLabel="Favorite"
                              style={{ marginRight: 5 }}
                            />
                            <Text
                              style={{ fontSize: 13, fontWeight: '600', color: isDark ? Accent.golden : '#92400E' }}
                              numberOfLines={1}
                            >
                              {formatItemName(item.itemName)}
                            </Text>
                            {item.lastPrice != null && item.lastPrice > 0 && (
                              <Text style={{ fontSize: 11, marginLeft: 4, color: isDark ? '#6B7280' : '#9CA3AF' }}>
                                ${item.lastPrice.toFixed(2)}
                              </Text>
                            )}
                          </HapticTouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Frequent Items */}
                  {frequent.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E5E7EB' : Colors.text.primary }}>
                          Frequently Bought
                        </Text>
                        <Text style={{ fontSize: 16, marginLeft: 4 }}>🔄</Text>
                      </View>
                      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                        {frequent.map((item) => (
                          <HapticTouchableOpacity
                            key={item.id}
                            onPress={() => onBuyAgainItem(item)}
                            onLongPress={() => onToggleFavorite(item)}
                            style={[{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: BorderRadius.full,
                              backgroundColor: isDark ? PastelDark.lavender : Pastel.lavender,
                            }, Shadows.SM]}
                          >
                            <Text
                              style={{ fontSize: 13, fontWeight: '600', color: isDark ? Accent.lavender : '#6A1B9A' }}
                              numberOfLines={1}
                            >
                              {formatItemName(item.itemName)}
                            </Text>
                            {item.lastPrice != null && item.lastPrice > 0 && (
                              <Text style={{ fontSize: 11, marginLeft: 4, color: isDark ? '#6B7280' : '#9CA3AF' }}>
                                ${item.lastPrice.toFixed(2)}
                              </Text>
                            )}
                            {item.purchaseCount > 1 && (
                              <View style={{
                                backgroundColor: isDark ? 'rgba(206,147,216,0.3)' : 'rgba(106,27,154,0.1)',
                                borderRadius: BorderRadius.full,
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                marginLeft: 4,
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? Accent.lavender : '#6A1B9A' }}>
                                  x{item.purchaseCount}
                                </Text>
                              </View>
                            )}
                          </HapticTouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <Text style={{ fontSize: 11, color: isDark ? '#4B5563' : '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
                    Tap to add, long-press to favorite
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'pantry' && (
            <View>
              {state.loadingPantry ? (
                <View className="items-center py-8">
                  <AnimatedActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                </View>
              ) : state.pantryItems.length === 0 ? (
                <View className="items-center py-8">
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🏠</Text>
                  <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
                    Add staples you always have on hand.{'\n'}They'll be excluded from generated lists.
                  </Text>
                  <BrandButton
                    label="Get Started"
                    onPress={onSetupDefaultPantry}
                    variant="sage"
                    icon="add-circle-outline"
                    accessibilityLabel="Set up default pantry"
                  />
                </View>
              ) : (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E5E7EB' : Colors.text.primary }}>
                      My Pantry
                    </Text>
                    <View style={{
                      backgroundColor: isDark ? PastelDark.sage : Pastel.sage,
                      borderRadius: BorderRadius.full,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginLeft: 8,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? Accent.sage : '#2E7D32' }}>
                        {state.pantryItems.length} items
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {state.pantryItems.map((item) => (
                      <HapticTouchableOpacity
                        key={item.id}
                        onLongPress={() => onRemoveFromPantry(item.id)}
                        style={[{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: BorderRadius.full,
                          backgroundColor: isDark ? PastelDark.sage : Pastel.sage,
                        }, Shadows.SM]}
                      >
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: isDark ? Accent.sage : '#2E7D32' }}
                          numberOfLines={1}
                        >
                          {formatItemName(item.name)}
                        </Text>
                      </HapticTouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: isDark ? '#4B5563' : '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
                    Long-press to remove from pantry
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </BottomSheet>

      {/* Edit Quantity Bottom Sheet */}
      <BottomSheet
        visible={state.showEditQuantityModal}
        onClose={() => dispatch({ type: 'CLOSE_EDIT_QUANTITY_MODAL' })}
        title="Edit Item"
        snapPoints={['65%']}
      >
        <View className="px-6 pb-8">
          {state.selectedItem && (
            <>
              {/* Item name badge */}
              <View
                style={{
                  backgroundColor: isDark ? PastelDark.peach : Pastel.peach,
                  borderRadius: BorderRadius.full,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  alignSelf: 'flex-start',
                  marginBottom: 16,
                  ...Shadows.SM,
                }}
              >
                <Text
                  style={{
                    color: isDark ? Accent.peach : '#C46200',
                    fontWeight: '700',
                    fontSize: 15,
                  }}
                >
                  {state.selectedItem.name}
                </Text>
              </View>

              {/* Quantity input */}
              <TextInput
                placeholder="Quantity (e.g., 2 cups, 1 lb)"
                value={state.editingQuantity}
                onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { editingQuantity: text } })}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.surfaceTint,
                  borderRadius: BorderRadius.input,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 12,
                  fontSize: 15,
                  color: isDark ? '#F3F4F6' : Colors.text.primary,
                  ...Shadows.SM,
                }}
                placeholderTextColor={Colors.text.tertiary}
                autoFocus={true}
              />

              {/* Price input */}
              <TextInput
                placeholder="Price (e.g., 3.99)"
                value={state.editingPrice}
                onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { editingPrice: text } })}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.surfaceTint,
                  borderRadius: BorderRadius.input,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: editItemLastPrice != null ? 4 : 12,
                  fontSize: 15,
                  color: isDark ? '#F3F4F6' : Colors.text.primary,
                  ...Shadows.SM,
                }}
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="decimal-pad"
                onSubmitEditing={onSaveQuantity}
              />
              {editItemLastPrice != null && (
                <View
                  style={{
                    backgroundColor: isDark ? PastelDark.sage : Pastel.sage,
                    borderRadius: BorderRadius.full,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    alignSelf: 'flex-start',
                    marginBottom: 12,
                    marginLeft: 4,
                  }}
                >
                  <Text style={{ fontSize: 12, color: isDark ? Accent.sage : '#2E7D32', fontWeight: '600' }}>
                    Was ${editItemLastPrice.toFixed(2)} last time
                  </Text>
                </View>
              )}

              {/* Notes input */}
              <TextInput
                placeholder="Notes (e.g., the organic one in the green box)"
                value={state.editingNotes}
                onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { editingNotes: text } })}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.surfaceTint,
                  borderRadius: BorderRadius.input,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 16,
                  fontSize: 15,
                  color: isDark ? '#F3F4F6' : Colors.text.primary,
                  minHeight: 60,
                  textAlignVertical: 'top',
                  ...Shadows.SM,
                }}
                placeholderTextColor={Colors.text.tertiary}
                multiline={true}
                numberOfLines={2}
              />

              {/* Photo picker */}
              <View className="flex-row items-center" style={{ gap: 12, marginBottom: 20 }}>
                {state.editingPhotoUrl ? (
                  <Image
                    source={{ uri: state.editingPhotoUrl }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: BorderRadius.md,
                      ...Shadows.MD,
                    }}
                  />
                ) : null}
                <HapticTouchableOpacity
                  onPress={handlePickPhoto}
                  disabled={state.uploadingPhoto}
                  className="flex-row items-center"
                  style={{
                    backgroundColor: isDark ? PastelDark.sky : Pastel.sky,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: BorderRadius.full,
                    gap: 8,
                    ...Shadows.SM,
                  }}
                >
                  {state.uploadingPhoto ? (
                    <AnimatedActivityIndicator size="small" color={isDark ? Accent.sky : '#1565C0'} />
                  ) : (
                    <Icon name={Icons.CAMERA_OUTLINE} size={IconSizes.MD} color={isDark ? Accent.sky : '#1565C0'} accessibilityLabel="Add photo" />
                  )}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? Accent.sky : '#1565C0' }}>
                    {state.editingPhotoUrl ? 'Change Photo' : 'Add Photo'}
                  </Text>
                </HapticTouchableOpacity>
                {state.editingPhotoUrl && (
                  <HapticTouchableOpacity
                    onPress={() => dispatch({ type: 'UPDATE', payload: { editingPhotoUrl: null } })}
                    style={{
                      backgroundColor: isDark ? PastelDark.red : Pastel.red,
                      borderRadius: BorderRadius.full,
                      padding: 8,
                    }}
                  >
                    <Icon name={Icons.CLOSE} size={IconSizes.SM} color={isDark ? '#F87171' : '#DC2626'} accessibilityLabel="Remove photo" />
                  </HapticTouchableOpacity>
                )}
              </View>

              {/* Action buttons */}
              <View className="flex-row" style={{ gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <BrandButton
                    label="Cancel"
                    onPress={() => dispatch({ type: 'CLOSE_EDIT_QUANTITY_MODAL' })}
                    variant="ghost"
                    disabled={state.updatingQuantity}
                    accessibilityLabel="Cancel editing"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <BrandButton
                    label="Save"
                    onPress={onSaveQuantity}
                    variant="brand"
                    icon="checkmark-circle"
                    loading={state.updatingQuantity}
                    disabled={state.updatingQuantity}
                    accessibilityLabel="Save changes"
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </BottomSheet>
    </>
  );
}
