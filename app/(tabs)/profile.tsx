import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '@/components/AppButton';
import BrandBackground from '@/components/BrandBackground';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut, changePassword } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Change-password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const p = await getProfile(user.id);
    setProfile(p);
    setDraftName(p?.full_name ?? '');
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await updateProfile(user.id, {
      full_name: draftName.trim(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setProfile((prev) =>
        prev ? { ...prev, full_name: draftName.trim() } : prev
      );
      setEditing(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setShowPasswords(false);
  };

  const closePasswordModal = () => {
    if (changingPassword) return;
    setPasswordModalOpen(false);
    resetPasswordForm();
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError(
        'New password must be different from your current password.'
      );
      return;
    }

    setChangingPassword(true);
    const { error } = await changePassword(currentPassword, newPassword);
    setChangingPassword(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setPasswordModalOpen(false);
    resetPasswordForm();
    Alert.alert(
      'Password updated',
      'Your password has been changed successfully.'
    );
  };

  const displayName =
    profile?.full_name || user?.email?.split('@')[0] || 'Member';
  const initial = displayName.charAt(0).toUpperCase();
  const role = profile?.role ?? 'student';

  return (
    <BrandBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Identity hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.heroName}>{displayName}</Text>
          <Text style={styles.heroEmail}>
            {user?.email ?? profile?.email ?? ''}
          </Text>
          <View style={styles.rolePill}>
            <Ionicons
              name={
                role === 'admin'
                  ? 'shield-checkmark-outline'
                  : role === 'teacher'
                    ? 'school-outline'
                    : 'person-outline'
              }
              size={13}
              color="#FFFFFF"
            />
            <Text style={styles.rolePillText}>{role}</Text>
          </View>
        </View>

        {/* Personal info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={COLORS.textPrimary}
            />
            <Text style={styles.cardTitle}>Personal info</Text>
          </View>
          <Text style={styles.label}>Name</Text>
          {editing ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Pressable
                style={styles.saveBtn}
                onPress={handleSaveName}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditing(true)} style={styles.nameRow}>
              <Text style={styles.value}>
                {profile?.full_name || 'Tap to add your name'}
              </Text>
              <View style={styles.editChip}>
                <Text style={styles.editHint}>Edit</Text>
              </View>
            </Pressable>
          )}

          <View style={styles.divider} />
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? profile?.email}</Text>
        </View>

        {/* Account */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="key-outline"
              size={20}
              color={COLORS.textPrimary}
            />
            <Text style={styles.cardTitle}>Account</Text>
          </View>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.valueCapital}>{role}</Text>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.valueSmall}>{user?.id}</Text>
        </View>

        <AppButton
          title="Change Password"
          icon="lock-closed-outline"
          onPress={() => {
            resetPasswordForm();
            setPasswordModalOpen(true);
          }}
        />

        <AppButton
          title="Sign Out"
          icon="log-out-outline"
          onPress={handleSignOut}
          disabled={loading}
        />
        <Text style={styles.footer}>QR Attendance • v1.0.0</Text>
      </ScrollView>

      {/* Change password modal */}
      <Modal
        visible={passwordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closePasswordModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closePasswordModal} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.modalTitle}>Change Password</Text>
              </View>
              <Pressable onPress={closePasswordModal} hitSlop={10}>
                <Ionicons
                  name="close"
                  size={22}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Current password</Text>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
                editable={!changingPassword}
              />

              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
                editable={!changingPassword}
              />

              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-type your new password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
                editable={!changingPassword}
              />

              <Pressable
                style={styles.showPasswordsRow}
                onPress={() => setShowPasswords((v) => !v)}
              >
                <Ionicons
                  name={showPasswords ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.showPasswordsText}>
                  {showPasswords ? 'Hide passwords' : 'Show passwords'}
                </Text>
              </Pressable>

              {passwordError && (
                <Text style={styles.passwordError}>{passwordError}</Text>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={closePasswordModal}
                  disabled={changingPassword}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalBtn,
                    styles.modalSaveBtn,
                    changingPassword && styles.modalBtnDisabled,
                  ]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  <Text style={styles.modalSaveText}>
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
    gap: 14,
  },
  hero: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textOnBackground,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textOnBackground,
    textAlign: 'center',
  },
  heroEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.mutedOnBackground,
    textAlign: 'center',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  rolePillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  valueCapital: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  valueSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.4,
    marginTop: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  editChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 12,
  },
  editHint: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  nameEditRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.textOnBackground,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
  footer: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.mutedOnBackground,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 45, 70, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 18,
    gap: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalBody: {
    paddingBottom: 4,
  },
  passwordInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  showPasswordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  showPasswordsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  passwordError: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.danger,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelBtn: {
    backgroundColor: COLORS.surface,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSaveBtn: {
    backgroundColor: COLORS.primary,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },
});
