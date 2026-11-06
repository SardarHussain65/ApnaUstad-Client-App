import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  FileText,
  Hourglass,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Radio,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  X,
  XCircle,
  Zap,
} from 'lucide-react-native';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { ConfirmModal } from '../components/ui';
import { alpha, BorderRadius, Colors, Shadows, Spacing, Typography, useTheme, useThemeColors, useThemeTypography, useThemeShadows, useThemedStyles, type AppTheme } from '../constants/Theme';
import { useConfirmModal, useJobDetails, useToast, useWorkerBids } from '../hooks';
import { useWithdrawBidMutation } from '../hooks/mutations/useMutations';
import { useAuth } from '../context/AuthContext';
import { JobEvidenceGallery, buildJobEvidenceItems } from '../components/common/JobEvidenceGallery';
import api from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeyFactory';
import { socketService } from '../services/socketService';

const createStyles = (theme: AppTheme) => {
  const isDark = theme.isDark;
  const CYAN = theme.legacy.cyan;
  const GREEN = theme.legacy.green;
  const ORANGE = theme.legacy.orange;
  const RED = theme.legacy.error;
  const PURPLE = theme.legacy.purple;

  const surfaceBg = isDark ? theme.colors.surface.card : '#FFFFFF';
  const borderCol = isDark ? theme.colors.border.subtle : 'rgba(15, 23, 42, 0.16)';
  const textPrimary = theme.colors.text.primary;
  const textSecondary = theme.colors.text.secondary;
  const textMuted = theme.colors.text.muted;
  const textDim = theme.colors.text.dim;

  return StyleSheet.create({
    root: {
      flex: 1,
    },
    centeredFill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingIcon: {
      width: 62,
      height: 62,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(ORANGE, 0.12),
      borderWidth: 1,
      borderColor: alpha(ORANGE, 0.32),
      marginBottom: 4,
    },
    loadingText: {
      color: textMuted,
      fontSize: 13,
      fontWeight: '800',
    },
    emptyState: {
      paddingHorizontal: 34,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(ORANGE, 0.12),
      borderWidth: 1,
      borderColor: alpha(ORANGE, 0.3),
    },
    emptyTitle: {
      color: textPrimary,
      fontSize: 22,
      fontWeight: '900',
      marginTop: 6,
    },
    emptyText: {
      color: textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    backHomeButton: {
      minHeight: 48,
      marginTop: 10,
      paddingHorizontal: 18,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    backHomeText: {
      color: theme.colors.button.primaryText,
      fontSize: 14,
      fontWeight: '900',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.m,
      paddingBottom: 13,
      borderBottomWidth: 1,
      borderBottomColor: borderCol,
    },
    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: borderCol,
    },
    headerCopy: {
      flex: 1,
      alignItems: 'center',
    },
    headerEyebrow: {
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    headerTitle: {
      color: textPrimary,
      fontSize: 19,
      fontWeight: '900',
      marginTop: 3,
    },
    headerSpacer: {
      width: 44,
    },
    scrollContent: {
      paddingHorizontal: Spacing.m,
      paddingTop: Spacing.m,
    },
    heroCard: {
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.l,
    },
    heroContent: {
      padding: 16,
      overflow: 'hidden',
    },
    heroAccent: {
      position: 'absolute',
      top: 16,
      bottom: 16,
      left: 0,
      width: 3,
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
      backgroundColor: ORANGE,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: alpha(ORANGE, 0.34),
      backgroundColor: alpha(ORANGE, 0.12),
    },
    pendingBadgeText: {
      color: ORANGE,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    submittedBadge: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 5,
    },
    submittedBadgeText: {
      flexShrink: 1,
      color: CYAN,
      fontSize: 10,
      fontWeight: '800',
      textAlign: 'right',
    },
    heroTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(CYAN, 0.08),
      borderWidth: 1,
      borderColor: alpha(CYAN, 0.2),
    },
    heroTitleCopy: {
      flex: 1,
      minWidth: 0,
    },
    heroLabel: {
      color: CYAN,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: textPrimary,
      fontSize: 24,
      fontWeight: '900',
      marginTop: 3,
    },
    heroDescription: {
      color: textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
      marginTop: 6,
    },
    heroBottomRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: borderCol,
      marginTop: 16,
      paddingTop: 14,
    },
    heroValueLabel: {
      color: textDim,
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    heroValue: {
      color: GREEN,
      fontSize: 23,
      fontWeight: '900',
      marginTop: 4,
    },
    heroStatusNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: alpha(GREEN, 0.25),
      backgroundColor: alpha(GREEN, 0.08),
      paddingHorizontal: 9,
      paddingVertical: 7,
    },
    heroStatusText: {
      color: GREEN,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    section: {
      marginBottom: Spacing.l,
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginBottom: 11,
    },
    sectionIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    sectionHeadingCopy: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    sectionSubtitle: {
      color: textDim,
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 15,
      marginTop: 2,
    },
    detailGrid: {
      flexDirection: 'row',
      gap: 7,
      marginBottom: 9,
    },
    detailPill: {
      flex: 1,
      minWidth: 0,
      minHeight: 76,
      justifyContent: 'center',
      borderRadius: BorderRadius.l,
      borderWidth: 1,
      borderColor: borderCol,
      backgroundColor: theme.colors.surface.card,
      padding: 9,
    },
    detailPillIcon: {
      width: 27,
      height: 27,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 7,
    },
    detailPillCopy: {
      minWidth: 0,
    },
    detailPillLabel: {
      color: textDim,
      fontSize: 8,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    detailPillValue: {
      color: textPrimary,
      fontSize: 11,
      fontWeight: '800',
      marginTop: 3,
    },
    locationCard: {
      borderRadius: BorderRadius.l,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    locationIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(GREEN, 0.08),
    },
    locationCopy: {
      flex: 1,
    },
    locationLabel: {
      color: textDim,
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    locationValue: {
      color: textPrimary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
      marginTop: 4,
    },
    clientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    avatarShell: {
      width: 56,
      height: 56,
      borderRadius: 19,
      padding: 3,
      borderWidth: 1.5,
      borderColor: alpha(ORANGE, 0.35),
      backgroundColor: alpha(theme.colors.text.primary, 0.03),
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 15,
    },
    avatarFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 15,
    },
    avatarText: {
      color: textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    clientCopy: {
      flex: 1,
      minWidth: 0,
    },
    clientRole: {
      color: ORANGE,
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    clientName: {
      color: textPrimary,
      fontSize: 17,
      fontWeight: '900',
      marginTop: 3,
    },
    clientHistory: {
      color: textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 4,
    },
    profileCue: {
      height: 36,
      minWidth: 45,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      borderWidth: 1,
      borderColor: alpha(CYAN, 0.2),
      backgroundColor: alpha(CYAN, 0.08),
    },
    mediaRail: {
      gap: 10,
    },
    mediaCard: {
      height: 188,
      overflow: 'hidden',
      borderRadius: BorderRadius.l,
      borderWidth: 1,
      borderColor: alpha(PURPLE, 0.34),
      backgroundColor: surfaceBg,
    },
    mediaImage: {
      width: '100%',
      height: '100%',
    },
    videoCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      backgroundColor: alpha(PURPLE, 0.08),
    },
    videoTitle: {
      color: textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    videoHint: {
      color: textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    mediaFooter: {
      position: 'absolute',
      left: 10,
      right: 10,
      bottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    mediaIndex: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
    mediaTypeBadge: {
      borderRadius: BorderRadius.full,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: 'rgba(0,0,0,0.46)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    mediaTypeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    proposalCard: {
      borderRadius: BorderRadius.xl,
    },
    proposalStats: {
      flexDirection: 'row',
      padding: 14,
    },
    proposalStat: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 5,
    },
    proposalIcon: {
      width: 36,
      height: 36,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 7,
    },
    proposalLabel: {
      color: textDim,
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    proposalValue: {
      fontSize: 18,
      fontWeight: '900',
      marginTop: 5,
      textAlign: 'center',
    },
    proposalDivider: {
      width: 1,
      backgroundColor: borderCol,
      marginVertical: 4,
    },
    messageArea: {
      borderTopWidth: 1,
      borderTopColor: borderCol,
      padding: 14,
      backgroundColor: alpha(theme.colors.text.primary, 0.015),
    },
    messageLabel: {
      color: CYAN,
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    messageText: {
      color: textSecondary,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '600',
      marginTop: 7,
    },
    bottomDock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: Spacing.m,
      paddingTop: 20,
    },
    dockActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    updateOfferBtn: {
      flex: 1.5,
      height: 52,
      borderRadius: BorderRadius.l,
      overflow: 'hidden',
      shadowColor: ORANGE,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    },
    updateOfferGradient: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    updateOfferText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    withdrawButton: {
      flex: 1,
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      overflow: 'hidden',
      borderRadius: BorderRadius.l,
      borderWidth: 1,
      borderColor: alpha(RED, 0.34),
      backgroundColor: isDark ? 'rgba(28,8,18,0.96)' : '#FFF5F5',
      paddingHorizontal: 10,
    },
    buttonDisabled: {
      opacity: 0.64,
    },
    withdrawTitle: {
      color: RED,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    // Status Notice Card Styles
    statusNoticeCard: {
      borderRadius: BorderRadius.xl,
      borderWidth: 1.2,
      padding: 14,
      gap: 12,
    },
    statusNoticeIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusNoticeTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 3,
    },
    statusNoticeBody: {
      fontSize: 12,
      lineHeight: 18,
    },
    statusNoticeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: BorderRadius.l,
    },
    statusNoticeBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    // Update Rate Modal Styles
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'flex-end',
    },
    modalKeyboardWrap: {
      width: '100%',
    },
    modalCard: {
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      borderTopWidth: 1,
      padding: Spacing.l,
      paddingBottom: Spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalHeaderIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '900',
    },
    modalSubtitle: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(textPrimary, 0.06),
    },
    modalCompareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: BorderRadius.m,
      padding: 12,
      marginBottom: 16,
    },
    modalCompareCol: {
      flex: 1,
      alignItems: 'center',
    },
    modalCompareLabel: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    modalCompareVal: {
      fontSize: 15,
      fontWeight: '900',
      marginTop: 3,
    },
    modalCompareDivider: {
      width: 1,
      height: 28,
      backgroundColor: borderCol,
    },
    modalChipsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    modalChip: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: BorderRadius.m,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalChipText: {
      fontSize: 11,
      fontWeight: '800',
    },
    modalInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: BorderRadius.m,
      borderWidth: 1.5,
      backgroundColor: alpha(textPrimary, 0.04),
      paddingHorizontal: 14,
      height: 52,
      marginBottom: 12,
    },
    modalInputPrefix: {
      fontSize: 14,
      fontWeight: '900',
      marginRight: 10,
    },
    modalInput: {
      flex: 1,
      fontSize: 18,
      fontWeight: '900',
    },
    modalFeeBreakdown: {
      paddingHorizontal: 4,
      marginBottom: 16,
      gap: 6,
    },
    modalFeeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalFeeLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    modalFeeVal: {
      fontSize: 11,
      fontWeight: '700',
    },
    modalNetLabel: {
      fontSize: 12,
      fontWeight: '800',
    },
    modalNetVal: {
      fontSize: 14,
      fontWeight: '900',
    },
    modalFooterBtns: {
      flexDirection: 'row',
      gap: 10,
    },
    modalCancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: BorderRadius.l,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelText: {
      fontSize: 13,
      fontWeight: '700',
    },
    modalSubmitBtn: {
      flex: 2,
      height: 48,
      borderRadius: BorderRadius.l,
      overflow: 'hidden',
    },
    modalSubmitGradient: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 14,
    },
    modalSubmitText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });
};

