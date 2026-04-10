import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Bell, MessageSquare, Briefcase, Zap, Mail, Smartphone } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileHeader } from '../../components/profile/ProfileHeader';

export default function NotificationsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [messages, setMessages] = useState(true);
  const [promos, setPromos] = useState(false);

  return (
    <BackgroundWrapper>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable Header */}
        <ProfileHeader title="Notifications" />

        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
          <View style={styles.bellIconWrapper}>
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              style={styles.iconGlow}
            />
            <View style={styles.iconCircle}>
              <Bell size={40} color="#fff" />
            </View>
          </View>
          <Text style={[styles.screenTitle, Typography.threeD]}>Signal Center</Text>
          <Text style={styles.screenSubtitle}>Configure your incoming cosmic transmissions and alerts.</Text>
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Channels</Text>
          <NotificationToggle 
            icon={Smartphone} 
            label="Push Notifications" 
            value={pushEnabled} 
            onValueChange={setPushEnabled} 
            delay={300} 
            color={Colors.primary}
          />
          <NotificationToggle 
            icon={Mail} 
            label="Email Alerts" 
            value={emailEnabled} 
            onValueChange={setEmailEnabled} 
            delay={400} 
            color={Colors.secondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactional Signal</Text>
          <NotificationToggle 
            icon={Briefcase} 
            label="New Job Invitations" 
            value={jobAlerts} 
            onValueChange={setJobAlerts} 
            delay={500} 
            color="#FF9500"
          />
          <NotificationToggle 
            icon={MessageSquare} 
            label="Direct Messages" 
            value={messages} 
            onValueChange={setMessages} 
            delay={600} 
            color="#32D74B"
          />
          <NotificationToggle 
            icon={Zap} 
            label="Cosmic Promotions" 
            value={promos} 
            onValueChange={setPromos} 
            delay={700} 
            color="#FF3B30"
          />
        </View>

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>Transmission delays may occur depending on your sector's network stability.</Text>
        </View>
      </ScrollView>
    </BackgroundWrapper>
  );
}

interface NotificationToggleProps {
  icon: any;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  delay: number;
  color: string;
}

function NotificationToggle({ icon: Icon, label, value, onValueChange, delay, color }: NotificationToggleProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <GlassCard style={styles.itemCard} intensity={25} padding={Spacing.m}>
        <View style={styles.itemContent}>
          <View style={[styles.itemIconBox, { backgroundColor: color + '20' }]}>
            <Icon size={20} color={color} />
          </View>
          <Text style={styles.itemLabel}>{label}</Text>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: color + '80' }}
            thumbColor={value ? color : 'rgba(255,255,255,0.3)'}
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
  bellIconWrapper: {
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
  footerInfo: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  footerText: {
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});
