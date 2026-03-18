import { useState } from 'react';
import { View, Text, ScrollView, Linking } from 'react-native';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import SettingsRow from '../../components/ui/SettingsRow';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useSubscription } from '../../hooks/useSubscription';
import { CancellationFlow } from '../../components/premium/CancellationFlow';
import { Spacing } from '../../constants/Spacing';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfileData } from '../../hooks/useProfileData';
import {
  ProfileHeader,
  AppearanceSection,
  ProfileCompletionCard,
  PhysicalProfileCard,
  WeightHistoryCard,
  MacroGoalsCard,
  CulinaryPreferencesCard,
  BudgetCard,
  NotificationsCard,
  DataPrivacyCard,
  ProfilePresetsCard,
  AccountCard,
} from '../../components/profile';

const COFFEE_URL = 'https://ko-fi.com/sazonchef';

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const { subscription, refresh: refreshSubscription } = useSubscription();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);

  const {
    profile, physicalProfile, macroGoals, preferences, budgetSettings,
    weightHistory, weightHistoryLoading,
    loading,
    notifications, updatingNotification,
    privacySettings, updatingPrivacySetting,
    dataStats, profileCompletion,
    profilePicture, uploadingPicture,
    exportingData,
    presets, presetsLoading,
    loadProfile,
    toggleNotification,
    updatePrivacySetting,
    handleSaveMealReminderTime,
    handleRemoveMealReminderTime,
    handleExportData,
    handleConfirmClearHistory,
    handleChangeProfilePicture,
    saveNewName,
    handleLogout,
    proceedWithDeletion,
    changePassword,
    handleSavePreset,
    handleApplyPreset,
    handleDeletePreset,
  } = useProfileData({ user, logout });

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0F0F' : '#F2F2F7' }} edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Icon name={Icons.ACCOUNT_OUTLINE} size={64} color="#9CA3AF" accessibilityLabel="Loading profile" />
          <Text className="text-gray-500 dark:text-gray-200 mt-4">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0F0F' : '#F2F2F7' }} edges={['top']}>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Spacing['3xl'], flexGrow: 1 }}>
          <AnimatedEmptyState
            useMascot
            mascotExpression="supportive"
            mascotSize="large"
            title="Couldn't load your profile"
            description="We had trouble loading your profile data. Try again or sign out below."
            actionLabel="Try Again"
            onAction={loadProfile}
          />

          <View className="px-4 mt-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account</Text>
            <View className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <HapticTouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700"
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight }}
                  >
                    <Icon
                      name={Icons.LOG_OUT_OUTLINE}
                      size={IconSizes.SM}
                      color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed}
                      accessibilityLabel="Sign out"
                    />
                  </View>
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100">Sign Out</Text>
                </View>
                <Icon
                  name={Icons.CHEVRON_FORWARD}
                  size={IconSizes.SM}
                  color="#9CA3AF"
                  accessibilityLabel="Navigate"
                />
              </HapticTouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0F0F' : '#F2F2F7' }} edges={['top']}>
      <ProfileHeader
        profile={profile}
        profilePicture={profilePicture}
        uploadingPicture={uploadingPicture}
        onChangeProfilePicture={handleChangeProfilePicture}
        onSaveName={saveNewName}
        isPremium={subscription.isPremium}
        stats={!dataStats.loading ? {
          savedRecipes: dataStats.savedRecipes,
          mealHistory: dataStats.mealHistory,
          mealPlans: dataStats.mealPlans,
        } : undefined}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}>
        <AppearanceSection />

        <ProfileCompletionCard profileCompletion={profileCompletion} />

        <PhysicalProfileCard physicalProfile={physicalProfile} />

        <WeightHistoryCard
          physicalProfile={physicalProfile}
          weightHistory={weightHistory}
          weightHistoryLoading={weightHistoryLoading}
        />

        <MacroGoalsCard profile={profile} macroGoals={macroGoals} />

        <ProfilePresetsCard
          presets={presets}
          presetsLoading={presetsLoading}
          onSavePreset={handleSavePreset}
          onApplyPreset={handleApplyPreset}
          onDeletePreset={handleDeletePreset}
        />

        <CulinaryPreferencesCard
          profile={profile}
          preferences={preferences}
        />

        <BudgetCard budgetSettings={budgetSettings} />

        <NotificationsCard
          notifications={notifications}
          updatingNotification={updatingNotification}
          onToggleNotification={toggleNotification}
          onSaveMealReminderTime={handleSaveMealReminderTime}
          onRemoveMealReminderTime={handleRemoveMealReminderTime}
        />

        <DataPrivacyCard
          dataStats={dataStats}
          privacySettings={privacySettings}
          updatingPrivacySetting={updatingPrivacySetting}
          exportingData={exportingData}
          onUpdatePrivacySetting={updatePrivacySetting}
          onExportData={handleExportData}
          onConfirmClearHistory={handleConfirmClearHistory}
        />

        {/* Support Sazon row — always visible for free-tier users */}
        {!subscription.isPremium && (
          <View className="mx-4 mb-4">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Support
            </Text>
            <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
              <SettingsRow
                label="Support Sazon"
                sublabel="Buy us a coffee to keep the stove on"
                icon={
                  <View className="w-10 h-10 rounded-full items-center justify-center bg-yellow-50 dark:bg-yellow-900/30">
                    <Text style={{ fontSize: 20 }}>☕</Text>
                  </View>
                }
                onPress={() => Linking.openURL(COFFEE_URL)}
                showBorder={false}
              />
            </View>
          </View>
        )}

        {/* Manage Subscription — visible for premium/trialing users */}
        {subscription.isPremium && (
          <View className="mx-4 mb-4">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Subscription
            </Text>
            <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
              <SettingsRow
                label="Cancel Subscription"
                sublabel="You can pause or cancel anytime"
                icon={
                  <View className="w-10 h-10 rounded-full items-center justify-center bg-red-50 dark:bg-red-900/30">
                    <Icon
                      name={Icons.DELETE_OUTLINE}
                      size={IconSizes.SM}
                      color="#EF4444"
                      accessibilityLabel="Cancel subscription"
                    />
                  </View>
                }
                labelStyle={{ color: '#EF4444' }}
                onPress={() => setShowCancellationFlow(true)}
                showBorder={false}
              />
            </View>
          </View>
        )}

        <AccountCard
          user={user}
          onLogout={handleLogout}
          onProceedWithDeletion={proceedWithDeletion}
          onChangePassword={changePassword}
        />
      </ScrollView>

      <CancellationFlow
        visible={showCancellationFlow}
        onClose={() => setShowCancellationFlow(false)}
        onCancelled={() => {
          setShowCancellationFlow(false);
          refreshSubscription();
        }}
      />
    </SafeAreaView>
  );
}
