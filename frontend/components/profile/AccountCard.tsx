// frontend/components/profile/AccountCard.tsx
// Account actions: change password, sign out, delete account with modals

import { View, Text, Modal, TextInput, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useState } from 'react';
import { router } from 'expo-router';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { useTheme } from '../../contexts/ThemeContext';

interface AccountCardProps {
  user: { id?: string; provider?: string } | null;
  onLogout: () => void;
  onProceedWithDeletion: () => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

export default function AccountCard({ user, onLogout, onProceedWithDeletion, onChangePassword }: AccountCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState('');

  const handleConfirmPasswordChange = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      HapticPatterns.error();
      return;
    }
    if (newPassword.length < 8) {
      HapticPatterns.error();
      return;
    }
    if (newPassword !== confirmPassword) {
      HapticPatterns.error();
      return;
    }
    if (currentPassword === newPassword) {
      HapticPatterns.error();
      return;
    }

    setChangingPassword(true);
    const success = await onChangePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (success) {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirmText.toLowerCase() !== 'delete') {
      HapticPatterns.error();
      return;
    }
    setDeletingAccount(true);
    setShowDeleteAccountModal(false);
    await onProceedWithDeletion();
    setDeletingAccount(false);
    setDeleteAccountConfirmText('');
  };

  return (
    <>
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center mb-3">
          <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedDark }}>
            <Icon name={Icons.ACCOUNT_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : '#FFFFFF'} accessibilityLabel="Account" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account</Text>
        </View>

        {!user?.provider && (
          <HapticTouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-100"
            onPress={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowPasswordModal(true);
            }}
          >
            <View className="flex-row items-center">
              <Icon name={Icons.LOCK_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Change password" />
              <Text className="text-gray-900 dark:text-gray-100 ml-3">Change Password</Text>
            </View>
            <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
          </HapticTouchableOpacity>
        )}

        <HapticTouchableOpacity
          className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700"
          onPress={() => router.push('/onboarding?edit=true' as any)}
        >
          <View className="flex-row items-center">
            <Icon name={Icons.REFRESH} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Redo setup" />
            <Text className="ml-3 font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>Redo Setup</Text>
          </View>
          <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
        </HapticTouchableOpacity>

        <HapticTouchableOpacity
          className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700"
          onPress={onLogout}
        >
          <View className="flex-row items-center">
            <Icon name={Icons.LOG_OUT_OUTLINE} size={IconSizes.MD} color={Colors.secondaryRed} accessibilityLabel="Sign out" />
            <Text className="ml-3 font-medium" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Sign Out</Text>
          </View>
          <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
        </HapticTouchableOpacity>

        <HapticTouchableOpacity
          className="flex-row items-center justify-between py-3"
          onPress={() => setShowDeleteAccountModal(true)}
        >
          <View className="flex-row items-center">
            <Icon name={Icons.DELETE_OUTLINE} size={IconSizes.MD} color={Colors.secondaryRed} accessibilityLabel="Delete account" />
            <Text className="ml-3 font-medium" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Delete Account</Text>
          </View>
          <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
        </HapticTouchableOpacity>
      </View>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Change Password</Text>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Current Password</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="off"
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">New Password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min 8 characters)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="off"
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Confirm New Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="off"
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              />
            </View>

            <View className="flex-row space-x-3">
              <HapticTouchableOpacity
                onPress={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                disabled={changingPassword}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleConfirmPasswordChange}
                disabled={changingPassword}
                className={`flex-1 py-3 px-4 rounded-lg ${changingPassword ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Text className="text-white font-medium text-center">
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { if (!deletingAccount) { setShowDeleteAccountModal(false); setDeleteAccountConfirmText(''); } }}
      >
        <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete Account</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This action cannot be undone. All your data, including recipes, meal plans, shopping lists, and preferences will be permanently deleted.
            </Text>

            <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2 mt-4">
              Type "DELETE" to confirm:
            </Text>
            <TextInput
              value={deleteAccountConfirmText}
              onChangeText={setDeleteAccountConfirmText}
              placeholder="DELETE"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoComplete="off"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 mb-4"
              editable={!deletingAccount}
            />

            <View className="flex-row space-x-3">
              <HapticTouchableOpacity
                onPress={() => { if (!deletingAccount) { setShowDeleteAccountModal(false); setDeleteAccountConfirmText(''); } }}
                disabled={deletingAccount}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleDeleteAccount}
                disabled={deletingAccount || deleteAccountConfirmText.toLowerCase() !== 'delete'}
                className={`flex-1 py-3 px-4 rounded-lg ${deletingAccount || deleteAccountConfirmText.toLowerCase() !== 'delete' ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-medium text-center">Delete Account</Text>
                )}
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
