import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { useBookingDetails } from '../hooks';
import api from '../services/api';
import { alpha, useTheme, useThemeColors } from '../constants/Theme';

const C = {
  cyan: '#00F5FF',
  blue: '#087BFF',
  green: '#00E887',
  amber: '#FFB000',
  pink: '#FF4D8D',
  text: '#FFFFFF',
  muted: '#A8B0C2',
  dim: '#6E778C',
  surface: 'rgba(5, 11, 31, 0.88)',
  border: 'rgba(255,255,255,0.09)',
};

interface ClientStats {
  totalBookings: number;
  completedBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  reliabilityRate: number | null;
}

interface PublicClientProfile {
  _id: string;
  fullName: string;
  phone?: string;
  profileImage?: string;
  address?: string;
  city?: string;
  createdAt?: string;
  isActive?: boolean;
  stats?: ClientStats;
}

const firstParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'CL';
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
};

const formatSince = (value?: string, t?: any) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return t ? t('clientDetails.recentlyJoined') : 'Recently joined';
  return t ? t('clientDetails.memberSince', { date: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) }) : `Member since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
};

export default function ClientDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = theme.colors;
  const legacyColors = theme.legacy;
  const params = useLocalSearchParams<{ id?: string | string[]; bookingId?: string | string[] }>();
  const clientId = firstParam(params.id);
  const bookingId = firstParam(params.bookingId);
  const [client, setClient] = useState<PublicClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: contextBooking } = useBookingDetails(bookingId);

  useEffect(() => {
    let mounted = true;
    const fetchClient = async () => {
      try {
        setError('');
        const response = await api.get(`/users/public/${clientId}`);
        if (mounted) setClient(response.data.data);
      } catch (requestError: any) {
        if (mounted) setError(requestError?.response?.data?.message || t('clientDetails.profileUnavailable'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (clientId) {
      fetchClient();
    } else {
      setError(t('clientDetails.profileUnavailable'));
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [clientId, t]);

  const stats: ClientStats = {
    totalBookings: Number(client?.stats?.totalBookings || 0),
    completedBookings: Number(client?.stats?.completedBookings || 0),
    activeBookings: Number(client?.stats?.activeBookings || 0),
    cancelledBookings: Number(client?.stats?.cancelledBookings || 0),
    reliabilityRate: client?.stats?.reliabilityRate ?? null,
  };
  const isActive = client?.isActive !== false;
  const isCommunicationLocked = Boolean(bookingId)
    && (!contextBooking || contextBooking.status === 'completed' || contextBooking.status === 'cancelled');
  const canContactClient = Boolean(bookingId && !isCommunicationLocked);
  const bookingClient = typeof contextBooking?.customer === 'object' ? contextBooking.customer : null;
  const clientPhone = canContactClient && bookingClient?._id === clientId ? bookingClient?.phone : '';

  const callClient = async () => {
    if (!clientPhone) {
      Alert.alert(t('clientDetails.phoneUnavailable'), t('clientDetails.noPhoneNumber'));
      return;
    }
    await Linking.openURL(`tel:${clientPhone}`);
  };

  const openChat = () => {
    if (!canContactClient || !bookingId || !clientId) return;
    router.push({
      pathname: '/chat',
      params: { bookingId, recipientId: clientId, recipientName: client?.fullName || 'Client' },
    });
  };

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.center}>
          <ActivityIndicator color={legacyColors.cyan} />
          <Text style={[styles.loadingText, { color: colors.text.muted }]}>{t('clientDetails.loadingProfile')}</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (error || !client) {
    return (
      <BackgroundWrapper>
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('clientDetails.profileUnavailable')}</Text>
          <Text style={[styles.emptyText, { color: colors.text.muted }]}>{error}</Text>
          <TouchableOpacity 
            style={[
              styles.emptyAction,
              { backgroundColor: theme.isDark ? 'rgba(0,245,255,0.12)' : alpha(legacyColors.cyan, 0.12) }
            ]} 
            onPress={() => router.back()}
          >
            <Text style={[styles.emptyActionText, { color: legacyColors.cyan }]}>{t('common.back').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <View style={styles.root}>
        <View style={[
          styles.header, 
          { 
            paddingTop: insets.top + 8,
            backgroundColor: theme.isDark ? 'rgba(5,5,16,0.74)' : colors.background.screen,
            borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : colors.border.subtle,
          }
        ]}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.055)' : alpha(colors.text.primary, 0.03),
                borderColor: theme.isDark ? 'rgba(255,255,255,0.09)' : colors.border.subtle,
              }
            ]} 
            activeOpacity={0.8}
          >
            <ChevronLeft color={colors.text.primary} size={22} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerEyebrow, { color: colors.text.dim }]}>{t('clientDetails.title').toUpperCase()}</Text>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('clientDetails.serviceRequester')}</Text>
          </View>
          {canContactClient ? (
            <TouchableOpacity 
              onPress={callClient} 
              style={[
                styles.headerButton,
                {
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.055)' : alpha(colors.text.primary, 0.03),
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.09)' : colors.border.subtle,
                }
              ]} 
              activeOpacity={0.8}
            >
              <Phone color={legacyColors.green} size={18} strokeWidth={2.4} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (bookingId ? 106 : 34) }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(520)} style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface.card,
              borderColor: theme.isDark ? 'rgba(0,245,255,0.18)' : colors.border.subtle,
            }
          ]}>
            <LinearGradient
              colors={theme.isDark 
                ? ['rgba(0,245,255,0.16)', 'rgba(5,11,31,0.94)', 'rgba(8,123,255,0.08)']
                : [alpha(colors.brand.primary, 0.06), colors.surface.card, alpha(colors.brand.secondary, 0.03)]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroIdentity}>
              <View style={[
                styles.avatarShell,
                {
                  borderColor: theme.isDark ? 'rgba(0,245,255,0.74)' : colors.border.strong,
                  backgroundColor: theme.isDark ? 'rgba(0,245,255,0.09)' : colors.surface.subtle,
                }
              ]}>
                {client.profileImage ? (
                  <Image source={{ uri: client.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={[
                    styles.avatarFallback,
                    {
                      backgroundColor: theme.isDark ? 'rgba(0,245,255,0.11)' : colors.surface.subtle,
                    }
                  ]}>
                    <Text style={[styles.avatarText, { color: legacyColors.cyan }]}>{initialsFor(client.fullName)}</Text>
                  </View>
                )}
                <View style={[
                  styles.accountDot, 
                  !isActive && styles.accountDotInactive,
                  { borderColor: theme.isDark ? '#071024' : colors.surface.card }
                ]} />
              </View>

              <View style={styles.heroCopy}>
                <View style={[styles.accountPill, !isActive && styles.accountPillInactive]}>
                  <ShieldCheck size={12} color={isActive ? legacyColors.green : colors.text.dim} />
                  <Text style={[styles.accountPillText, !isActive && styles.accountPillTextInactive]}>
                    {isActive ? t('clientDetails.activeClient').toUpperCase() : t('clientDetails.inactiveAccount').toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.name, { color: colors.text.primary }]}>{client.fullName || 'Client'}</Text>
                <View style={styles.locationLine}>
                  <MapPin size={13} color={legacyColors.pink} />
                  <Text style={[styles.locationText, { color: colors.text.muted }]} numberOfLines={1}>{client.city || client.address || t('clientDetails.locationNotAdded')}</Text>
                </View>
              </View>
            </View>

            <View style={[
              styles.heroDivider,
              { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : colors.border.subtle }
            ]} />

            <View style={styles.joinedRow}>
              <CalendarDays size={14} color={legacyColors.cyan} />
              <Text style={[styles.joinedText, { color: colors.text.muted }]}>{formatSince(client.createdAt, t)}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(520)} style={[
            styles.statsStrip,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.subtle,
            }
          ]}>
            <Metric icon={BriefcaseBusiness} value={String(stats.totalBookings)} label={t('clientDetails.bookings')} color={legacyColors.cyan} />
            <View style={[styles.metricDivider, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : colors.border.subtle }]} />
            <Metric icon={CheckCircle2} value={String(stats.completedBookings)} label={t('clientDetails.completed')} color={legacyColors.green} />
            <View style={[styles.metricDivider, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : colors.border.subtle }]} />
            <Metric
              icon={ShieldCheck}
              value={stats.reliabilityRate === null ? t('common.new') : `${stats.reliabilityRate}%`}
              label={t('clientDetails.reliability')}
              color={C.amber}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(520)} style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.subtle,
            }
          ]}>
            <SectionTitle icon={UserRound} title={t('clientDetails.clientActivity')} color={legacyColors.cyan} />
            <View style={styles.activityGrid}>
              <ActivityTile icon={Clock3} value={String(stats.activeBookings)} label={t('clientDetails.activeRequests')} color={C.amber} />
              <ActivityTile icon={XCircle} value={String(stats.cancelledBookings)} label={t('clientDetails.cancellations')} color={legacyColors.pink} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(520)} style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.subtle,
            }
          ]}>
            <SectionTitle icon={ShieldCheck} title={t('clientDetails.contactLocation')} color={legacyColors.green} />
            <InfoRow
              icon={Phone}
              label={t('clientDetails.phone')}
              value={canContactClient ? clientPhone || t('clientDetails.notAvailable') : bookingId ? t('clientDetails.hiddenClosed') : t('clientDetails.availableAssigned')}
              color={legacyColors.green}
              onPress={clientPhone ? callClient : undefined}
            />
            <View style={[styles.infoDivider, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : colors.border.subtle }]} />
            <InfoRow icon={MapPin} label={t('clientDetails.serviceAddress')} value={client.address || client.city || t('clientDetails.notProvided')} color={legacyColors.pink} />
          </Animated.View>
        </ScrollView>

        {canContactClient && (
          <View style={[styles.dock, { paddingBottom: insets.bottom + 12 }]}>
            <BlurView intensity={80} tint={theme.blurTint} style={StyleSheet.absoluteFillObject} />
            <View style={[styles.dockLine, { backgroundColor: colors.border.subtle }]} />
            <TouchableOpacity style={styles.secondaryAction} onPress={callClient} activeOpacity={0.8}>
              <Phone size={19} color={legacyColors.green} />
              <Text style={styles.secondaryActionText}>{t('clientDetails.call')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryAction} onPress={openChat} activeOpacity={0.86}>
              <LinearGradient colors={[legacyColors.cyan, C.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              <MessageSquare size={19} color="#001018" />
              <Text style={styles.primaryActionText}>{t('clientDetails.messageClient')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </BackgroundWrapper>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<any>;
  value: string;
  label: string;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Icon size={16} color={color} />
      <Text style={[styles.metricValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.text.dim }]}>{label}</Text>
    </View>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  color,
}: {
  icon: React.ComponentType<any>;
  title: string;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}12` }]}>
        <Icon size={14} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: theme.isDark ? `${color}35` : theme.colors.border.subtle }]} />
    </View>
  );
}

