import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { HelpCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { alpha, BorderRadius, Spacing, useTheme, useThemeShadows, useThemeTypography } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { InputField } from '../../components/InputField';
import { CustomButton } from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { useCreateSupportRequestMutation, useToast } from '../../hooks';
import api from '../../services/api';

export default function HelpCenterScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ subject?: string; reason?: string; source?: string }>();
  const { success, error: showError } = useToast();
  const { mutateAsync: createRequest, isPending } = useCreateSupportRequestMutation();
  const theme = useTheme();
  const typography = useThemeTypography();
  const shadows = useThemeShadows();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // States for ticket replies
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [submittingReplies, setSubmittingReplies] = useState<Record<string, boolean>>({});

  const contactText = useMemo(() => {
    if (user?.phone) return t('helpCenter.contactPhone', { phone: user.phone });
    if (user?.email) return t('helpCenter.contactEmail', { email: user.email });
    return t('helpCenter.contactDefault');
  }, [user?.email, user?.phone, t]);

  useEffect(() => {
    if (params.subject) {
      setSubject(String(params.subject));
    }
    if (params.reason) {
      setMessage(t('helpCenter.deactivationMsg', { reason: String(params.reason) }));
    }
  }, [params.reason, params.subject, t]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      showError(t('helpCenter.missingDetails'), t('helpCenter.fillRequired'));
      return;
    }

    try {
      await createRequest({
        subject: subject.trim(),
        message: message.trim(),
        name: (user as any)?.fullName || (user as any)?.name,
        email: user?.email,
        userId: user?._id,
        ...(params.source === 'account_deactivation'
          ? {
            metadata: {
              source: 'account_deactivation',
              deactivationReason: params.reason || '',
            },
          }
          : {}),
      });
      success(t('helpCenter.sentTitle'), t('helpCenter.sentDesc'));
      setSubject('');
      setMessage('');
      fetchMyRequests();
    } catch (err: any) {
      showError(t('helpCenter.failedSend'), err?.message || t('helpCenter.tryAgainLater'));
    }
  };

  const fetchMyRequests = async () => {
    if (!user?._id) return;
    setLoadingRequests(true);
    try {
      const resp = await api.get<any>(`/support/requests/user/${user._id}`);
      const docs = resp?.data?.data ?? resp?.data ?? [];
      setRequests(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.warn('Could not fetch support requests', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleReplyTextChange = (id: string, text: string) => {
    setTicketReplies(prev => ({ ...prev, [id]: text }));
  };

  const submitReply = async (id: string) => {
    const text = ticketReplies[id];
    if (!text || !text.trim()) return;

    setSubmittingReplies(prev => ({ ...prev, [id]: true }));
    try {
      const payload = {
        message: text.trim(),
        authorName: (user as any)?.fullName || (user as any)?.name || t('helpCenter.userName'),
        from: 'user'
      };
      await api.post(`/support/requests/${id}/reply`, payload);
      success(t('helpCenter.replySentTitle'), t('helpCenter.replySentDesc'));
      setTicketReplies(prev => ({ ...prev, [id]: '' }));
      fetchMyRequests();
    } catch (err: any) {
      showError(t('common.error'), err?.message || t('helpCenter.replySendError'));
    } finally {
      setSubmittingReplies(prev => ({ ...prev, [id]: false }));
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  useEffect(() => { fetchMyRequests(); }, [user?._id]);

  return (
    <BackgroundWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader title={t('helpCenter.title')} />

<Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
           <View style={styles.iconWrap}>
              <View style={[styles.iconGlow, { backgroundColor: alpha(theme.colors.brand.primary, 0.15) }]} />
             <View style={styles.iconCircle}>
               <HelpCircle size={34} color={theme.colors.brand.primary} />
             </View>
           </View>
           <Text style={[styles.screenTitle, typography.threeD, { color: theme.colors.text.primary }]}>{t('helpCenter.needHelp')}</Text>
           <Text style={[styles.screenSubtitle, { color: theme.colors.text.muted }]}>{t('helpCenter.needHelpDesc')}</Text>
         </Animated.View>

        {/* Create Request Form */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.formSection}>
          <InputField
            label={t('helpCenter.subjectLabel')}
            value={subject}
            onChangeText={setSubject}
            placeholder={t('helpCenter.subjectPlaceholder')}
          />

          <Text style={styles.messageLabel}>{t('helpCenter.messageLabel')}</Text>
            <GlassCard style={[styles.messageCard, { borderColor: theme.colors.border.subtle }]} intensity={20} padding={Spacing.m}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t('helpCenter.messagePlaceholder')}
              placeholderTextColor={theme.colors.input.placeholder}
              multiline
              style={[styles.messageInput, { color: theme.colors.input.text }]}
            />
          </GlassCard>

          <Text style={[styles.helperText, { color: theme.colors.text.muted }]}>{contactText}</Text>

          <CustomButton
            title={isPending ? t('helpCenter.sending') : t('helpCenter.sendBtn')}
            onPress={handleSubmit}
            loading={isPending}
            style={styles.sendButton}
          />
        </Animated.View>

        {/* User Requests List with status and replies */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.requestsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{t('helpCenter.myRequests')}</Text>
          {loadingRequests && requests.length === 0 ? (
            <Text style={[styles.helperText, { color: theme.colors.text.muted }]}>{t('helpCenter.loadingRequests')}</Text>
          ) : requests.length === 0 ? (
            <Text style={[styles.helperText, { color: theme.colors.text.muted }]}>{t('helpCenter.noRequests')}</Text>
          ) : (
            requests.map((r) => (
              <GlassCard key={r._id} style={[styles.requestCard, { borderColor: theme.colors.border.subtle }]} intensity={18} padding={Spacing.m}>
                <View style={styles.requestHeader}>
                  <Text style={[styles.requestSubject, { color: theme.colors.text.primary }]}>{r.topic || r.subject || t('helpCenter.contactSupport')}</Text>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor: r.status === 'closed' ? alpha(theme.colors.text.muted, 0.1) : r.status === 'pending' ? alpha(theme.colors.status.warning, 0.1) : alpha(theme.colors.status.success, 0.1),
                      borderColor: r.status === 'closed' ? alpha(theme.colors.text.muted, 0.3) : r.status === 'pending' ? alpha(theme.colors.status.warning, 0.3) : alpha(theme.colors.status.success, 0.3),
                    },
                  ]}>
                    <Text style={[styles.statusText, { color: r.status === 'closed' ? theme.colors.text.muted : r.status === 'pending' ? theme.colors.status.warning : theme.colors.status.success }]}>{r.status?.toUpperCase() || 'OPEN'}</Text>
                  </View>
                </View>
                
                <Text style={[styles.requestDate, { color: theme.colors.text.dim }]}>{t('helpCenter.openedOn', { date: formatDate(r.createdAt) })}</Text>
                
                <View style={styles.originalMsgBox}>
                  <Text style={[styles.requestMessage, { color: theme.colors.text.primary }]}>{r.message}</Text>
                </View>

                {/* Reply Message Thread */}
                {r.replies && r.replies.length > 0 && (
                  <View style={styles.repliesContainer}>
                    <Text style={[styles.repliesTitle, { color: theme.colors.brand.primary }]}>{t('helpCenter.conversationHistory')}</Text>
                    <View style={styles.replyThread}>
                      {r.replies.map((rep: any, idx: number) => {
                        const isAdmin = rep.from === 'admin';
                        return (
<View 
                             key={idx} 
                              style={[
                                styles.replyBubble,
                                isAdmin ? [styles.adminBubble, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }] : [styles.userBubble, { backgroundColor: alpha(theme.colors.brand.secondary, 0.18), borderColor: alpha(theme.colors.brand.secondary, 0.3) }]
                              ]}
                           >
                            <Text style={[styles.replyAuthor, { color: theme.colors.text.primary }]}>
                              {isAdmin ? (rep.authorName || t('helpCenter.agentName')) : t('helpCenter.userName')}
                            </Text>
                            <Text style={[styles.replyText, { color: theme.colors.text.secondary }]}>{rep.message}</Text>
                            <Text style={[styles.replyTime, { color: theme.colors.text.dim }]}>{formatDate(rep.createdAt)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Reply Form */}
                {r.status !== 'closed' && (
                  <View style={styles.quickReplyContainer}>
                    <TextInput
                      style={[styles.quickReplyInput, { color: theme.colors.input.text, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.input.background }]}
                      placeholder={t('helpCenter.replyPlaceholder')}
                      placeholderTextColor={theme.colors.input.placeholder}
                      value={ticketReplies[r._id] || ''}
                      onChangeText={(text) => handleReplyTextChange(r._id, text)}
                    />
                    <CustomButton
                      title={t('helpCenter.sendReplyBtn')}
                      onPress={() => submitReply(r._id)}
                      style={styles.quickReplyBtn}
                      loading={submittingReplies[r._id]}
                      textStyle={{ fontSize: 11, fontWeight: '800' }}
                    />
                  </View>
                )}
              </GlassCard>
            ))
          )}
        </Animated.View>
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
    marginBottom: 24,
  },
  iconWrap: {
    width: 90,
    height: 90,
    marginBottom: 16,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 45,
  },
  iconCircle: {
    flex: 1,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  screenSubtitle: {
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 13,
    lineHeight: 18,
  },
  formSection: {
    gap: 12,
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  messageCard: {
    borderRadius: BorderRadius.l,
    borderWidth: 1,
  },
  messageInput: {
    minHeight: 110,
    fontSize: 14,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    marginTop: 2,
  },
  sendButton: {
    marginTop: 8,
  },
  requestsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  requestCard: {
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.l,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  requestSubject: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.s,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  requestDate: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  originalMsgBox: {
    borderRadius: BorderRadius.s,
    padding: Spacing.s,
    marginTop: 8,
    borderWidth: 1,
  },
  requestMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 14,
    paddingTop: 10,
  },
  repliesTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  replyThread: {
    gap: 8,
  },
  replyBubble: {
    padding: Spacing.s + 2,
    borderRadius: BorderRadius.m,
    maxWidth: '85%',
  },
  adminBubble: {
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderWidth: 1,
  },
  replyAuthor: {
    fontSize: 10,
    fontWeight: '800',
  },
  replyText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
    fontWeight: '500',
  },
  replyTime: {
    fontSize: 8,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  quickReplyContainer: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
    paddingTop: 10,
  },
  quickReplyInput: {
    flex: 1,
    height: 38,
    borderRadius: BorderRadius.s,
    paddingHorizontal: Spacing.s,
    fontSize: 12,
    borderWidth: 1,
  },
  quickReplyBtn: {
    height: 38,
    paddingHorizontal: Spacing.m,
  },
});
