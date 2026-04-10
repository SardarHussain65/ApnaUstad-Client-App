import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform } from 'react-native';
import { Shield, Lock, Fingerprint, Smartphone, LogOut, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileHeader } from '../../components/profile/ProfileHeader';

export default function SecurityScreen() {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(true);

  return (
    <BackgroundWrapper>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable Header */}
        <ProfileHeader title="Security & Privacy" />

        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
          <View style={styles.shieldIconWrapper}>
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              style={styles.iconGlow}
            />
            <View style={styles.iconCircle}>
              <Shield size={40} color="#fff" />
            </View>
          </View>
          <Text style={[styles.screenTitle, Typography.threeD]}>Security Protocol</Text>
          <Text style={styles.screenSubtitle}>Manage your access gates and encryption layers.</Text>
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Access Controls</Text>
          <SecurityItem 
            icon={Lock} 
            label="Change Master Password" 
            onPress={() => {}} 
            delay={300} 
          />
          <SecurityToggle 
            icon={Smartphone} 
            label="Two-Factor Authentication" 
            value={is2FAEnabled} 
            onValueChange={setIs2FAEnabled} 
            delay={400} 
          />
          <SecurityToggle 
            icon={Fingerprint} 
            label="Biometric Verification" 
            value={isBiometricsEnabled} 
            onValueChange={setIsBiometricsEnabled} 
            delay={500} 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Terminals</Text>
          <GlassCard style={styles.sessionCard} intensity={20} padding={Spacing.m}>
            <View style={styles.sessionItem}>
              <View style={styles.sessionIconBox}>
                <Smartphone size={18} color={Colors.primary} />
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionDevice}>iPhone 15 Pro (This Device)</Text>
                <Text style={styles.sessionLocation}>Rawalpindi, Pakistan • Active Now</Text>
              </View>
              <View style={styles.activeDot} />
            </View>
          </GlassCard>
          <GlassCard style={styles.sessionCard} intensity={15} padding={Spacing.m}>
            <View style={styles.sessionItem}>
              <View style={styles.sessionIconBox}>
                <Smartphone size={18} color="rgba(255,255,255,0.4)" />
              </View>
              <View style={styles.sessionInfo}>
                <Text style={[styles.sessionDevice, { color: 'rgba(255,255,255,0.6)' }]}>MacBook Air M2</Text>
                <Text style={styles.sessionLocation}>London, UK • 2 hours ago</Text>
              </View>
              <TouchableOpacity>
                <LogOut size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        <TouchableOpacity style={styles.signoutAllBtn}>
          <Text style={styles.signoutAllText}>Terminate All Other Sessions</Text>
        </TouchableOpacity>
      </ScrollView>
    </BackgroundWrapper>
  );
}

interface SecurityItemProps {
  icon: any;
  label: string;
  onPress: () => void;
  delay: number;
}

function SecurityItem({ icon: Icon, label, onPress, delay }: SecurityItemProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity onPress={onPress}>
        <GlassCard style={styles.itemCard} intensity={25} padding={Spacing.m}>
          <View style={styles.itemContent}>
            <View style={styles.itemIconBox}>
              <Icon size={20} color={Colors.primary} />
            </View>
            <Text style={styles.itemLabel}>{label}</Text>
            <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface SecurityToggleProps {
  icon: any;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  delay: number;
}

function SecurityToggle({ icon: Icon, label, value, onValueChange, delay }: SecurityToggleProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <GlassCard style={styles.itemCard} intensity={25} padding={Spacing.m}>
        <View style={styles.itemContent}>
          <View style={styles.itemIconBox}>
            <Icon size={20} color={Colors.secondary} />
          </View>
          <Text style={styles.itemLabel}>{label}</Text>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primary + '80' }}
            thumbColor={value ? Colors.primary : 'rgba(255,255,255,0.3)'}
            ios_backgroundColor="rgba(255,255,255,0.1)"
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
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shieldIconWrapper: {
    width: 100,
    height: 100,
    position: 'relative',
    marginBottom: 20,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    opacity: 0.4,
  },
  iconCircle: {
    flex: 1,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
  },
  screenSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionCard: {
    marginBottom: 10,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sessionLocation: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#32D74B',
    shadowColor: '#32D74B',
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },
  signoutAllBtn: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 10,
  },
  signoutAllText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
