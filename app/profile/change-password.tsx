import React, { useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Lock, ShieldCheck } from 'lucide-react-native';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { GlassCard } from '../../components/home/GlassCard';
import { InputField } from '../../components/InputField';
import { CustomButton } from '../../components/CustomButton';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useChangePasswordMutation, useToast } from '../../hooks';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const { success, error: showError } = useToast();
  const { mutateAsync: changePassword, isPending } = useChangePasswordMutation();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    if (!user?._id || !role) return;

    if (!oldPassword || !newPassword) {
      showError('Missing fields', 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      await changePassword({
        role,
        id: user._id,
        oldPassword,
        newPassword,
      });
      success('Password updated', 'Your password has been changed successfully.');
      router.back();
    } catch (err: any) {
      showError('Update failed', err?.message || 'Could not change your password.');
    }
  };

  return (
    <BackgroundWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ProfileHeader title="Change Password" />

        <View style={styles.headerSection}>
          <View style={styles.iconWrap}>
            <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.iconGlow} />
            <View style={styles.iconCircle}>
              <ShieldCheck size={28} color="#fff" />
            </View>
          </View>
          <Text style={[styles.title, Typography.threeD]}>Secure Access</Text>
          <Text style={styles.subtitle}>Update your password to keep your account protected.</Text>
        </View>

        <GlassCard style={styles.formCard} intensity={20} padding={Spacing.l}>
          <InputField
            label="Current Password"
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="Enter current password"
            secureTextEntry
            icon={<Lock size={18} color={Colors.primary} />}
          />
          <InputField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            secureTextEntry
            icon={<Lock size={18} color={Colors.cyan} />}
          />
          <InputField
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry
            icon={<Lock size={18} color={Colors.cyan} />}
          />
        </GlassCard>

        <View style={styles.footer}>
          <CustomButton
            title={isPending ? 'Updating...' : 'Update Password'}
            onPress={handleSubmit}
            loading={isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.l,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrap: {
    width: 88,
    height: 88,
    marginBottom: 16,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    opacity: 0.35,
  },
  iconCircle: {
    flex: 1,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 13,
  },
  formCard: {
    borderRadius: BorderRadius.l,
    ...Shadows.glow,
  },
  footer: {
    marginTop: 24,
  },
});
