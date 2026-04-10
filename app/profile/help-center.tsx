import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { HelpCircle, Search, MessageCircle, Mail, ChevronRight, BookOpen, Settings, Zap } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileHeader } from '../../components/profile/ProfileHeader';

export default function HelpCenterScreen() {
  const [search, setSearch] = useState('');

  return (
    <BackgroundWrapper>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable Header */}
        <ProfileHeader title="Help Center" />

        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
          <Text style={[styles.screenTitle, Typography.threeD]}>Mission Control</Text>
          <Text style={styles.screenSubtitle}>Search our database for guidance or contact the commanders.</Text>
          
          <GlassCard style={styles.searchCard} intensity={20} padding={Spacing.m}>
            <View style={styles.searchWrapper}>
              <Search size={20} color={Colors.primary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cosmic guidance..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </GlassCard>
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guidance Sectors</Text>
          <View style={styles.grid}>
            <HelpCategory 
              icon={BookOpen} 
              label="Getting Started" 
              delay={300} 
              color={Colors.primary}
            />
            <HelpCategory 
              icon={Zap} 
              label="Payments" 
              delay={400} 
              color={Colors.orange}
            />
            <HelpCategory 
              icon={Settings} 
              label="Security" 
              delay={500} 
              color={Colors.secondary}
            />
            <HelpCategory 
              icon={HelpCircle} 
              label="System FAQ" 
              delay={600} 
              color={Colors.cyan}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Direct Communication</Text>
          <SupportChannel 
            icon={MessageCircle} 
            title="Aether Chat" 
            subtitle="Response time: Instant" 
            delay={700} 
          />
          <SupportChannel 
            icon={Mail} 
            title="Galactic Dispatch" 
            subtitle="Response time: < 4 hours" 
            delay={800} 
          />
        </View>

        <TouchableOpacity style={styles.communityBtn}>
          <Text style={styles.communityText}>Join the Specialist Community</Text>
        </TouchableOpacity>
      </ScrollView>
    </BackgroundWrapper>
  );
}

interface HelpCategoryProps {
  icon: any;
  label: string;
  delay: number;
  color: string;
}

function HelpCategory({ icon: Icon, label, delay, color }: HelpCategoryProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.categoryWrapper}>
      <TouchableOpacity>
        <GlassCard style={styles.categoryCard} intensity={25} padding={Spacing.m}>
          <View style={[styles.categoryIconBox, { backgroundColor: color + '20' }]}>
            <Icon size={24} color={color} />
          </View>
          <Text style={styles.categoryLabel}>{label}</Text>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface SupportChannelProps {
  icon: any;
  title: string;
  subtitle: string;
  delay: number;
}

function SupportChannel({ icon: Icon, title, subtitle, delay }: SupportChannelProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity>
        <GlassCard style={styles.supportCard} intensity={20} padding={Spacing.m}>
          <View style={styles.supportContent}>
            <View style={styles.supportIconBox}>
              <Icon size={22} color={Colors.primary} />
            </View>
            <View style={styles.supportInfo}>
              <Text style={styles.supportTitle}>{title}</Text>
              <Text style={styles.supportSubtitle}>{subtitle}</Text>
            </View>
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
  screenTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  screenSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  searchCard: {
    width: '100%',
    ...Shadows.glow,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 16,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryWrapper: {
    width: '48%',
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  categoryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  supportCard: {
    marginBottom: 12,
  },
  supportContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  supportInfo: {
    flex: 1,
  },
  supportTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  supportSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  communityBtn: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 10,
  },
  communityText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
