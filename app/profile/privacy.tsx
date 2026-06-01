import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Eye, ShieldAlert, FileText } from 'lucide-react-native';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { GlassCard } from '../../components/home/GlassCard';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/Theme';
import api from '../../services/api';

export default function PrivacyScreen() {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');
  const [loading, setLoading] = useState(false);
  const [dynamicContent, setDynamicContent] = useState<{ privacy?: string; terms?: string }>({});

  useEffect(() => {
    // Attempt to load live policy paragraphs from backend/website
    const fetchPolicies = async () => {
      setLoading(true);
      try {
        const response = await api.get('/config/policies');
        if (response.data?.data) {
          setDynamicContent({
            privacy: response.data.data.privacyPolicy,
            terms: response.data.data.termsAndConditions,
          });
        }
      } catch (err) {
        // Fallback to local default paragraphs seamlessly if API is not yet built
        console.log('Backend policy fetch failed, rendering local default fallback text');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  // Default default fallback paragraphs matching production app rules
  const localPrivacy = `1. Introduction
Welcome to ApnaUstad! Your privacy is critically important to us. This Privacy Policy details how we collect, handle, secure, and utilize your personal information.

2. Information Collection
We collect registration details, including your full name, email, verified phone number, and location address. For Workers, we also maintain category specialties, professional bios, skills arrays, and hourly rates to enable matching.

3. How We Use Data
Your details are exclusively used to calculate profile completeness, process on-demand service requests, and facilitate direct communications between clients and workers for successful bookings.

4. Zero Third-Party Sharing
We maintain a strict zero-sharing database policy. ApnaUstad does not sell, barter, or trade personal data to external advertisers or marketers.

5. Data Security
All credentials and booking histories are encrypted using industry-standard TLS protocols.`;

  const localTerms = `1. Agreement of Terms
By downloading and logging into the ApnaUstad platform, you explicitly agree to adhere to these Terms & Conditions. If you disagree, please uninstall the app.

2. Scope of Service
ApnaUstad functions as an interactive on-demand marketplace connecting independent professional workers (Ustads) with clients seeking services. ApnaUstad does not directly employ the service workers.

3. Account Authenticity
All users must register verified credentials. Creating duplicate, misleading, or fraudulent listings is strictly prohibited and subject to immediate account suspension.

4. Booking & Cancellation Policies
Clients agree to compensate workers for requested tasks at the rates displayed. Worker availability toggles determine live discovery status. Cancellations must adhere to platform booking rules.

5. Limitation of Liability
ApnaUstad is not liable for individual actions, work quality, disputes, or liabilities arising directly between clients and workers during service execution.`;

  const policyText = activeTab === 'privacy' 
    ? (dynamicContent.privacy || localPrivacy) 
    : (dynamicContent.terms || localTerms);

  return (
    <BackgroundWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader title="Policies & Terms" />

        <View style={styles.headerSection}>
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Eye size={28} color={Colors.primary} />
            </View>
          </View>
          <Text style={[styles.title, Typography.threeD]}>Legal & Privacy</Text>
          <Text style={styles.subtitle}>Read our official guidelines. Content is synced with ApnaUstad's official server database.</Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'privacy' && styles.activeTabBtn]} 
            onPress={() => setActiveTab('privacy')}
          >
            <ShieldAlert size={14} color={activeTab === 'privacy' ? '#000' : 'rgba(255,255,255,0.48)'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'terms' && styles.activeTabBtn]} 
            onPress={() => setActiveTab('terms')}
          >
            <FileText size={14} color={activeTab === 'terms' ? '#000' : 'rgba(255,255,255,0.48)'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>Terms & Conditions</Text>
          </TouchableOpacity>
        </View>

        {/* Content Card */}
        <GlassCard style={styles.policyCard} intensity={20} padding={Spacing.l}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Fetching live document...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {policyText.split('\n\n').map((paragraph, index) => {
                const isHeading = paragraph.match(/^\d+\.\s/);
                return (
                  <Text 
                    key={index} 
                    style={[
                      styles.paragraphText, 
                      isHeading ? styles.headingText : styles.bodyText
                    ]}
                  >
                    {paragraph}
                  </Text>
                );
              })}
            </ScrollView>
          )}
        </GlassCard>

        <Text style={styles.footerNote}>Last Updated: May 2026 · ApnaUstad Platform</Text>
      </ScrollView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrap: {
    width: 88,
    height: 88,
    marginBottom: 16,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 26,
    color: '#fff',
    marginBottom: 6,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.m,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.m - 2,
  },
  activeTabBtn: {
    backgroundColor: Colors.primary,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.48)',
  },
  activeTabText: {
    color: '#000',
  },
  policyCard: {
    minHeight: 320,
    maxHeight: 460,
    borderRadius: BorderRadius.l,
    ...Shadows.depth,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },
  paragraphText: {
    lineHeight: 20,
    marginBottom: 14,
  },
  headingText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 6,
  },
  bodyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  footerNote: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.22)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 18,
  },
});
