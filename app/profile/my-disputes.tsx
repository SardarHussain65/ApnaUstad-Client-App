import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Scale } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { GlassCard } from '../../components/home/GlassCard';
import { alpha, useTheme } from '../../constants/Theme';
import { useMyDisputes, type DisputeStatus } from '../../hooks/queries/useDisputes';

const statusColor = (status: DisputeStatus) => {
  if (status === 'resolved') return '#34C759';
  if (status === 'dismissed') return '#8E8E93';
  if (status === 'under_review') return '#FF9F0A';
  return '#FF3B30';
};

const statusKey = (status: DisputeStatus) => {
  if (status === 'resolved') return 'statusResolved';
  if (status === 'dismissed') return 'statusDismissed';
  if (status === 'under_review') return 'statusUnderReview';
  return 'statusOpen';
};

export default function MyDisputesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { data: disputes = [], isLoading, isFetching } = useMyDisputes();

  return (
    <BackgroundWrapper>
      <ProfileHeader title={t('disputes.myTitle', 'My complaints')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.howItWorks}>
          <Text style={[styles.howTitle, { color: theme.colors.text.primary }]}>{t('disputes.howItWorks', 'How it works')}</Text>
          <Text style={[styles.howText, { color: theme.colors.text.muted }]}>
            {t('disputes.howItWorksBody', '1) Report from job details → 2) ApnaUstad reviews both sides → 3) Cash payment resumes or wallet adjustment is made.')}
          </Text>
        </GlassCard>

        {isLoading ? (
          <ActivityIndicator color={theme.colors.brand.primary} style={{ marginTop: 40 }} />
        ) : disputes.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Scale size={28} color={theme.colors.brand.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              {t('disputes.emptyTitle', 'No complaints yet')}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.text.muted }]}>
              {t('disputes.emptyBody', 'Open the job from Bookings and tap Report a problem within 14 days if something went wrong.')}
            </Text>
          </GlassCard>
        ) : (
          disputes.map((dispute, index) => {
            const booking = typeof dispute.booking === 'object' ? dispute.booking : null;
            const bookingId = booking?._id || (typeof dispute.booking === 'string' ? dispute.booking : '');
            const color = statusColor(dispute.status);
            return (
              <Animated.View key={dispute._id} entering={FadeInDown.delay(index * 60)}>
                <GlassCard
                  onPress={() => bookingId && router.push({ pathname: '/transaction-details', params: { id: bookingId } })}
                  style={styles.card}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.category, { color: theme.colors.text.primary }]}>
                      {booking?.category || t('disputes.booking', 'Booking')}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: alpha(color, 0.15), borderColor: alpha(color, 0.35) }]}>
                      <Text style={{ color, fontSize: 10, fontWeight: '800' }}>
                        {t(`disputes.${statusKey(dispute.status)}`, dispute.status.replace(/_/g, ' '))}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.colors.text.muted, fontSize: 13, marginTop: 6, fontWeight: '700' }}>
                    {t(`disputes.reasons.${dispute.reason}`, dispute.reason.replace(/_/g, ' '))}
                  </Text>
                  <Text style={{ color: theme.colors.text.dim, fontSize: 12, marginTop: 8 }} numberOfLines={2}>
                    {dispute.description}
                  </Text>
                  <Text style={{ color: theme.colors.text.dim, fontSize: 11, marginTop: 10 }}>
                    {t('disputes.raisedOn', 'Reported {{date}}', { date: new Date(dispute.createdAt).toLocaleString() })}
                  </Text>
                  <Text style={{ color: theme.colors.brand.primary, fontSize: 11, fontWeight: '800', marginTop: 8 }}>
                    {t('disputes.tapToView', 'Tap to view job details →')}
                  </Text>
                </GlassCard>
              </Animated.View>
            );
          })
        )}
        {isFetching && !isLoading ? (
          <Text style={{ color: theme.colors.text.dim, textAlign: 'center', marginTop: 12 }}>{t('common.refreshing', 'Refreshing...')}</Text>
        ) : null}
      </ScrollView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  howItWorks: { padding: 16, gap: 6 },
  howTitle: { fontSize: 14, fontWeight: '800' },
  howText: { fontSize: 13, lineHeight: 20 },
  emptyCard: { alignItems: 'center', padding: 28, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyText: { textAlign: 'center', lineHeight: 20, fontSize: 14 },
  card: { padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  category: { fontSize: 16, fontWeight: '800', flex: 1 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
