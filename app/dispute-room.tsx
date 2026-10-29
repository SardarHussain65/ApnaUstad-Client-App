import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Send,
  Camera,
  ImagePlus,
  ShieldCheck,
  Scale,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  CornerDownRight,
  Reply,
  AlertTriangle,
  Info,
  Banknote,
  User,
  Wrench,
  Sparkles,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, FadeInRight, FadeInLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { BeautifulModal } from '../components/ui/BeautifulModal';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors } from '../constants/Theme';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socketService';
import {
  useDisputeDetail,
  useDisputeMessages,
  useSendDisputeMessage,
  useWithdrawDispute,
  uploadDisputeEvidence,
  markDisputeReadRequest,
  type DisputeMessage,
  type DisputeRecord,
} from '../hooks/queries/useDisputes';
import { queryKeys } from '../lib/queryKeyFactory';

const formatPKR = (amount: number) => `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;

export default function DisputeRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const { id } = useLocalSearchParams<{ id: string }>();
  const disputeId = String(id || '');

  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<DisputeMessage | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [showKeyDetails, setShowKeyDetails] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawNote, setWithdrawNote] = useState('');
  const [localMessages, setLocalMessages] = useState<DisputeMessage[]>([]);

  const flatListRef = useRef<FlatList<any>>(null);

  // Queries
  const { data: dispute, isLoading: isLoadingDispute, refetch: refetchDispute } = useDisputeDetail(disputeId);
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDisputeMessages(disputeId);

  const { mutate: sendMessage, isPending: isSending } = useSendDisputeMessage(disputeId);
  const { mutate: withdraw, isPending: isWithdrawing } = useWithdrawDispute(disputeId);

  // Combine paginated server messages with local optimistic messages
  const serverMessages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages || []);
  }, [messagesData]);

  const allMessages = useMemo(() => {
    const combined = [...localMessages, ...serverMessages];
    const unique = new Map<string, DisputeMessage>();
    combined.forEach((m) => {
      if (!unique.has(m._id)) unique.set(m._id, m);
    });
    return Array.from(unique.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [localMessages, serverMessages]);

  // Filter out duplicate complaint description in the chat stream
  // (The official statement and proof photos are displayed in the Case Summary card above)
  const filteredMessages = useMemo(() => {
    return allMessages.filter((msg) => {
      if (
        msg.kind === 'message' &&
        dispute &&
        msg.senderType === dispute.raisedByType &&
        dispute.description &&
        msg.content?.trim() === dispute.description?.trim()
      ) {
        return false;
      }
      return true;
    });
  }, [allMessages, dispute]);

  // Mark as read on mount
  useEffect(() => {
    if (disputeId) {
      markDisputeReadRequest(disputeId);
    }
  }, [disputeId]);

  // Socket listener for real-time messages & dispute status changes
  useEffect(() => {
    if (!disputeId) return;

    const unsubMsg = socketService.on('dispute:message', (newMsg: DisputeMessage) => {
      if (newMsg.dispute === disputeId || newMsg.disputeId === disputeId) {
        setLocalMessages((prev) => [newMsg, ...prev.filter((m) => m._id !== newMsg._id)]);
        markDisputeReadRequest(disputeId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });

    const unsubUpdate = socketService.on('dispute:updated', (payload: any) => {
      if (payload.disputeId === disputeId) {
        refetchDispute();
        queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all });
      }
    });

    return () => {
      unsubMsg?.();
      unsubUpdate?.();
    };
  }, [disputeId, refetchDispute, queryClient]);

  // Handle Photo Picker
  const handlePickPhotos = async () => {
    if (selectedPhotos.length >= 3) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 3 - selectedPhotos.length,
        quality: 0.8,
      });

      if (res.canceled || !res.assets?.length) return;

      setIsUploadingPhotos(true);
      const uploaded = await uploadDisputeEvidence(res.assets);
      setSelectedPhotos((prev) => [...prev, ...uploaded].slice(0, 3));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert(t('common.error', 'Error'), t('disputes.uploadFailed', 'Could not upload photos.'));
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleSendMessage = () => {
    const text = inputText.trim();
    if ((!text && !selectedPhotos.length) || isSending || isUploadingPhotos) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: DisputeMessage = {
      _id: tempId,
      dispute: disputeId,
      senderType: dispute?.myRole || (role === 'worker' ? 'worker' : 'customer'),
      sender: user?._id || null,
      senderName: (user as any)?.fullName || (role === 'worker' ? 'Ustad' : 'Customer'),
      content: text,
      attachments: [...selectedPhotos],
      kind: 'message',
      replyTo: replyTarget?._id || null,
      replySnapshot: replyTarget
        ? {
            content: replyTarget.content || 'Photo evidence',
            senderType: replyTarget.senderType,
            senderName: replyTarget.senderName || '',
          }
        : null,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setLocalMessages((prev) => [optimistic, ...prev]);
    setInputText('');
    const sentAttachments = [...selectedPhotos];
    setSelectedPhotos([]);
    const sentReplyTo = replyTarget?._id || null;
    setReplyTarget(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    sendMessage(
      {
        content: text,
        attachments: sentAttachments,
        replyTo: sentReplyTo,
      },
      {
        onSuccess: (data) => {
          setLocalMessages((prev) => prev.map((m) => (m._id === tempId ? data : m)));
        },
        onError: () => {
          setLocalMessages((prev) => prev.filter((m) => m._id !== tempId));
          Alert.alert(t('common.error', 'Error'), t('chat.couldNotSend', 'Could not send message.'));
        },
      }
    );
  };

  const handleConfirmWithdraw = () => {
    withdraw(withdrawNote.trim(), {
      onSuccess: () => {
        setShowWithdrawModal(false);
        setWithdrawNote('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (err: any) => {
        Alert.alert(
          t('common.error', 'Error'),
          err?.response?.data?.message || t('disputes.withdrawFailed', 'Failed to withdraw dispute.')
        );
      },
    });
  };

  const isClosed = dispute?.isClosed || false;
  const shortId = disputeId.slice(-6).toUpperCase();
  const caseRef = `Case #${shortId}`;

  // Status visual attributes
  const statusColor = isClosed
    ? '#8E8E93'
    : dispute?.status === 'under_review'
    ? '#FF9F0A'
    : '#00C6FF';

  const statusLabel = isClosed
    ? dispute?.outcomeLabel || t('disputes.badgeClosed', 'Closed')
    : dispute?.status === 'under_review'
    ? t('disputes.badgeUnderReview', 'Under Investigation')
    : t('disputes.badgeOpen', 'Report Received');

  const booking = typeof dispute?.booking === 'object' ? dispute.booking : null;

  // Render Case Summary Card (part of the scrollable chat feed)
  const renderCaseSummaryCard = () => {
    if (!dispute) return null;

    return (
      <View style={styles.summaryCardWrapper}>
        <GlassCard style={styles.summaryCard}>
          <TouchableOpacity
            onPress={() => setShowKeyDetails(!showKeyDetails)}
            style={styles.summaryHeaderRow}
            activeOpacity={0.8}
          >
            <View style={styles.summaryHeaderLeft}>
              <Info size={15} color={theme.colors.brand.primary} />
              <Text
                style={[styles.summaryTitle, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {t('disputes.caseDetails', 'Case Details')}
              </Text>
            </View>

            <View style={styles.summaryHeaderRight}>
              {dispute.amountDisputed > 0 && (
                <View
                  style={[
                    styles.amountPillWrapper,
                    {
                      backgroundColor: alpha(theme.colors.brand.primary, 0.12),
                      borderColor: alpha(theme.colors.brand.primary, 0.28),
                    },
                  ]}
                >
                  <Banknote size={11} color={theme.colors.brand.primary} />
                  <Text style={[styles.amountPill, { color: theme.colors.brand.primary }]}>
                    {formatPKR(dispute.amountDisputed)}
                  </Text>
                </View>
              )}
              {showKeyDetails ? (
                <ChevronUp size={16} color={theme.colors.text.dim} />
              ) : (
                <ChevronDown size={16} color={theme.colors.text.dim} />
              )}
            </View>
          </TouchableOpacity>

          {showKeyDetails && (
            <View style={styles.summaryBody}>
              {/* Issue Reason */}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.text.dim }]}>
                  {t('disputes.issue', 'Issue')}:
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                  {dispute.reasonLabel || dispute.reason.replace(/_/g, ' ')}
                </Text>
              </View>

              {/* Disputed by */}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.text.dim }]}>
                  {t('disputes.reportedBy', 'Reported By')}:
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                  {dispute.raisedByType === 'customer'
                    ? t('disputes.customer', 'Customer')
                    : t('disputes.ustad', 'Ustad (Worker)')}
                </Text>
              </View>

              {/* Official Report Statement */}
              {dispute.description ? (
                <View
                  style={[
                    styles.statementBox,
                    {
                      backgroundColor: alpha(theme.colors.surface.card, 0.5),
                      borderColor: theme.colors.border.subtle,
                    },
                  ]}
                >
                  <Text style={[styles.statementLabel, { color: theme.colors.text.dim }]}>
                    {t('disputes.statementLabel', 'Report Statement')}:
                  </Text>
                  <Text style={[styles.statementText, { color: theme.colors.text.primary }]}>
                    "{dispute.description}"
                  </Text>
                </View>
              ) : null}

              {/* Cash Pause Notice */}
              <View
                style={[
                  styles.pauseNoticeBox,
                  {
                    backgroundColor: alpha(theme.colors.status.warning, 0.08),
                    borderColor: alpha(theme.colors.status.warning, 0.25),
                  },
                ]}
              >
                <AlertTriangle size={13} color={theme.colors.status.warning} />
                <Text style={[styles.pauseNoticeText, { color: theme.colors.text.secondary }]}>
                  {isClosed
                    ? t('disputes.settledNotice', 'Case completed. Cash or wallet balances have been adjusted.')
                    : t('disputes.cashPausedNotice', 'Cash settlement is frozen until ApnaUstad completes arbitration.')}
                </Text>
              </View>

              {/* Attached Proof Thumbnails */}
              {dispute.proofImages && dispute.proofImages.length > 0 && (
                <View style={styles.initialEvidenceRow}>
                  <Text style={[styles.evidenceLabel, { color: theme.colors.text.dim }]}>
                    {t('disputes.initialProof', 'Proof attached with report')}:
                  </Text>
                  <View style={styles.evidenceThumbs}>
                    {dispute.proofImages.map((uri, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setPreviewImage(uri)}
                        style={styles.evidenceThumbCard}
                      >
                        <Image source={{ uri }} style={styles.evidenceThumbImg} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Reporter Settle / Withdraw Action */}
              {dispute.canWithdraw && (
                <TouchableOpacity
                  onPress={() => setShowWithdrawModal(true)}
                  style={[
                    styles.withdrawBtn,
                    {
                      backgroundColor: alpha(colors.success, 0.1),
                      borderColor: alpha(colors.success, 0.3),
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Sparkles size={14} color={colors.success} />
                  <Text style={[styles.withdrawBtnText, { color: colors.success }]}>
                    {t('disputes.settleQuestion', 'Problem sorted out? Withdraw complaint')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </GlassCard>
      </View>
    );
  };

  // Render chat item
  const renderMessageItem = ({ item }: { item: DisputeMessage }) => {
    // 1. System / Event messages (e.g. dispute raised, admin joined, dispute resolved)
    if (item.kind === 'system' || item.kind === 'decision') {
      const isDecision = item.kind === 'decision';
      return (
        <View style={styles.systemMessageContainer}>
          <View
            style={[
              styles.systemMessageCard,
              {
                backgroundColor: isDecision
                  ? alpha(colors.success, 0.12)
                  : alpha(theme.colors.surface.card, 0.7),
                borderColor: isDecision ? alpha(colors.success, 0.4) : theme.colors.border.subtle,
              },
            ]}
          >
            <View style={styles.systemIconRow}>
              {isDecision ? (
                <ShieldCheck size={16} color={colors.success} />
              ) : (
                <Scale size={14} color={theme.colors.brand.primary} />
              )}
              <Text
                style={[
                  styles.systemMessageTitle,
                  { color: isDecision ? colors.success : theme.colors.text.secondary },
                ]}
              >
                {isDecision
                  ? t('disputes.officialVerdict', 'Official Resolution Verdict')
                  : t('disputes.systemUpdate', 'ApnaUstad Update')}
              </Text>
            </View>
            <Text style={[styles.systemMessageText, { color: theme.colors.text.primary }]}>
              {item.content}
            </Text>
            <Text style={[styles.systemMessageTime, { color: theme.colors.text.dim }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    // 2. Chat messages
    const isMe =
      item.sender === user?._id ||
      (dispute?.myRole && item.senderType === dispute.myRole);
    const isAdmin = item.senderType === 'admin';
    const isWorker = item.senderType === 'worker';

    // Role tags
    const senderTag = isAdmin
      ? t('disputes.adminRole', 'ApnaUstad Team')
      : isWorker
      ? t('disputes.ustadRole', 'Ustad (Partner)')
      : t('disputes.customerRole', 'Customer');

    const bubbleColor = isMe
      ? theme.colors.brand.primary
      : isAdmin
      ? alpha('#FFB800', 0.18)
      : alpha(theme.colors.surface.card, 0.9);

    const borderColor = isMe
      ? 'transparent'
      : isAdmin
      ? alpha('#FFB800', 0.45)
      : theme.colors.border.subtle;

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
        <View style={{ maxWidth: '82%' }}>
          {/* Sender Header */}
          {!isMe && (
            <View style={styles.senderHeader}>
              {isAdmin ? (
                <ShieldCheck size={13} color="#FFB800" />
              ) : isWorker ? (
                <Wrench size={12} color={theme.colors.text.muted} />
              ) : (
                <User size={12} color={theme.colors.text.muted} />
              )}
              <Text
                style={[
                  styles.senderNameText,
                  { color: isAdmin ? '#FFB800' : theme.colors.text.secondary },
                ]}
              >
                {item.senderName || senderTag}
              </Text>
            </View>
          )}

          {/* Chat Bubble */}
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: bubbleColor,
                borderColor: borderColor,
              },
            ]}
          >
            {/* Quoted Reply Preview */}
            {item.replySnapshot ? (
              <View
                style={[
                  styles.replyQuoteBox,
                  {
                    backgroundColor: isMe ? 'rgba(0,0,0,0.18)' : alpha(theme.colors.surface.subtle, 0.7),
                    borderLeftColor: isMe ? '#FFFFFF' : theme.colors.brand.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.replyQuoteSender,
                    { color: isMe ? '#FFFFFF' : theme.colors.brand.primary },
                  ]}
                  numberOfLines={1}
                >
                  {item.replySnapshot.senderName || item.replySnapshot.senderType}
                </Text>
                <Text
                  style={[
                    styles.replyQuoteContent,
                    { color: isMe ? 'rgba(255,255,255,0.85)' : theme.colors.text.muted },
                  ]}
                  numberOfLines={2}
                >
                  {item.replySnapshot.content}
                </Text>
              </View>
            ) : null}

            {/* Message Body */}
            {item.content ? (
              <Text
                style={[
                  styles.messageText,
                  { color: isMe ? '#FFFFFF' : theme.colors.text.primary },
                ]}
              >
                {item.content}
              </Text>
            ) : null}

            {/* Photo Attachments */}
            {item.attachments && item.attachments.length > 0 ? (
              <View style={styles.attachmentsGrid}>
                {item.attachments.map((imgUrl, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setPreviewImage(imgUrl)}
                    activeOpacity={0.85}
                    style={styles.attachmentThumbWrapper}
                  >
                    <Image source={{ uri: imgUrl }} style={styles.attachmentThumb} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Footer: Time + Reply Button */}
            <View style={styles.bubbleFooter}>
              <Text
                style={[
                  styles.timeText,
                  { color: isMe ? 'rgba(255,255,255,0.7)' : theme.colors.text.dim },
                ]}
              >
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              {!isClosed && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setReplyTarget(item);
                  }}
                  style={styles.replyActionBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Reply size={13} color={isMe ? '#FFFFFF' : theme.colors.text.muted} />
                  <Text
                    style={[
                      styles.replyActionText,
                      { color: isMe ? '#FFFFFF' : theme.colors.text.muted },
                    ]}
                  >
                    {t('chat.reply', 'Reply')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header Bar */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border.subtle }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.headerBtn,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          >
            <ChevronLeft color={theme.colors.text.primary} size={22} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <Scale size={16} color={theme.colors.brand.primary} />
              <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {caseRef}
              </Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.muted }]} numberOfLines={1}>
              {booking?.category || t('disputes.caseRoom', 'Dispute Resolution Room')}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: alpha(statusColor, 0.15),
                borderColor: alpha(statusColor, 0.4),
              },
            ]}
          >
            <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* 3-Step Visual Progress Tracker */}
        <View style={[styles.stepperContainer, { borderBottomColor: theme.colors.border.subtle }]}>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                { backgroundColor: theme.colors.brand.primary },
              ]}
            >
              <CheckCircle2 size={13} color="#FFFFFF" />
            </View>
            <Text style={[styles.stepLabel, { color: theme.colors.text.primary, fontWeight: '700' }]}>
              {t('disputes.step1Short', 'Reported')}
            </Text>
          </View>

          <View
            style={[
              styles.stepConnector,
              {
                backgroundColor:
                  dispute?.status === 'under_review' || isClosed
                    ? theme.colors.brand.primary
                    : theme.colors.border.subtle,
              },
            ]}
          />

          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor:
                    dispute?.status === 'under_review'
                      ? '#FF9F0A'
                      : isClosed
                      ? theme.colors.brand.primary
                      : alpha(theme.colors.text.dim, 0.25),
                },
              ]}
            >
              {isClosed ? (
                <CheckCircle2 size={13} color="#FFFFFF" />
              ) : (
                <Clock size={13} color="#FFFFFF" />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                {
                  color:
                    dispute?.status === 'under_review' || isClosed
                      ? theme.colors.text.primary
                      : theme.colors.text.dim,
                  fontWeight: dispute?.status === 'under_review' ? '700' : '500',
                },
              ]}
            >
              {t('disputes.step2Short', 'Team Checking')}
            </Text>
          </View>

          <View
            style={[
              styles.stepConnector,
              {
                backgroundColor: isClosed ? theme.colors.brand.primary : theme.colors.border.subtle,
              },
            ]}
          />

          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: isClosed
                    ? '#34C759'
                    : alpha(theme.colors.text.dim, 0.25),
                },
              ]}
            >
              <CheckCircle2 size={13} color="#FFFFFF" />
            </View>
            <Text
              style={[
                styles.stepLabel,
                {
                  color: isClosed ? theme.colors.text.primary : theme.colors.text.dim,
                  fontWeight: isClosed ? '700' : '500',
                },
              ]}
            >
              {t('disputes.step3Short', 'Closed')}
            </Text>
          </View>
        </View>

        {/* Chat Area with unified scroll (Case Summary card + Messages) */}
        <View style={styles.chatArea}>
          {isLoadingMessages && filteredMessages.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.colors.brand.primary} />
            </View>
          ) : (
            <FlatList
              {...({
                ref: flatListRef,
                data: filteredMessages,
                renderItem: renderMessageItem,
                keyExtractor: (item: DisputeMessage) => item._id,
                inverted: true,
                contentContainerStyle: styles.messagesList,
                showsVerticalScrollIndicator: false,
                onEndReached: () => {
                  if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                },
                onEndReachedThreshold: 0.3,
                ListFooterComponent: (
                  <View style={styles.listTopContainer}>
                    {renderCaseSummaryCard()}
                    {isFetchingNextPage && (
                      <View style={styles.paginationSpinner}>
                        <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                      </View>
                    )}
                  </View>
                ),
              } as any)}
            />
          )}
        </View>

        {/* Input Composer / Closed State Notice */}
        {isClosed ? (
          <View
            style={[
              styles.closedNoticeBar,
              {
                backgroundColor: theme.colors.surface.card,
                borderTopColor: theme.colors.border.subtle,
                paddingBottom: insets.bottom + 12,
              },
            ]}
          >
            <ShieldCheck size={18} color="#34C759" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.closedTitle, { color: theme.colors.text.primary }]}>
                {t('disputes.caseResolvedClosed', 'Dispute Closed & Saved in History')}
              </Text>
              <Text style={[styles.closedSubtitle, { color: theme.colors.text.muted }]}>
                {dispute?.resolutionDetails ||
                  t('disputes.historySavedHint', 'A final decision was recorded. This chat is preserved for your records.')}
              </Text>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Quoted Reply Banner */}
            {replyTarget && (
              <View
                style={[
                  styles.replyBanner,
                  {
                    backgroundColor: alpha(theme.colors.surface.card, 0.95),
                    borderTopColor: theme.colors.border.subtle,
                  },
                ]}
              >
                <CornerDownRight size={14} color={theme.colors.brand.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.replyBannerTitle, { color: theme.colors.brand.primary }]}>
                    Replying to {replyTarget.senderName || replyTarget.senderType}:
                  </Text>
                  <Text
                    style={[styles.replyBannerContent, { color: theme.colors.text.secondary }]}
                    numberOfLines={1}
                  >
                    {replyTarget.content || 'Photo attachment'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyTarget(null)}>
                  <X size={16} color={theme.colors.text.dim} />
                </TouchableOpacity>
              </View>
            )}

            {/* Selected Photos Preview before sending */}
            {selectedPhotos.length > 0 && (
              <View
                style={[
                  styles.photoPreviewRow,
                  { backgroundColor: alpha(theme.colors.surface.card, 0.9) },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedPhotos.map((uri, idx) => (
                    <View key={idx} style={styles.photoPreviewCard}>
                      <Image source={{ uri }} style={styles.photoPreviewImg} />
                      <TouchableOpacity
                        onPress={() => setSelectedPhotos((p) => p.filter((_, i) => i !== idx))}
                        style={styles.photoRemoveBtn}
                      >
                        <X size={11} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Composer Input Bar */}
            <View
              style={[
                styles.composerContainer,
                {
                  backgroundColor: theme.colors.background.screen,
                  borderTopColor: theme.colors.border.subtle,
                  paddingBottom: insets.bottom + 8,
                },
              ]}
            >
              {/* Photo Upload Button */}
              <TouchableOpacity
                onPress={handlePickPhotos}
                disabled={isUploadingPhotos || selectedPhotos.length >= 3}
                style={[
                  styles.attachBtn,
                  {
                    backgroundColor: alpha(theme.colors.surface.card, 0.9),
                    borderColor: theme.colors.border.subtle,
                  },
                ]}
                activeOpacity={0.7}
              >
                {isUploadingPhotos ? (
                  <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                ) : (
                  <ImagePlus size={19} color={theme.colors.brand.primary} />
                )}
              </TouchableOpacity>

              {/* Text Input */}
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: alpha(theme.colors.surface.card, 0.9),
                    borderColor: theme.colors.border.subtle,
                  },
                ]}
              >
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={t('disputes.chatPlaceholder', 'Reply or add facts here...')}
                  placeholderTextColor={theme.colors.text.dim}
                  style={[styles.textInput, { color: theme.colors.text.primary }]}
                  multiline
                  maxLength={1000}
                />
              </View>

              {/* Send Button */}
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={(!inputText.trim() && !selectedPhotos.length) || isSending}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor:
                      inputText.trim() || selectedPhotos.length
                        ? theme.colors.brand.primary
                        : alpha(theme.colors.text.dim, 0.3),
                  },
                ]}
                activeOpacity={0.8}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Full Image Preview Modal */}
        {previewImage && (
          <Modal visible={!!previewImage} transparent animationType="fade">
            <View style={styles.imageModalBackground}>
              <TouchableOpacity
                onPress={() => setPreviewImage(null)}
                style={styles.imageModalCloseBtn}
              >
                <XCircle size={32} color="#FFFFFF" />
              </TouchableOpacity>
              <Image
                source={{ uri: previewImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
        )}

        {/* Reporter Withdraw Modal */}
        <BeautifulModal
          visible={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          title={t('disputes.withdrawTitle', 'Withdraw Complaint')}
          icon={<CheckCircle2 size={22} color={colors.success} />}
        >
          <View style={styles.withdrawModalContent}>
            <Text style={[styles.withdrawModalDesc, { color: theme.colors.text.secondary }]}>
              {t(
                'disputes.withdrawConfirmBody',
                'If you and the other party reached an agreement or solved the issue directly, you can withdraw this complaint. Normal payment can then proceed.'
              )}
            </Text>

            <Text style={[styles.withdrawNoteLabel, { color: theme.colors.text.dim }]}>
              {t('disputes.withdrawNoteOptional', 'Settlement Note (Optional)')}
            </Text>
            <TextInput
              value={withdrawNote}
              onChangeText={setWithdrawNote}
              placeholder={t('disputes.withdrawPlaceholder', 'e.g. Worker completed the remaining work today.')}
              placeholderTextColor={theme.colors.text.dim}
              multiline
              numberOfLines={3}
              style={[
                styles.withdrawInput,
                {
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.input.background,
                  borderColor: theme.colors.border.subtle,
                },
              ]}
            />

            <View style={styles.withdrawActionRow}>
              <TouchableOpacity
                onPress={() => setShowWithdrawModal(false)}
                style={[styles.withdrawCancelBtn, { borderColor: theme.colors.border.subtle }]}
              >
                <Text style={{ color: theme.colors.text.secondary, fontWeight: '700' }}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmWithdraw}
                disabled={isWithdrawing}
                style={[styles.withdrawConfirmBtn, { backgroundColor: colors.success }]}
              >
                {isWithdrawing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    {t('disputes.confirmWithdraw', 'Yes, Close Complaint')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BeautifulModal>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 11,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  summaryCardWrapper: {
    width: '100%',
    paddingBottom: 4,
  },
  listTopContainer: {
    width: '100%',
  },
  paginationSpinner: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    padding: Spacing.m,
    borderRadius: BorderRadius.l,
    width: '100%',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  summaryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  amountPillWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  amountPill: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  statementBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginTop: 2,
  },
  statementLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statementText: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  summaryBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11.5,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  pauseNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pauseNoticeText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  initialEvidenceRow: {
    marginTop: 4,
    gap: 6,
  },
  evidenceLabel: {
    fontSize: 11,
  },
  evidenceThumbs: {
    flexDirection: 'row',
    gap: 8,
  },
  evidenceThumbCard: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  evidenceThumbImg: {
    width: '100%',
    height: '100%',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  withdrawBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  chatArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: Spacing.m,
    paddingVertical: 12,
    gap: 12,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  systemMessageCard: {
    maxWidth: '88%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  systemIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  systemMessageTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  systemMessageText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  systemMessageTime: {
    fontSize: 9.5,
    marginTop: 2,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
    paddingLeft: 4,
  },
  senderNameText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  bubble: {
    padding: 11,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  replyQuoteBox: {
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  replyQuoteSender: {
    fontSize: 10,
    fontWeight: '800',
  },
  replyQuoteContent: {
    fontSize: 10.5,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  attachmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  attachmentThumbWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  attachmentThumb: {
    width: '100%',
    height: '100%',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  timeText: {
    fontSize: 9.5,
  },
  replyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  replyActionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  closedNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.m,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  closedTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  closedSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  replyBannerTitle: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  replyBannerContent: {
    fontSize: 11.5,
  },
  photoPreviewRow: {
    paddingHorizontal: Spacing.m,
    paddingVertical: 8,
  },
  photoPreviewCard: {
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    padding: 2,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.m,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 13.5,
    minHeight: 28,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imageModalCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  withdrawModalContent: {
    gap: 14,
  },
  withdrawModalDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  withdrawNoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  withdrawInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  withdrawActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  withdrawCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawConfirmBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
