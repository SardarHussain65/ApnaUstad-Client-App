import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Shield, Lock, HelpCircle, ChevronRight, Eye } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { useRouter } from 'expo-router';

export default function SecurityScreen() {
  const router = useRouter();

  return (
    <BackgroundWrapper>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable Header */}
        <ProfileHeader title="Security" />

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
          <Text style={[styles.screenTitle, Typography.threeD]}>Account Security</Text>
          <Text style={styles.screenSubtitle}>Update your password and manage account protection.</Text>
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Options</Text>
          <SecurityItem 
            icon={Lock} 
            label="Change Password" 
            onPress={() => router.push('/profile/change-password')} 
            delay={300} 
          />
          <SecurityItem 
            icon={Eye} 
            label="Policies & Terms" 
            onPress={() => router.push('/profile/privacy')} 
            delay={350} 
          />
          <SecurityItem 
            icon={HelpCircle} 
            label="Report a Security Issue" 
            onPress={() => router.push('/profile/help-center')} 
            delay={400} 
          />
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.35,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
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
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCard: {
    marginVertical: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '700',
  },
  itemLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  screenTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  screenSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 6,
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
