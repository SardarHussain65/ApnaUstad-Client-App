import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { User, Mail, Phone, MapPin, Camera, Check } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ProfileHeader } from '../../components/profile/ProfileHeader';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const [name, setName] = useState('Ahmed Malik');
  const [email, setEmail] = useState('ahmed.malik@cosmic.io');
  const [phone, setPhone] = useState('+92 300 1234567');
  const [address, setAddress] = useState('Global Trade Center, Phase 7, Rawalpindi');

  const handleSave = () => {
    // Implement save logic here
    router.back();
  };

  return (
    <BackgroundWrapper>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable Header */}
        <ProfileHeader title="Personal Information" />

        <Animated.View entering={FadeInUp.delay(200)} style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              style={styles.avatarGlow}
            />
            <View style={styles.avatarPlaceholder}>
              <User size={60} color="#fff" strokeWidth={1} />
            </View>
            <TouchableOpacity style={styles.cameraBtn}>
              <Camera size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.avatarTip, Typography.caption]}>Tap to change avatar</Text>
        </Animated.View>

        <View style={styles.formSection}>
          <InputField 
            label="Full Name" 
            value={name} 
            onChangeText={setName} 
            icon={User} 
            delay={300} 
          />
          <InputField 
            label="Email Address" 
            value={email} 
            onChangeText={setEmail} 
            icon={Mail} 
            keyboardType="email-address" 
            delay={400} 
          />
          <InputField 
            label="Phone Number" 
            value={phone} 
            onChangeText={setPhone} 
            icon={Phone} 
            keyboardType="phone-pad" 
            delay={500} 
          />
          <InputField 
            label="Home Address" 
            value={address} 
            onChangeText={setAddress} 
            icon={MapPin} 
            multiline 
            delay={600} 
          />
        </View>

        <Animated.View entering={FadeInDown.delay(700)} style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveGradient}
            >
              <Check size={20} color="#000" strokeWidth={3} />
              <Text style={styles.saveText}>Committing Changes</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </BackgroundWrapper>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: any;
  delay: number;
  [key: string]: any; // To allow other TextInput props
}

function InputField({ label, value, onChangeText, icon: Icon, delay, ...props }: InputFieldProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Text style={styles.inputLabel}>{label}</Text>
      <GlassCard style={styles.inputCard} intensity={25} padding={Spacing.m}>
        <View style={styles.inputWrapper}>
          <Icon size={20} color={Colors.primary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor="rgba(255,255,255,0.3)"
            selectionColor={Colors.primary}
            {...props}
          />
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    position: 'relative',
    marginBottom: 12,
  },
  avatarGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 60,
    opacity: 0.5,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Colors.secondary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    ...Shadows.glow,
  },
  avatarTip: {
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formSection: {
    gap: 20,
  },
  inputLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.8,
  },
  inputCard: {
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: Platform.OS === 'ios' ? 4 : 0,
  },
  footer: {
    marginTop: 40,
  },
  saveBtn: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  saveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