function ActivityTile({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<any>;
  value: string;
  label: string;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={[
      styles.activityTile, 
      { 
        borderColor: theme.isDark ? `${color}24` : theme.colors.border.subtle,
        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.025)' : theme.colors.surface.subtle,
      }
    ]}>
      <Icon size={16} color={color} />
      <Text style={[styles.activityValue, { color: theme.colors.text.primary }]}>{value}</Text>
      <Text style={[styles.activityLabel, { color: theme.colors.text.dim }]}>{label}</Text>
    </View>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.infoRow} onPress={onPress as any} activeOpacity={0.82 as any}>
      <View style={[styles.infoIcon, { backgroundColor: `${color}11` }]}>
        <Icon size={17} color={color} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color: theme.colors.text.dim }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>{value}</Text>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  loadingText: { fontSize: 13, fontWeight: '800' },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyAction: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  emptyActionText: { fontSize: 12, fontWeight: '900' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerButton: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 43, height: 43 },
  headerEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  heroCard: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, padding: 15, marginBottom: 12 },
  heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatarShell: { width: 82, height: 82, borderRadius: 24, padding: 3, borderWidth: 2 },
  avatar: { width: '100%', height: '100%', borderRadius: 20 },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  avatarText: { fontSize: 24, fontWeight: '900' },
  accountDot: { position: 'absolute', bottom: 0, right: 0, width: 15, height: 15, borderRadius: 999, borderWidth: 2, backgroundColor: '#00E887' },
  accountDotInactive: { backgroundColor: '#6E778C' },
  heroCopy: { flex: 1, minWidth: 0 },
  accountPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(0,232,135,0.24)', backgroundColor: 'rgba(0,232,135,0.08)', marginBottom: 8 },
  accountPillInactive: { borderColor: 'rgba(110,119,140,0.2)', backgroundColor: 'rgba(110,119,140,0.08)' },
  accountPillText: { color: '#00E887', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  accountPillTextInactive: { color: '#6E778C' },
  name: { fontSize: 23, fontWeight: '900', marginBottom: 8 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { flex: 1, fontSize: 11, fontWeight: '700' },
  heroDivider: { height: 1, marginVertical: 14 },
  joinedRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  joinedText: { fontSize: 12, fontWeight: '700' },
  statsStrip: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 13, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  metric: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { width: 1, marginVertical: 5 },
  metricValue: { maxWidth: '100%', fontSize: 16, fontWeight: '900', marginTop: 7, paddingHorizontal: 4 },
  metricLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.9, marginTop: 4 },
  sectionCard: { padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  sectionLine: { flex: 1, height: 1 },
  activityGrid: { flexDirection: 'row', gap: 10 },
  activityTile: { flex: 1, minHeight: 94, justifyContent: 'center', padding: 12, borderRadius: 14, borderWidth: 1 },
  activityValue: { fontSize: 20, fontWeight: '900', marginTop: 8 },
  activityLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 },
  infoDivider: { height: 1, marginVertical: 7 },
  infoIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  infoCopy: { flex: 1 },
  infoLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, lineHeight: 20, fontWeight: '800', marginTop: 4 },
  dock: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingTop: 12, overflow: 'hidden' },
  dockLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  secondaryAction: { width: 92, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(0,232,135,0.2)', backgroundColor: 'rgba(0,232,135,0.07)' },
  secondaryActionText: { color: '#00E887', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  primaryAction: { flex: 1, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', borderRadius: 15 },
  primaryActionText: { color: '#001018', fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
});
