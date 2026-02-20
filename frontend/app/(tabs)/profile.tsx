import { View, Text, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
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

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Icon name={Icons.ACCOUNT_OUTLINE} size={64} color="#9CA3AF" accessibilityLabel="Loading profile" />
          <Text className="text-gray-500 dark:text-gray-200 mt-4">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
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
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <ProfileHeader
        profile={profile}
        profilePicture={profilePicture}
        uploadingPicture={uploadingPicture}
        onChangeProfilePicture={handleChangeProfilePicture}
        onSaveName={saveNewName}
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

        <AccountCard
          user={user}
          onLogout={handleLogout}
          onProceedWithDeletion={proceedWithDeletion}
          onChangePassword={changePassword}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
