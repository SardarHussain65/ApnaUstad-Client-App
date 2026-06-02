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

const formatSince = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Recently joined';
  return `Member since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
};

export default function ClientDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        if (mounted) setError(requestError?.response?.data?.message || 'Unable to load this client profile.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (clientId) {
      fetchClient();
    } else {
      setError('Client profile is unavailable.');
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [clientId]);

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
      Alert.alert('Phone unavailable', 'This client has not shared a contact number.');
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
          <ActivityIndicator color={C.cyan} />
          <Text style={styles.loadingText}>Loading client profile</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (error || !client) {
    return (
      <BackgroundWrapper>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Client profile unavailable</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.emptyAction} onPress={() => router.back()}>
            <Text style={styles.emptyActionText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} activeOpacity={0.8}>
            <ChevronLeft color={C.text} size={22} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>CLIENT PROFILE</Text>
            <Text style={styles.headerTitle}>Service Requester</Text>
          </View>
          {canContactClient ? (
            <TouchableOpacity onPress={callClient} style={styles.headerButton} activeOpacity={0.8}>
              <Phone color={C.green} size={18} strokeWidth={2.4} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (bookingId ? 106 : 34) }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(520)} style={styles.heroCard}>
            <LinearGradient
              colors={['rgba(0,245,255,0.16)', 'rgba(5,11,31,0.94)', 'rgba(8,123,255,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroIdentity}>
              <View style={styles.avatarShell}>
                {client.profileImage ? (
                  <Image source={{ uri: client.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initialsFor(client.fullName)}</Text>
                  </View>
                )}
                <View style={[styles.accountDot, !isActive && styles.accountDotInactive]} />
              </View>

              <View style={styles.heroCopy}>
                <View style={[styles.accountPill, !isActive && styles.accountPillInactive]}>
                  <ShieldCheck size={12} color={isActive ? C.green : C.dim} />
                  <Text style={[styles.accountPillText, !isActive && styles.accountPillTextInactive]}>
                    {isActive ? 'ACTIVE CLIENT' : 'INACTIVE ACCOUNT'}
                  </Text>
                </View>
                <Text style={styles.name}>{client.fullName || 'Client'}</Text>
                <View style={styles.locationLine}>
                  <MapPin size={13} color={C.pink} />
                  <Text style={styles.locationText} numberOfLines={1}>{client.city || client.address || 'Location not added'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.joinedRow}>
              <CalendarDays size={14} color={C.cyan} />
              <Text style={styles.joinedText}>{formatSince(client.createdAt)}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(520)} style={styles.statsStrip}>
            <Metric icon={BriefcaseBusiness} value={String(stats.totalBookings)} label="BOOKINGS" color={C.cyan} />
            <View style={styles.metricDivider} />
            <Metric icon={CheckCircle2} value={String(stats.completedBookings)} label="COMPLETED" color={C.green} />
            <View style={styles.metricDivider} />
            <Metric
              icon={ShieldCheck}
              value={stats.reliabilityRate === null ? 'New' : `${stats.reliabilityRate}%`}
              label="RELIABILITY"
              color={C.amber}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(520)} style={styles.sectionCard}>
            <SectionTitle icon={UserRound} title="CLIENT ACTIVITY" color={C.cyan} />
            <View style={styles.activityGrid}>
              <ActivityTile icon={Clock3} value={String(stats.activeBookings)} label="ACTIVE REQUESTS" color={C.amber} />
              <ActivityTile icon={XCircle} value={String(stats.cancelledBookings)} label="CANCELLATIONS" color={C.pink} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(520)} style={styles.sectionCard}>
            <SectionTitle icon={ShieldCheck} title="CONTACT & LOCATION" color={C.green} />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={canContactClient ? clientPhone || 'Not available' : bookingId ? 'Hidden after mission closure' : 'Available after assignment'}
              color={C.green}
              onPress={clientPhone ? callClient : undefined}
            />
            <View style={styles.infoDivider} />
            <InfoRow icon={MapPin} label="Service address" value={client.address || client.city || 'Not provided'} color={C.pink} />
          </Animated.View>
        </ScrollView>

        {canContactClient && (
          <View style={[styles.dock, { paddingBottom: insets.bottom + 12 }]}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.dockLine} />
            <TouchableOpacity style={styles.secondaryAction} onPress={callClient} activeOpacity={0.8}>
              <Phone size={19} color={C.green} />
              <Text style={styles.secondaryActionText}>CALL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryAction} onPress={openChat} activeOpacity={0.86}>
              <LinearGradient colors={[C.cyan, C.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              <MessageSquare size={19} color="#001018" />
              <Text style={styles.primaryActionText}>MESSAGE CLIENT</Text>
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
  return (
    <View style={styles.metric}>
      <Icon size={16} color={color} />
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}12` }]}>
        <Icon size={14} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: `${color}35` }]} />
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
  return (
    <View style={[styles.activityTile, { borderColor: `${color}24` }]}>
      <Icon size={16} color={color} />
      <Text style={styles.activityValue}>{value}</Text>
      <Text style={styles.activityLabel}>{label}</Text>
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
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.infoRow} onPress={onPress as any} activeOpacity={0.82 as any}>
      <View style={[styles.infoIcon, { backgroundColor: `${color}11` }]}>
        <Icon size={17} color={color} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  loadingText: { color: C.muted, fontSize: 13, fontWeight: '800' },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '900' },
  emptyText: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyAction: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(0,245,255,0.12)' },
  emptyActionText: { color: C.cyan, fontSize: 12, fontWeight: '900' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerButton: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,245,255,0.18)', backgroundColor: 'rgba(4,9,26,0.78)' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 43, height: 43 },
  headerEyebrow: { color: C.dim, fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '900' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  heroCard: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,245,255,0.18)', padding: 15, marginBottom: 12, backgroundColor: C.surface },
  heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatarShell: { width: 82, height: 82, borderRadius: 24, padding: 3, borderWidth: 2, borderColor: 'rgba(0,245,255,0.74)', backgroundColor: 'rgba(0,245,255,0.09)' },
  avatar: { width: '100%', height: '100%', borderRadius: 20 },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(0,245,255,0.11)' },
  avatarText: { color: C.cyan, fontSize: 24, fontWeight: '900' },
  accountDot: { position: 'absolute', bottom: 0, right: 0, width: 15, height: 15, borderRadius: 999, borderWidth: 2, borderColor: '#071024', backgroundColor: C.green },
  accountDotInactive: { backgroundColor: C.dim },
  heroCopy: { flex: 1, minWidth: 0 },
  accountPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(0,232,135,0.24)', backgroundColor: 'rgba(0,232,135,0.08)', marginBottom: 8 },
  accountPillInactive: { borderColor: 'rgba(110,119,140,0.2)', backgroundColor: 'rgba(110,119,140,0.08)' },
  accountPillText: { color: C.green, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  accountPillTextInactive: { color: C.dim },
  name: { color: C.text, fontSize: 23, fontWeight: '900', marginBottom: 8 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { flex: 1, color: C.muted, fontSize: 11, fontWeight: '700' },
  heroDivider: { height: 1, marginVertical: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  joinedRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  joinedText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  statsStrip: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 13, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, marginBottom: 12 },
  metric: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { width: 1, marginVertical: 5, backgroundColor: 'rgba(255,255,255,0.08)' },
  metricValue: { maxWidth: '100%', color: C.text, fontSize: 16, fontWeight: '900', marginTop: 7, paddingHorizontal: 4 },
  metricLabel: { color: C.dim, fontSize: 8, fontWeight: '900', letterSpacing: 0.9, marginTop: 4 },
  sectionCard: { padding: 15, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, marginBottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  sectionLine: { flex: 1, height: 1 },
  activityGrid: { flexDirection: 'row', gap: 10 },
  activityTile: { flex: 1, minHeight: 94, justifyContent: 'center', padding: 12, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.025)' },
  activityValue: { color: C.text, fontSize: 20, fontWeight: '900', marginTop: 8 },
  activityLabel: { color: C.dim, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 },
  infoDivider: { height: 1, marginVertical: 7, backgroundColor: 'rgba(255,255,255,0.07)' },
  infoIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  infoCopy: { flex: 1 },
  infoLabel: { color: C.dim, fontSize: 9, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase' },
  infoValue: { color: C.text, fontSize: 14, lineHeight: 20, fontWeight: '800', marginTop: 4 },
  dock: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingTop: 12, overflow: 'hidden' },
  dockLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: C.border },
  secondaryAction: { width: 92, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(0,232,135,0.2)', backgroundColor: 'rgba(0,232,135,0.07)' },
  secondaryActionText: { color: C.green, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  primaryAction: { flex: 1, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', borderRadius: 15 },
  primaryActionText: { color: '#001018', fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
});