function statusColor(specialty: any, theme: ReturnType<typeof useTheme>) {
  if (specialty.approvalStatus === 'pending') return theme.legacy.yellow;
  if (specialty.approvalStatus === 'rejected' || specialty.subscriptionStatus === 'expired') return theme.colors.status.error;
  if (specialty.subscriptionStatus === 'payment_due') return theme.colors.brand.worker;
  return theme.colors.status.success;
}

const compactUrls = (urls: (string | undefined | null)[]) =>
  Array.from(new Set(urls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)));

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'CL';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
};

const formatDate = (value?: string, t?: any) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return t ? t('common.today') : 'Today';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatMoney = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString()}`;

const formatSubmittedAt = (value?: string, t?: any) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return t ? t('pendingBidDetails.recentlySubmitted') : 'Recently submitted';

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return t ? t('pendingBidDetails.submittedJustNow') : 'Submitted just now';
  if (minutes < 60) return t ? t('pendingBidDetails.submittedMinutesAgo', { count: minutes }) : `Submitted ${minutes}m ago`;
  if (minutes < 24 * 60) return t ? t('pendingBidDetails.submittedHoursAgo', { count: Math.floor(minutes / 60) }) : `Submitted ${Math.floor(minutes / 60)}h ago`;
  return t ? t('pendingBidDetails.submittedDate', { date: formatDate(value, t) }) : `Submitted ${formatDate(value)}`;
};

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  color,
}: {
  icon: React.ComponentType<any>;
  title: string;
  subtitle?: string;
  color?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const resolvedColor = color || theme.legacy.cyan;
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: alpha(resolvedColor, 0.08), borderColor: alpha(resolvedColor, 0.18) }]}>
        <Icon size={15} color={resolvedColor} strokeWidth={2.4} />
      </View>
      <View style={styles.sectionHeadingCopy}>
        <Text style={[styles.sectionTitle, { color: resolvedColor }]}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function DetailPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  color?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const resolvedColor = color || theme.legacy.cyan;
  return (
    <View style={styles.detailPill}>
      <View style={[styles.detailPillIcon, { backgroundColor: alpha(resolvedColor, 0.07) }]}>
        <Icon size={14} color={resolvedColor} strokeWidth={2.4} />
      </View>
      <View style={styles.detailPillCopy}>
        <Text style={styles.detailPillLabel}>{label}</Text>
        <Text style={styles.detailPillValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

export default function PendingBidDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = theme.legacy;
  const themeColors = useThemeColors();
  const shadows = useThemeShadows();
  const typography = useThemeTypography();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ id?: string; pendingBidId?: string }>();
  const { data: bids, isLoading: isLoadingBids, refetch: refetchBids } = useWorkerBids();
  const bid = bids?.find(item => item._id === params.pendingBidId);
  const bidJob = bid?.jobPost && typeof bid.jobPost === 'object' ? bid.jobPost : null;
  const jobId = params.id || (typeof bid?.jobPost === 'string' ? bid.jobPost : bidJob?._id);
  const { data: job, isLoading: isLoadingJob, refetch: refetchJob } = useJobDetails(jobId);
  const { mutate: withdrawBid, isPending: isWithdrawing } = useWithdrawBidMutation();
  const { user } = useAuth();
  const toast = useToast();
  const confirmModal = useConfirmModal();
  const queryClient = useQueryClient();
  const workerPerson = bid?.worker && typeof bid.worker === 'object' ? bid.worker : null;

  const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false);
  const [updatedPrice, setUpdatedPrice] = useState('');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  const displayJob = job || bidJob;
  const rawJob: any = displayJob;
  const currentProposedPrice = Number(bid?.proposedPrice || displayJob?.amount || 0);

  const myWorkerId = String(user?._id || '');
  const bidStatus = String(bid?.status || '');
  const isWon = bidStatus === 'accepted' || (
    displayJob?.status === 'assigned' &&
    rawJob?.assignedWorker &&
    String(rawJob.assignedWorker?._id || rawJob.assignedWorker) === myWorkerId
  );
  const isHiredOther = !isWon && (
    bidStatus === 'lost' ||
    (
      ['assigned', 'closed'].includes(displayJob?.status || '') &&
      Boolean(rawJob?.assignedWorker || rawJob?.bookingId || rawJob?.acceptedBid)
    )
  );
  const isJobCancelled = displayJob?.status === 'cancelled' || bidStatus === 'cancelled';
  const isRejected = !isWon && !isHiredOther && !isJobCancelled && bidStatus === 'rejected';

  // Real-time socket listener for instant UI updates when customer declines or hires
  useEffect(() => {
    const onBidRejected = (data: any) => {
      const targetBidId = data?.bidId?.toString();
      if (!targetBidId || targetBidId === params.pendingBidId || targetBidId === bid?._id?.toString()) {
        void refetchBids();
        void refetchJob?.();
        void queryClient.invalidateQueries({ queryKey: queryKeys.bids.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        toast.error(
          'Offer Declined by Customer',
          data?.reason || 'Customer declined your quote. You can submit an updated rate!'
        );
      }
    };

    const onBidLost = (data: any) => {
      const targetJobId = data?.jobPost?._id?.toString() || data?.jobId?.toString();
      if (!targetJobId || targetJobId === jobId) {
        void refetchBids();
        void refetchJob?.();
        void queryClient.invalidateQueries({ queryKey: queryKeys.bids.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        toast.info(
          'Position Filled',
          'The customer has selected another Ustad for this job.'
        );
      }
    };

    const onJobAssigned = (data: any) => {
      const targetJobId = data?.jobId?.toString();
      if (!targetJobId || targetJobId === jobId) {
        void refetchBids();
        void refetchJob?.();
        void queryClient.invalidateQueries({ queryKey: queryKeys.bids.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      }
    };

    const onBidWon = (data: any) => {
      const targetJobId = data?.jobPost?._id?.toString() || data?.jobId?.toString();
      if (!targetJobId || targetJobId === jobId) {
        void refetchBids();
        void refetchJob?.();
        void queryClient.invalidateQueries({ queryKey: queryKeys.bids.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        toast.success(
          'You Were Hired! 🎉',
          'The customer accepted your proposal! Tap to view booking.'
        );
      }
    };

    const unsubs = [
      socketService.on('bid:rejected', onBidRejected),
      socketService.on('bid:lost', onBidLost),
      socketService.on('bid:won', onBidWon),
      socketService.on('job:assigned', onJobAssigned),
      socketService.on('job:cancelled', onBidLost),
    ];

    return () => {
      unsubs.forEach(u => u());
    };
  }, [params.pendingBidId, bid?._id, jobId, refetchBids, refetchJob, queryClient, toast]);

  const handleOpenUpdateModal = () => {
    setUpdatedPrice(String(currentProposedPrice));
    setShowUpdatePriceModal(true);
  };

  const handleUpdatePriceSubmit = async () => {
    const finalPrice = Number(updatedPrice);
    if (!finalPrice || finalPrice <= 0) {
      toast.error('Invalid Rate', 'Please enter a valid rate amount.');
      return;
    }
    if (!bid?._id) return;

    try {
      setIsUpdatingPrice(true);
      const response = await api.patch(`/jobs/bids/${bid._id}`, {
        proposedPrice: finalPrice,
      });

      if (response.data?.success) {
        toast.success(
          t('pendingBidDetails.priceUpdatedTitle', 'Offer Updated!'),
          t('pendingBidDetails.priceUpdatedDesc', 'The customer has been notified of your new rate.')
        );
        setShowUpdatePriceModal(false);
        await Promise.allSettled([
          refetchBids(),
          queryClient.invalidateQueries({ queryKey: queryKeys.bids.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.bids.byWorker() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
        ]);
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        toast.error(
          'Top-Up Required',
          err.response?.data?.message || 'Please recharge your wallet to maintain required minimum balance.'
        );
      } else {
        toast.error(
          'Could Not Update Rate',
          err.response?.data?.message || 'Something went wrong. Please try again.'
        );
      }
    } finally {
      setIsUpdatingPrice(false);
    }
  };
  const meta = bid?.cardMeta;
  const customer = displayJob?.customer && typeof displayJob.customer === 'object' ? displayJob.customer : null;
  const clientMeta = meta?.counterParty || displayJob?.clientMeta || customer;

  const media = useMemo(() => {
    const images = Array.isArray(meta?.media?.images)
      ? meta.media.images
      : Array.isArray(displayJob?.media?.images)
        ? displayJob.media.images
        : compactUrls([displayJob?.imageUrl, ...(displayJob?.imageUrls || [])]);
    const videos = Array.isArray(meta?.media?.videos)
      ? meta.media.videos
      : Array.isArray(displayJob?.media?.videos)
        ? displayJob.media.videos
        : compactUrls([displayJob?.videoUrl, ...(displayJob?.videoUrls || [])]);
    const audios = Array.isArray(meta?.media?.audios)
      ? meta.media.audios
      : Array.isArray(displayJob?.media?.audios)
        ? displayJob.media.audios
        : compactUrls(displayJob?.audioUrls || []);

    return buildJobEvidenceItems({ images, videos, audios });
  }, [
    displayJob?.imageUrl,
    displayJob?.imageUrls,
    displayJob?.media?.images,
    displayJob?.media?.audios,
    displayJob?.media?.videos,
    displayJob?.audioUrls,
    displayJob?.videoUrl,
    displayJob?.videoUrls,
    meta?.media?.images,
    meta?.media?.audios,
    meta?.media?.videos,
  ]);

  if (isLoadingBids || (jobId && isLoadingJob)) {
    return (
      <BackgroundWrapper>
        <View style={styles.centeredFill}>
          <View style={styles.loadingIcon}>
            <Hourglass size={26} color={colors.worker} strokeWidth={2.2} />
          </View>
          <ActivityIndicator color={colors.cyan} />
          <Text style={styles.loadingText}>{t('pendingBidDetails.loading')}</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (!displayJob) {
    return (
      <BackgroundWrapper>
        <View style={[styles.centeredFill, styles.emptyState]}>
          <View style={styles.emptyIcon}>
            <FileText size={27} color={colors.worker} strokeWidth={2.1} />
          </View>
          <Text style={styles.emptyTitle}>{t('pendingBidDetails.unavailable')}</Text>
          <Text style={styles.emptyText}>{t('pendingBidDetails.unavailableDesc')}</Text>
          <TouchableOpacity style={[styles.backHomeButton, { backgroundColor: theme.colors.brand.primary }]} onPress={() => router.back()} activeOpacity={0.82}>
            <ChevronLeft size={17} color="#001014" strokeWidth={2.8} />
            <Text style={styles.backHomeText}>{t('pendingBidDetails.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  const isInstant = (meta?.missionKind || displayJob.urgency) === 'instant';
  const MissionIcon = isInstant ? Zap : CalendarDays;
  const title = meta?.title || displayJob.category || t('jobDetails.defaultTitle');
  const description = meta?.description || displayJob.description || t('jobDetails.defaultDescription');
  const missionKindLabel = meta?.missionKindLabel || (isInstant ? t('transactionDetails.instantVisit') : t('transactionDetails.scheduledVisit'));
  const dateLabel = meta?.schedule?.dateLabel || formatDate(displayJob.scheduledDate, t);
  const timeLabel = meta?.schedule?.timeLabel || displayJob.scheduledTime || t('common.asap');
  const locationLabel = meta?.location?.address || displayJob.address || t('pendingBidDetails.serviceLocationNotShared');
  const quoteText = meta?.financial?.amountText || formatMoney(bid?.proposedPrice || displayJob.amount);
  const clientName = clientMeta?.fullName || t('common.client');
  const clientImage = clientMeta?.profileImage || '';
  const clientJobs = Number((clientMeta as any)?.completedJobs || (clientMeta as any)?.totalJobs || 0);
  const clientId = clientMeta?._id || customer?._id;
  const submittedText = formatSubmittedAt(meta?.submittedAt || bid?.createdAt, t);
  const estimatedTime = Number(bid?.estimatedDays || 0) > 0
    ? t('pendingBidDetails.daysCount', { count: bid?.estimatedDays })
    : t('common.flexible');
  const handleWithdraw = () => {
    if (!bid || isWithdrawing) return;

    confirmModal.showConfirm(
      t('pendingBidDetails.withdrawConfirmTitle'),
      t('pendingBidDetails.withdrawConfirmMsg'),
      () => {
        confirmModal.closeConfirm();
        withdrawBid(
          { bidId: bid._id },
          {
            onSuccess: () => {
              refetchBids();
              router.back();
            },
            onError: () => toast.error(t('pendingBidDetails.unableWithdraw'), t('pendingBidDetails.tryAgain')),
          }
        );
      },
      undefined,
      t('pendingBidDetails.withdraw'),
      t('pendingBidDetails.keepProposal'),
      colors.error
    );
  };

  const openClientProfile = () => {
    if (!clientId) return;
    router.push({ pathname: '/client-details' as any, params: { id: String(clientId) } });
  };

  return (
    <BackgroundWrapper>
      <View style={styles.root}>
        <View style={[
          styles.header, 
          { 
            paddingTop: insets.top + 8,
            backgroundColor: theme.isDark ? 'rgba(5,5,16,0.74)' : theme.colors.background.screen,
            borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border.subtle,
          }
        ]}>
          <TouchableOpacity 
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.055)' : alpha(theme.colors.text.primary, 0.03),
                borderColor: theme.isDark ? theme.colors.border.subtle : theme.colors.border.subtle,
              }
            ]} 
            onPress={() => router.back()} 
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color={theme.colors.text.primary} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={[styles.headerEyebrow, { color: theme.colors.brand.worker }]}>{t('pendingBidDetails.activeBid')}</Text>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>{t('pendingBidDetails.proposalDetails')}</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 126 }]}
        >
          <Animated.View entering={FadeInDown.duration(460)}>
            <GlassCard
              padding={0}
              intensity={50}
              hasGlow
              glowColor={colors.worker}
              style={styles.heroCard}
              contentStyle={styles.heroContent}
            >
              <LinearGradient
                colors={
                  theme.isDark
                    ? ['rgba(255,140,0,0.22)', 'rgba(8,10,30,0.93)', 'rgba(0,245,255,0.12)']
                    : [alpha(colors.worker, 0.18), alpha(theme.colors.surface.card, 0.70), alpha(colors.cyan, 0.10)]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroAccent} />

              <View style={styles.heroTopRow}>
                {isRejected ? (
                  <View style={[styles.pendingBadge, { backgroundColor: alpha(colors.error || '#EF4444', 0.16), borderColor: alpha(colors.error || '#EF4444', 0.4) }]}>
                    <AlertTriangle size={12} color={colors.error || '#EF4444'} strokeWidth={2.4} />
                    <Text style={[styles.pendingBadgeText, { color: colors.error || '#EF4444' }]}>
                      OFFER DECLINED BY CUSTOMER
                    </Text>
                  </View>
                ) : isHiredOther ? (
                  <View style={[styles.pendingBadge, { backgroundColor: alpha(colors.orange || '#F59E0B', 0.16), borderColor: alpha(colors.orange || '#F59E0B', 0.4) }]}>
                    <X size={12} color={colors.orange || '#F59E0B'} strokeWidth={2.4} />
                    <Text style={[styles.pendingBadgeText, { color: colors.orange || '#F59E0B' }]}>
                      CUSTOMER HIRED ANOTHER USTAD
                    </Text>
                  </View>
                ) : isJobCancelled ? (
                  <View style={[styles.pendingBadge, { backgroundColor: alpha(colors.error || '#EF4444', 0.16), borderColor: alpha(colors.error || '#EF4444', 0.4) }]}>
                    <X size={12} color={colors.error || '#EF4444'} strokeWidth={2.4} />
                    <Text style={[styles.pendingBadgeText, { color: colors.error || '#EF4444' }]}>
                      REQUEST CANCELLED
                    </Text>
                  </View>
                ) : isWon ? (
                  <View style={[styles.pendingBadge, { backgroundColor: alpha(colors.green || '#10B981', 0.16), borderColor: alpha(colors.green || '#10B981', 0.4) }]}>
                    <CheckCircle2 size={12} color={colors.green || '#10B981'} strokeWidth={2.4} />
                    <Text style={[styles.pendingBadgeText, { color: colors.green || '#10B981' }]}>
                      OFFER ACCEPTED • HIRED!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Hourglass size={12} color={colors.worker} strokeWidth={2.4} />
                    <Text style={styles.pendingBadgeText}>{t('pendingBidDetails.awaitingClient')}</Text>
                  </View>
                )}
                <View style={styles.submittedBadge}>
                  <Radio size={11} color={colors.cyan} strokeWidth={2.4} />
                  <Text style={styles.submittedBadgeText}>{submittedText}</Text>
                </View>
              </View>

              <View style={styles.heroTitleRow}>
                <View style={styles.heroIcon}>
                  <BriefcaseBusiness size={24} color={colors.cyan} strokeWidth={2.2} />
                </View>
                <View style={styles.heroTitleCopy}>
                  <Text style={styles.heroLabel}>{t('pendingBidDetails.proposalSent')}</Text>
                  <Text style={[styles.heroTitle, typography.threeD]} numberOfLines={1}>{title}</Text>
                  <Text style={styles.heroDescription} numberOfLines={3}>{description}</Text>
                </View>
              </View>

              <View style={styles.heroBottomRow}>
                <View>
                  <Text style={styles.heroValueLabel}>{t('pendingBidDetails.yourQuotedValue')}</Text>
                  <Text style={styles.heroValue}>{quoteText}</Text>
                </View>
                {isRejected ? (
                  <View style={[styles.heroStatusNote, { backgroundColor: alpha(colors.error || '#EF4444', 0.12), borderColor: alpha(colors.error || '#EF4444', 0.35) }]}>
                    <Pencil size={13} color={colors.error || '#EF4444'} strokeWidth={2.4} />
                    <Text style={[styles.heroStatusText, { color: colors.error || '#EF4444' }]}>NEW RATE REQUIRED</Text>
                  </View>
                ) : isHiredOther ? (
                  <View style={[styles.heroStatusNote, { backgroundColor: alpha(theme.colors.text.muted, 0.12), borderColor: alpha(theme.colors.border.default, 0.4) }]}>
                    <Hourglass size={13} color={theme.colors.text.muted} strokeWidth={2.4} />
                    <Text style={[styles.heroStatusText, { color: theme.colors.text.muted }]}>POSITION FILLED</Text>
                  </View>
                ) : isJobCancelled ? (
                  <View style={[styles.heroStatusNote, { backgroundColor: alpha(colors.error || '#EF4444', 0.12), borderColor: alpha(colors.error || '#EF4444', 0.35) }]}>
                    <X size={13} color={colors.error || '#EF4444'} strokeWidth={2.4} />
                    <Text style={[styles.heroStatusText, { color: colors.error || '#EF4444' }]}>CLOSED</Text>
                  </View>
                ) : isWon ? (
                  <View style={[styles.heroStatusNote, { backgroundColor: alpha(colors.green || '#10B981', 0.12), borderColor: alpha(colors.green || '#10B981', 0.35) }]}>
                    <CheckCircle2 size={13} color={colors.green || '#10B981'} strokeWidth={2.4} />
                    <Text style={[styles.heroStatusText, { color: colors.green || '#10B981' }]}>YOU WON THIS JOB</Text>
                  </View>
                ) : (
                  <View style={styles.heroStatusNote}>
                    <ShieldCheck size={14} color={colors.green} strokeWidth={2.5} />
                    <Text style={styles.heroStatusText}>{t('pendingBidDetails.offerActive')}</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Prominent Status Callout Banners */}
          {isRejected && (
            <Animated.View entering={FadeInDown.duration(360)} style={{ marginTop: 14 }}>
              <View style={[styles.statusNoticeCard, { borderColor: alpha(colors.error || '#EF4444', 0.45), backgroundColor: alpha(colors.error || '#EF4444', 0.08) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={[styles.statusNoticeIcon, { backgroundColor: alpha(colors.error || '#EF4444', 0.16) }]}>
                    <AlertTriangle size={22} color={colors.error || '#EF4444'} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusNoticeTitle, { color: colors.error || '#EF4444' }]}>
                      Offer Declined by Customer
                    </Text>
                    <Text style={[styles.statusNoticeBody, { color: theme.colors.text.secondary }]}>
                      The customer declined your previous quote of {quoteText}. This job is still open! Update your rate below with a competitive price to win this job.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.statusNoticeBtn, { backgroundColor: colors.worker }]}
                  onPress={handleOpenUpdateModal}
                  activeOpacity={0.84}
                >
                  <Pencil size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.statusNoticeBtnText}>Update Rate & Resubmit</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {isHiredOther && (
            <Animated.View entering={FadeInDown.duration(360)} style={{ marginTop: 14 }}>
              <View style={[styles.statusNoticeCard, { borderColor: alpha(colors.orange || '#F59E0B', 0.35), backgroundColor: alpha(colors.orange || '#F59E0B', 0.07) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={[styles.statusNoticeIcon, { backgroundColor: alpha(colors.orange || '#F59E0B', 0.16) }]}>
                    <BriefcaseBusiness size={22} color={colors.orange || '#F59E0B'} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusNoticeTitle, { color: theme.colors.text.primary }]}>
                      Customer Hired Another Ustad
                    </Text>
                    <Text style={[styles.statusNoticeBody, { color: theme.colors.text.secondary }]}>
                      The customer accepted another proposal for this service request. This offer has been closed. Keep an eye on the Live Radar for new nearby jobs!
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.statusNoticeBtn, { backgroundColor: colors.cyan }]}
                  onPress={() => router.replace('/(tabs)')}
                  activeOpacity={0.84}
                >
                  <Radio size={15} color="#001014" strokeWidth={2.4} />
                  <Text style={[styles.statusNoticeBtnText, { color: '#001014' }]}>View Open Jobs on Radar</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {isJobCancelled && (
            <Animated.View entering={FadeInDown.duration(360)} style={{ marginTop: 14 }}>
              <View style={[styles.statusNoticeCard, { borderColor: alpha(colors.error || '#EF4444', 0.35), backgroundColor: alpha(colors.error || '#EF4444', 0.07) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={[styles.statusNoticeIcon, { backgroundColor: alpha(colors.error || '#EF4444', 0.16) }]}>
                    <X size={22} color={colors.error || '#EF4444'} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusNoticeTitle, { color: colors.error || '#EF4444' }]}>
                      Job Request Cancelled
                    </Text>
                    <Text style={[styles.statusNoticeBody, { color: theme.colors.text.secondary }]}>
                      The customer cancelled this service request. Your offer has been automatically closed.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.statusNoticeBtn, { backgroundColor: colors.cyan }]}
                  onPress={() => router.replace('/(tabs)')}
                  activeOpacity={0.84}
                >
                  <Radio size={15} color="#001014" strokeWidth={2.4} />
                  <Text style={[styles.statusNoticeBtnText, { color: '#001014' }]}>Return to Live Radar</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {isWon && (
            <Animated.View entering={FadeInDown.duration(360)} style={{ marginTop: 14 }}>
              <View style={[styles.statusNoticeCard, { borderColor: alpha(colors.green || '#10B981', 0.4), backgroundColor: alpha(colors.green || '#10B981', 0.08) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={[styles.statusNoticeIcon, { backgroundColor: alpha(colors.green || '#10B981', 0.16) }]}>
                    <CheckCircle2 size={22} color={colors.green || '#10B981'} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusNoticeTitle, { color: colors.green || '#10B981' }]}>
                      You Were Hired! 🎉
                    </Text>
                    <Text style={[styles.statusNoticeBody, { color: theme.colors.text.secondary }]}>
                      The customer accepted your proposal. Tap below to navigate directly to your active booking details!
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.statusNoticeBtn, { backgroundColor: colors.green || '#10B981' }]}
                  onPress={() => {
                    const bId = (displayJob as any)?.bookingId || (displayJob as any)?.booking?._id;
                    if (bId) {
                      router.push({ pathname: '/transaction-details', params: { id: bId } });
                    } else {
                      router.replace('/(tabs)');
                    }
                  }}
                  activeOpacity={0.84}
                >
                  <Text style={[styles.statusNoticeBtnText, { color: '#001014' }]}>Open Active Booking</Text>
                  <ArrowRight size={15} color="#001014" strokeWidth={2.6} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(70).duration(460)} style={styles.section}>
            <SectionHeader
              icon={Clock3}
              title={t('pendingBidDetails.visitOverview')}
              subtitle={t('pendingBidDetails.visitOverviewDesc')}
            />
            <View style={styles.detailGrid}>
              <DetailPill icon={MissionIcon} label={t('pendingBidDetails.visitType')} value={missionKindLabel} color={isInstant ? colors.worker : colors.cyan} />
              <DetailPill icon={CalendarDays} label={t('pendingBidDetails.date')} value={dateLabel} />
              <DetailPill icon={Clock3} label={t('pendingBidDetails.time')} value={timeLabel} color={colors.worker} />
            </View>
             <GlassCard padding={14} intensity={35} style={styles.locationCard}>
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <MapPin size={17} color={colors.green} strokeWidth={2.5} />
                </View>
                <View style={styles.locationCopy}>
                  <Text style={styles.locationLabel}>{t('pendingBidDetails.serviceLocation')}</Text>
                  <Text style={styles.locationValue}>{locationLabel}</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(460)} style={styles.section}>
            <SectionHeader
              icon={UserRound}
              title={t('pendingBidDetails.client')}
              subtitle={t('pendingBidDetails.clientDesc')}
              color={colors.worker}
            />
            <TouchableOpacity onPress={openClientProfile} disabled={!clientId} activeOpacity={0.84}>
              <GlassCard
                padding={14}
                intensity={38}
                hasGlow
                glowColor={colors.worker}
                gradient={['rgba(255,140,0,0.15)', 'rgba(0,245,255,0.06)']}
              >
                <View style={styles.clientRow}>
                  <View style={styles.avatarShell}>
                    {clientImage ? (
                      <Image source={{ uri: clientImage }} style={styles.avatarImage} />
                    ) : (
                      <LinearGradient colors={['rgba(255,140,0,0.28)', 'rgba(0,245,255,0.18)']} style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>{initialsFor(clientName)}</Text>
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.clientCopy}>
                    <Text style={styles.clientRole}>{t('pendingBidDetails.serviceClient')}</Text>
                    <Text style={[styles.clientName, typography.threeD]} numberOfLines={1}>{clientName}</Text>
                    <Text style={styles.clientHistory}>
                      {clientJobs > 0 
                        ? (clientJobs === 1 ? t('pendingBidDetails.completedServiceRequests_one') : t('pendingBidDetails.completedServiceRequests_other', { count: clientJobs }))
                        : t('pendingBidDetails.newApnaUstadClient')}
                    </Text>
                  </View>
                  {clientId ? (
                    <View style={styles.profileCue}>
                      <Eye size={14} color={colors.cyan} strokeWidth={2.4} />
                      <ChevronRight size={15} color={colors.cyan} strokeWidth={2.6} />
                    </View>
                  ) : null}
                </View>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>

          {media.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(210).duration(460)} style={styles.section}>
              <SectionHeader
                icon={ImageIcon}
                title={t('pendingBidDetails.workEvidence')}
                subtitle={media.length === 1 ? t('pendingBidDetails.attachmentsCount_one') : t('pendingBidDetails.attachmentsCount_other', { count: media.length })}
                color={colors.purple}
              />
              <JobEvidenceGallery items={media} />
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(280).duration(460)} style={styles.section}>
            <SectionHeader
              icon={FileText}
              title={t('pendingBidDetails.yourProposal')}
              subtitle={t('pendingBidDetails.yourProposalDesc')}
              color={colors.green}
            />
            {bid?.status === 'rejected' && (
              <View style={{
                backgroundColor: alpha(colors.error || '#EF4444', 0.12),
                borderColor: alpha(colors.error || '#EF4444', 0.35),
                borderWidth: 1.2,
                borderRadius: 14,
                padding: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}>
                <AlertTriangle size={20} color={colors.error || '#EF4444'} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.error || '#EF4444' }}>
                    Rate Declined by Customer
                  </Text>
                  <Text style={{ fontSize: 11.5, color: theme.colors.text.secondary, marginTop: 1 }}>
                    Customer declined your quote. Tap "Edit" below to update your rate and re-submit!
                  </Text>
                </View>
              </View>
            )}
            <GlassCard padding={0} intensity={38} style={styles.proposalCard}>
              <View style={styles.proposalStats}>
                <View style={styles.proposalStat}>
                  <View style={[styles.proposalIcon, { backgroundColor: alpha(colors.green, 0.10) }]}>
                    <Banknote size={18} color={colors.green} strokeWidth={2.4} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={styles.proposalLabel}>{t('pendingBidDetails.yourQuote')}</Text>
                    <TouchableOpacity
                      onPress={handleOpenUpdateModal}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: BorderRadius.full,
                        backgroundColor: alpha(colors.worker, 0.14),
                        borderWidth: 1,
                        borderColor: alpha(colors.worker, 0.3),
                      }}
                    >
                      <Pencil size={10} color={colors.worker} strokeWidth={2.4} />
                      <Text style={{ fontSize: 9, fontWeight: '800', color: colors.worker }}>
                        {t('common.edit', 'Edit')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.proposalValue, { color: colors.green }]}>{quoteText}</Text>
                </View>
                <View style={styles.proposalDivider} />
                <View style={styles.proposalStat}>
                  <View style={[styles.proposalIcon, { backgroundColor: alpha(colors.worker, 0.10) }]}>
                    <Clock3 size={18} color={colors.worker} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.proposalLabel}>{t('pendingBidDetails.estimatedTime')}</Text>
                  <Text style={[styles.proposalValue, { color: colors.worker }]}>{estimatedTime}</Text>
                </View>
              </View>

              <View style={styles.messageArea}>
                <Text style={styles.messageLabel}>{t('pendingBidDetails.messageToClient')}</Text>
                <Text style={styles.messageText}>{bid?.message || t('pendingBidDetails.noMessage')}</Text>
              </View>
            </GlassCard>
          </Animated.View>
        </ScrollView>

        {bid ? (
          <View style={[styles.bottomDock, { paddingBottom: insets.bottom + 12 }]}>
            <LinearGradient
              colors={['rgba(5,5,16,0)', 'rgba(5,5,16,0.96)', 'rgba(5,5,16,1)']}
              style={StyleSheet.absoluteFill}
            />
            {isWon ? (
              <View style={styles.dockActionsRow}>
                <TouchableOpacity
                  style={[styles.updateOfferBtn, { flex: 1 }]}
                  onPress={() => {
                    const bId = (displayJob as any)?.bookingId || (displayJob as any)?.booking?._id;
                    if (bId) {
                      router.push({ pathname: '/transaction-details', params: { id: bId } });
                    } else {
                      router.replace('/(tabs)');
                    }
                  }}
                  activeOpacity={0.84}
                >
                  <LinearGradient
                    colors={[colors.green || '#10B981', alpha(colors.green || '#10B981', 0.85)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.updateOfferGradient}
                  >
                    <CheckCircle2 size={17} color="#001014" strokeWidth={2.4} />
                    <Text style={[styles.updateOfferText, { color: '#001014', fontWeight: '900' }]}>
                      View Active Booking
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : isHiredOther || isJobCancelled ? (
              <View style={styles.dockActionsRow}>
                <TouchableOpacity
                  style={[styles.updateOfferBtn, { flex: 1 }]}
                  onPress={() => router.replace('/(tabs)')}
                  activeOpacity={0.84}
                >
                  <LinearGradient
                    colors={[colors.cyan, alpha(colors.cyan, 0.82)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.updateOfferGradient}
                  >
                    <Radio size={16} color="#001014" strokeWidth={2.4} />
                    <Text style={[styles.updateOfferText, { color: '#001014', fontWeight: '900' }]}>
                      {isJobCancelled ? 'Return to Home' : 'Return to Live Radar'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : isRejected ? (
              <View style={styles.dockActionsRow}>
                <TouchableOpacity
                  style={[styles.updateOfferBtn, { flex: 1 }]}
                  onPress={handleOpenUpdateModal}
                  activeOpacity={0.84}
                >
                  <LinearGradient
                    colors={[colors.worker, alpha(colors.worker, 0.82)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.updateOfferGradient}
                  >
                    <Pencil size={17} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={[styles.updateOfferText, { fontWeight: '900' }]}>
                      Update Rate & Resubmit Offer
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.dockActionsRow}>
                {/* Primary Action: Update Offer */}
                <TouchableOpacity
                  style={styles.updateOfferBtn}
                  onPress={handleOpenUpdateModal}
                  disabled={isWithdrawing}
                  activeOpacity={0.84}
                >
                  <LinearGradient
                    colors={[colors.worker, alpha(colors.worker, 0.82)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.updateOfferGradient}
                  >
                    <Pencil size={16} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.updateOfferText}>
                      {t('pendingBidDetails.updateRateBtn', 'Update Rate')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Secondary Action: Withdraw */}
                <TouchableOpacity
                  style={[styles.withdrawButton, isWithdrawing && styles.buttonDisabled]}
                  onPress={handleWithdraw}
                  disabled={isWithdrawing}
                  activeOpacity={0.82}
                >
                  {isWithdrawing ? (
                    <ActivityIndicator color={colors.error} size="small" />
                  ) : (
                    <>
                      <Trash2 size={15} color={colors.error} strokeWidth={2.4} />
                      <Text style={styles.withdrawTitle}>{t('pendingBidDetails.withdraw', 'Withdraw')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {/* Update Rate Modal */}
      <Modal
        visible={showUpdatePriceModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isUpdatingPrice && setShowUpdatePriceModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <View style={[styles.modalCard, { backgroundColor: theme.colors.surface.card, borderColor: alpha(colors.worker, 0.3) }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.modalHeaderIcon, { backgroundColor: alpha(colors.worker, 0.12) }]}>
                    <CircleDollarSign size={20} color={colors.worker} strokeWidth={2.4} />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                      {t('pendingBidDetails.updateRateTitle', 'Update Your Rate')}
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: theme.colors.text.muted }]}>
                      {t('pendingBidDetails.updateRateSubtitle', 'Customer will get an instant notification')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowUpdatePriceModal(false)}
                  disabled={isUpdatingPrice}
                  style={styles.modalCloseBtn}
                >
                  <X size={18} color={theme.colors.text.muted} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              {/* Current Quoted vs Client Offer */}
              <View style={[styles.modalCompareRow, { backgroundColor: alpha(theme.colors.text.primary, 0.04) }]}>
                <View style={styles.modalCompareCol}>
                  <Text style={[styles.modalCompareLabel, { color: theme.colors.text.muted }]}>
                    {t('pendingBidDetails.currentRate', 'Current Rate')}
                  </Text>
                  <Text style={[styles.modalCompareVal, { color: colors.worker }]}>
                    {formatMoney(currentProposedPrice)}
                  </Text>
                </View>
                <View style={styles.modalCompareDivider} />
                <View style={styles.modalCompareCol}>
                  <Text style={[styles.modalCompareLabel, { color: theme.colors.text.muted }]}>
                    {t('pendingBidDetails.clientBudget', 'Client Budget')}
                  </Text>
                  <Text style={[styles.modalCompareVal, { color: theme.colors.text.primary }]}>
                    {formatMoney(displayJob?.amount || (displayJob as any)?.pricing?.clientOffer || 0)}
                  </Text>
                </View>
              </View>

              {/* Quick Increment Chips */}
              <View style={styles.modalChipsRow}>
                {[200, 500, 1000].map((inc) => {
                  const targetPrice = currentProposedPrice + inc;
                  const isSelected = Number(updatedPrice) === targetPrice;
                  return (
                    <TouchableOpacity
                      key={inc}
                      style={[
                        styles.modalChip,
                        {
                          backgroundColor: isSelected ? colors.worker : alpha(colors.worker, 0.10),
                          borderColor: isSelected ? colors.worker : alpha(colors.worker, 0.28),
                        },
                      ]}
                      onPress={() => setUpdatedPrice(String(targetPrice))}
                    >
                      <Text style={[styles.modalChipText, { color: isSelected ? '#fff' : colors.worker }]}>
                        +{inc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Numeric Input */}
              <View style={[styles.modalInputWrap, { borderColor: alpha(colors.worker, 0.4) }]}>
                <Text style={[styles.modalInputPrefix, { color: colors.worker }]}>PKR</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.colors.text.primary }]}
                  value={updatedPrice}
                  onChangeText={(val) => setUpdatedPrice(val.replace(/[^\d]/g, ''))}
                  keyboardType="number-pad"
                  placeholder={String(currentProposedPrice)}
                  placeholderTextColor={alpha(theme.colors.text.primary, 0.35)}
                  autoFocus
                />
              </View>

              {/* Financial breakdown */}
              {Number(updatedPrice) > 0 && (
                <View style={styles.modalFeeBreakdown}>
                  <View style={styles.modalFeeRow}>
                    <Text style={[styles.modalFeeLabel, { color: theme.colors.text.muted }]}>
                      {t('pendingBidDetails.platformFee', 'App Platform Fee (10%):')}
                    </Text>
                    <Text style={[styles.modalFeeVal, { color: theme.colors.text.muted }]}>
                      - Rs. {Math.round(Number(updatedPrice) * 0.1).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.modalFeeRow}>
                    <Text style={[styles.modalNetLabel, { color: colors.success }]}>
                      {t('pendingBidDetails.youKeep', 'You Receive:')}
                    </Text>
                    <Text style={[styles.modalNetVal, { color: colors.success }]}>
                      Rs. {Math.round(Number(updatedPrice) * 0.9).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Modal Actions */}
              <View style={styles.modalFooterBtns}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: alpha(theme.colors.text.primary, 0.15) }]}
                  onPress={() => setShowUpdatePriceModal(false)}
                  disabled={isUpdatingPrice}
                >
                  <Text style={[styles.modalCancelText, { color: theme.colors.text.muted }]}>
                    {t('common.cancel', 'Cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, isUpdatingPrice && { opacity: 0.7 }]}
                  onPress={handleUpdatePriceSubmit}
                  disabled={isUpdatingPrice}
                >
                  <LinearGradient
                    colors={[colors.worker, alpha(colors.worker, 0.85)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalSubmitGradient}
                  >
                    {isUpdatingPrice ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Send size={15} color="#fff" strokeWidth={2.5} />
                        <Text style={styles.modalSubmitText}>
                          {t('pendingBidDetails.sendUpdatedRate', 'Send Updated Rate')}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmModal.visible}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmColor={confirmModal.confirmColor}
        isLoading={isWithdrawing}
      />
    </BackgroundWrapper>
  );
}

