// frontend/components/profile/DataPrivacyCard.tsx
// Data usage stats, privacy toggles, export and clear history with modals

import { View, Text, Switch, Modal, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useState } from 'react';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';

interface DataPrivacyCardProps {
  dataStats: {
    recipes: number;
    savedRecipes: number;
    mealPlans: number;
    shoppingLists: number;
    mealHistory: number;
    collections: number;
    loading: boolean;
  };
  privacySettings: {
    analyticsEnabled: boolean;
    dataSharingEnabled: boolean;
    locationServicesEnabled: boolean;
  };
  updatingPrivacySetting: string | null;
  exportingData: boolean;
  onUpdatePrivacySetting: (key: 'analyticsEnabled' | 'dataSharingEnabled' | 'locationServicesEnabled', value: boolean) => void;
  onExportData: (format: 'json' | 'csv' | 'pdf') => void;
  onConfirmClearHistory: (clearOptions: { mealHistory: boolean; shoppingLists: boolean }) => Promise<boolean>;
}

export default function DataPrivacyCard({
  dataStats,
  privacySettings,
  updatingPrivacySetting,
  exportingData,
  onUpdatePrivacySetting,
  onExportData,
  onConfirmClearHistory,
}: DataPrivacyCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearOptions, setClearOptions] = useState({ mealHistory: false, shoppingLists: false });
  const [showExportFormatModal, setShowExportFormatModal] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');

  const handleConfirmClear = async () => {
    if (!clearOptions.mealHistory && !clearOptions.shoppingLists) return;
    setClearingHistory(true);
    const success = await onConfirmClearHistory(clearOptions);
    setClearingHistory(false);
    if (success) {
      setShowClearHistoryModal(false);
      setClearOptions({ mealHistory: false, shoppingLists: false });
    }
  };

  return (
    <>
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center mb-3">
          <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedDark }}>
            <Text className="text-xl">🔒</Text>
          </View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data & Privacy</Text>
        </View>

        {/* Data Usage Statistics */}
        <View className="mb-4 p-3 rounded-lg" style={{ backgroundColor: isDark ? DarkColors.surface : Colors.surface }}>
          <Text className="text-sm font-semibold mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
            Data Usage
          </Text>
          {dataStats.loading ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
              <Text className="text-xs mt-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                Loading statistics...
              </Text>
            </View>
          ) : (
            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Saved Recipes</Text>
                <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>{dataStats.savedRecipes}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Meal Plans</Text>
                <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>{dataStats.mealPlans}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Shopping Lists</Text>
                <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>{dataStats.shoppingLists}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Meal History</Text>
                <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>{dataStats.mealHistory}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Collections</Text>
                <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>{dataStats.collections}</Text>
              </View>
              <View className="mt-2 pt-2 border-t" style={{ borderTopColor: isDark ? DarkColors.border.light : Colors.border.light }}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Total Items</Text>
                  <Text className="text-xs font-bold" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                    {dataStats.savedRecipes + dataStats.mealPlans + dataStats.shoppingLists + dataStats.mealHistory + dataStats.collections}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Privacy Settings */}
        <View className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
            Privacy Settings
          </Text>
          <View className="space-y-3">
            <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <View className="flex-1 mr-4">
                <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                  Analytics & Tracking
                </Text>
                <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                  Help us improve the app by sharing usage analytics
                </Text>
              </View>
              {updatingPrivacySetting === 'analyticsEnabled' ? (
                <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
              ) : (
                <Switch
                  value={privacySettings.analyticsEnabled}
                  onValueChange={(value) => onUpdatePrivacySetting('analyticsEnabled', value)}
                  trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                  thumbColor="#FFFFFF"
                />
              )}
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <View className="flex-1 mr-4">
                <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                  Data Sharing for Recommendations
                </Text>
                <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                  Allow your data to be used for personalized recommendations
                </Text>
              </View>
              {updatingPrivacySetting === 'dataSharingEnabled' ? (
                <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
              ) : (
                <Switch
                  value={privacySettings.dataSharingEnabled}
                  onValueChange={(value) => onUpdatePrivacySetting('dataSharingEnabled', value)}
                  trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                  thumbColor="#FFFFFF"
                />
              )}
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <View className="flex-1 mr-4">
                <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                  Location Services
                </Text>
                <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                  Use your location for store recommendations and pricing
                </Text>
              </View>
              {updatingPrivacySetting === 'locationServicesEnabled' ? (
                <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
              ) : (
                <Switch
                  value={privacySettings.locationServicesEnabled}
                  onValueChange={(value) => onUpdatePrivacySetting('locationServicesEnabled', value)}
                  trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                  thumbColor="#FFFFFF"
                />
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="space-y-3">
          <HapticTouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => setShowExportFormatModal(true)}
            disabled={exportingData}
          >
            <View className="flex-row items-center">
              {exportingData ? (
                <ActivityIndicator size="small" color={isDark ? DarkColors.text.secondary : Colors.text.secondary} style={{ marginRight: 12 }} />
              ) : (
                <Icon name={Icons.EXPORT_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} accessibilityLabel="Export data" />
              )}
              <Text className="ml-3" style={{ color: exportingData ? (isDark ? DarkColors.text.tertiary : Colors.text.tertiary) : (isDark ? DarkColors.text.primary : Colors.text.primary) }}>
                {exportingData ? 'Exporting...' : 'Export My Data'}
              </Text>
            </View>
            {!exportingData && (
              <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} accessibilityLabel="Navigate" />
            )}
          </HapticTouchableOpacity>

          <HapticTouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => {
              setClearOptions({ mealHistory: false, shoppingLists: false });
              setShowClearHistoryModal(true);
            }}
          >
            <View className="flex-row items-center">
              <Icon name={Icons.DELETE_OUTLINE} size={IconSizes.MD} color={Colors.secondaryRed} accessibilityLabel="Clear history" />
              <Text className="ml-3" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Clear History</Text>
            </View>
            <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
          </HapticTouchableOpacity>
        </View>
      </View>

      {/* Clear History Modal */}
      <Modal
        visible={showClearHistoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { if (!clearingHistory) setShowClearHistoryModal(false); }}
      >
        <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Clear History</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Select what you want to clear. This action cannot be undone.
            </Text>

            <View className="space-y-3 mb-6">
              <HapticTouchableOpacity
                onPress={() => setClearOptions({ ...clearOptions, mealHistory: !clearOptions.mealHistory })}
                disabled={clearingHistory}
                className="flex-row items-center p-3 rounded-lg border"
                style={{
                  borderColor: clearOptions.mealHistory ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? DarkColors.border.medium : Colors.border.medium),
                  backgroundColor: clearOptions.mealHistory ? (isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A`) : 'transparent',
                }}
              >
                <View className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
                  style={{
                    borderColor: clearOptions.mealHistory ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? DarkColors.border.medium : Colors.border.medium),
                    backgroundColor: clearOptions.mealHistory ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
                  }}
                >
                  {clearOptions.mealHistory && <Icon name={Icons.CHECKMARK} size={12} color="white" />}
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-gray-100 font-medium">Meal History</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">All recorded meals and recipes</Text>
                </View>
              </HapticTouchableOpacity>

              <HapticTouchableOpacity
                onPress={() => setClearOptions({ ...clearOptions, shoppingLists: !clearOptions.shoppingLists })}
                disabled={clearingHistory}
                className="flex-row items-center p-3 rounded-lg border"
                style={{
                  borderColor: clearOptions.shoppingLists ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? DarkColors.border.medium : Colors.border.medium),
                  backgroundColor: clearOptions.shoppingLists ? (isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A`) : 'transparent',
                }}
              >
                <View className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
                  style={{
                    borderColor: clearOptions.shoppingLists ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? DarkColors.border.medium : Colors.border.medium),
                    backgroundColor: clearOptions.shoppingLists ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
                  }}
                >
                  {clearOptions.shoppingLists && <Icon name={Icons.CHECKMARK} size={12} color="white" />}
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-gray-100 font-medium">Shopping Lists</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">All shopping lists and items</Text>
                </View>
              </HapticTouchableOpacity>
            </View>

            <View className="flex-row space-x-3">
              <HapticTouchableOpacity
                onPress={() => { if (!clearingHistory) { setShowClearHistoryModal(false); setClearOptions({ mealHistory: false, shoppingLists: false }); } }}
                disabled={clearingHistory}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleConfirmClear}
                disabled={clearingHistory || (!clearOptions.mealHistory && !clearOptions.shoppingLists)}
                className={`flex-1 py-3 px-4 rounded-lg ${clearingHistory || (!clearOptions.mealHistory && !clearOptions.shoppingLists) ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
              >
                {clearingHistory ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-medium text-center">Clear</Text>
                )}
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Format Modal */}
      <Modal
        visible={showExportFormatModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { if (!exportingData) setShowExportFormatModal(false); }}
      >
        <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Select Export Format</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Choose the format for your data export
            </Text>

            <View className="space-y-3 mb-6">
              {([
                { value: 'json' as const, label: 'JSON', description: 'Complete data in structured format' },
                { value: 'csv' as const, label: 'CSV', description: 'Spreadsheet-friendly format' },
                { value: 'pdf' as const, label: 'PDF / Text', description: 'Human-readable document format' },
              ]).map(({ value, label, description }) => (
                <HapticTouchableOpacity
                  key={value}
                  onPress={() => setSelectedExportFormat(value)}
                  className="flex-row items-center p-4 rounded-lg border"
                  style={{
                    borderColor: selectedExportFormat === value ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? DarkColors.border.medium : Colors.border.medium),
                    backgroundColor: selectedExportFormat === value ? (isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A`) : 'transparent',
                  }}
                >
                  <View className="w-5 h-5 rounded-full border-2 items-center justify-center mr-3"
                    style={{
                      borderColor: selectedExportFormat === value ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? DarkColors.border.medium : Colors.border.medium),
                      backgroundColor: selectedExportFormat === value ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
                    }}
                  >
                    {selectedExportFormat === value && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-gray-100 font-medium">{label}</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</Text>
                  </View>
                </HapticTouchableOpacity>
              ))}
            </View>

            <View className="flex-row space-x-3">
              <HapticTouchableOpacity
                onPress={() => setShowExportFormatModal(false)}
                disabled={exportingData}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => { onExportData(selectedExportFormat); setShowExportFormatModal(false); }}
                disabled={exportingData}
                className={`flex-1 py-3 px-4 rounded-lg ${exportingData ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                {exportingData ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-medium text-center">Export</Text>
                )}
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
