import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ShieldAlert, ShieldCheck, Hourglass, AlertCircle, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeShadows } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useIsRTL } from '../../context/LanguageContext';
import api from '../../services/api';

type VerificationStatus = 'loading' | 'verified' | 'pending' | 'rejected' | 'not_submitted';

interface VerificationDetails {
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  cnicNumber?: string;
}

export function WorkerVerificationBanner() {
  const router = useRouter();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { user } = useAuth();
  const theme = useTheme();
  const colors = useThemeColors();
  const shadows = useThemeShadows();

  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (user?.isVerified) {
      setStatus('verified');
      return;
    }

    try {
      const response = await api.get('/workers/verification/status');
      const details = response.data?.data as VerificationDetails | null;

      if (!details) {
        setStatus(user?.isVerified ? 'verified' : 'not_submitted');
      } else if (details.status === 'approved') {
        setStatus('verified');
      } else if (details.status === 'pending') {
        setStatus('pending');
      } else if (details.status === 'rejected') {
        setStatus('rejected');
        setRejectionReason(details.rejectionReason || null);
      } else {
        setStatus('not_submitted');
      }
    } catch (err) {
      setStatus(user?.isVerified ? 'verified' : 'not_submitted');
    }
  }, [user?.isVerified]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // If worker is fully verified or status is still initial loading without an unverified user, hide banner
  if (status === 'verified' || (status === 'loading' && user?.isVerified)) {
    return null;
  }

  const handlePress = () => {
    router.push('/profile/identity-verification' as any);
  };

  // Configuration based on current status
  const config = {
    pending: {
      accentColor: '#FF9F0A',
      gradient: [alpha('#FF9F0A', 0.18), alpha('#FF9F0A', 0.04)] as [string, string],
      icon: <Hourglass size={20} color="#FF9F0A" />,
      badgeText: t('identityVerification.underReview', 'Under Review'),
      title: t('verificationBanner.pendingTitle', 'Verification In Review'),
      subtitle: t(
        'verificationBanner.pendingSubtitle',
        'Your CNIC is being reviewed by admin. This usually takes under 24 hours.'
      ),
      buttonText: t('verificationBanner.checkStatus', 'Check Status'),
    },
    rejected: {
      accentColor: '#FF453A',
      gradient: [alpha('#FF453A', 0.18), alpha('#FF453A', 0.04)] as [string, string],
      icon: <AlertCircle size={20} color="#FF453A" />,
      badgeText: t('verificationBanner.actionRequired', 'Action Needed'),
      title: t('verificationBanner.rejectedTitle', 'CNIC Verification Update Needed'),
      subtitle: rejectionReason || t(
        'verificationBanner.rejectedSubtitle',
        'Verification was not approved. Tap to view notes and re-upload your CNIC.'
      ),
      buttonText: t('verificationBanner.fixNow', 'Fix & Re-upload'),
    },
    not_submitted: {
      accentColor: colors.worker,
      gradient: [alpha(colors.worker, 0.2), alpha(colors.worker, 0.05)] as [string, string],
      icon: <ShieldAlert size={22} color={colors.worker} />,
      badgeText: t('verificationBanner.recommended', 'Recommended'),
      title: t('verificationBanner.unverifiedTitle', 'Verify Your CNIC Account'),
      subtitle: t(
        'verificationBanner.unverifiedSubtitle',
        'Add your CNIC details to earn a Verified badge and start receiving customer job alerts.'
      ),
      buttonText: t('verificationBanner.verifyNow', 'Verify Account'),
    },
    loading: {
      accentColor: colors.worker,
      gradient: [alpha(colors.worker, 0.1), alpha(colors.worker, 0.02)] as [string, string],
      icon: <ActivityIndicator size="small" color={colors.worker} />,
      badgeText: '',
      title: t('identityVerification.fetching', 'Checking verification status...'),
      subtitle: '',
      buttonText: '',
    },
  }[status];

  return (
    <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutUp.duration(300)} style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        style={[
          styles.container,
          {
            borderColor: alpha(config.accentColor, 0.35),
            backgroundColor: theme.colors.surface.card,
          },
        ]}
      >
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.topRow}>
          <View style={styles.iconAndBadgeRow}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: alpha(config.accentColor, 0.16),
                  borderColor: alpha(config.accentColor, 0.3),
                },
              ]}
            >
              {config.icon}
            </View>
            {Boolean(config.badgeText) && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: alpha(config.accentColor, 0.15),
                    borderColor: alpha(config.accentColor, 0.3),
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: config.accentColor }]}>{config.badgeText}</Text>
              </View>
            )}
          </View>

          {status !== 'loading' && (
            <View style={[styles.actionBtn, { backgroundColor: alpha(config.accentColor, 0.15) }]}>
              <Text style={[styles.actionBtnText, { color: config.accentColor }]}>
                {config.buttonText}
              </Text>
              <ChevronRight size={14} color={config.accentColor} strokeWidth={2.5} />
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          {config.title}
        </Text>

        {Boolean(config.subtitle) && (
          <Text style={[styles.subtitle, { color: theme.colors.text.muted }]} numberOfLines={2}>
            {config.subtitle}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.l,
    marginBottom: Spacing.m,
  },
  container: {
    padding: Spacing.m,
    borderRadius: BorderRadius.l,
    borderWidth: 1.2,
    overflow: 'hidden',
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 2,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
});

