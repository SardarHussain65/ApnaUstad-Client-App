import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Eye, ShieldAlert, FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { GlassCard } from '../../components/home/GlassCard';
import { alpha, BorderRadius, Spacing, useTheme, useThemeShadows, useThemeTypography } from '../../constants/Theme';
import api from '../../services/api';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');
  const [loading, setLoading] = useState(false);
  const [dynamicContent, setDynamicContent] = useState<{ privacy?: string; terms?: string }>({});
  const theme = useTheme();
  const typography = useThemeTypography();
  const shadows = useThemeShadows();

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
  const localPrivacy = t('privacy.localPrivacy');
  const localTerms = t('privacy.localTerms');

  const policyText = activeTab === 'privacy' 
    ? (dynamicContent.privacy || localPrivacy) 
    : (dynamicContent.terms || localTerms);

  return (
    <BackgroundWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader title={t('privacy.title')} />

        <View style={styles.headerSection}>
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
              <Eye size={28} color={theme.colors.brand.primary} />
            </View>
          </View>
          <Text style={[styles.title, typography.threeD, { color: theme.colors.text.primary }]}>{t('privacy.legalTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.muted }]}>{t('privacy.legalSubtitle')}</Text>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'privacy' && { backgroundColor: theme.colors.brand.primary }]}
            onPress={() => setActiveTab('privacy')}
          >
            <ShieldAlert size={15} color={activeTab === 'privacy' ? theme.colors.button.primaryText : theme.colors.text.muted} style={styles.tabIcon} />
            <Text style={[styles.tabText, { color: activeTab === 'privacy' ? theme.colors.button.primaryText : theme.colors.text.secondary }]}>{t('privacy.privacyTab')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'terms' && { backgroundColor: theme.colors.brand.primary }]}
            onPress={() => setActiveTab('terms')}
          >
            <FileText size={15} color={activeTab === 'terms' ? theme.colors.button.primaryText : theme.colors.text.muted} style={styles.tabIcon} />
            <Text style={[styles.tabText, { color: activeTab === 'terms' ? theme.colors.button.primaryText : theme.colors.text.secondary }]}>{t('privacy.termsTab')}</Text>
          </TouchableOpacity>
        </View>

        {/* Content Card */}
        <GlassCard style={[styles.policyCard, shadows.depth]} intensity={20} padding={Spacing.l}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.brand.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.text.muted }]}>{t('privacy.loadingText')}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {policyText.split('\n\n').map((paragraph, index) => {
                const isHeading = paragraph.match(/^\d+\.\s/) || paragraph.match(/^[۱۲۳۴۵]\.\s/);
                return (
                  <Text
                    key={index}
                    style={[
                      styles.paragraphText,
                      isHeading ? [styles.headingText, { color: theme.colors.brand.primary }] : [styles.bodyText, { color: theme.colors.text.primary }]
                    ]}
                  >
                    {paragraph}
                  </Text>
                );
              })}
            </ScrollView>
          )}
        </GlassCard>

        <Text style={[styles.footerNote, { color: theme.colors.text.dim }]}>{t('privacy.footerNote')}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.8,
  },
  title: {
    fontSize: 26,
    marginBottom: 6,
    fontWeight: '900',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.m,
    padding: 4,
    borderWidth: 1.6,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: BorderRadius.m - 2,
  },
  activeTabBtn: {},
  tabIcon: {
    marginEnd: 6,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  activeTabText: {},
  policyCard: {
    minHeight: 320,
    maxHeight: 460,
    borderRadius: BorderRadius.l,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  paragraphText: {
    lineHeight: 21,
    marginBottom: 14,
  },
  headingText: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  bodyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 18,
  },
});