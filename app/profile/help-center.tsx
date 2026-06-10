import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { HelpCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { InputField } from '../../components/InputField';
import { CustomButton } from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { useCreateSupportRequestMutation, useToast } from '../../hooks';
import api from '../../services/api';

export default function HelpCenterScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ subject?: string; reason?: string; source?: string }>();
  const { success, error: showError } = useToast();
  const { mutateAsync: createRequest, isPending } = useCreateSupportRequestMutation();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // States for ticket replies
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [submittingReplies, setSubmittingReplies] = useState<Record<string, boolean>>({});

  const contactText = useMemo(() => {
    if (user?.phone) return `We will contact you on ${user.phone}.`;
    if (user?.email) return `We will contact you on ${user.email}.`;
    return 'We will contact you using your account details.';
  }, [user?.email, user?.phone]);

  useEffect(() => {
    if (params.subject) {
      setSubject(String(params.subject));
    }
    if (params.reason) {
      setMessage(`Hello admin, my account is deactivated and I need help reviewing it.\n\nReason shown in app: ${String(params.reason)}`);
    }
  }, [params.reason, params.subject]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      showError('Missing details', 'Please fill in the subject and your message.');
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
      success('Sent', 'Your request has been sent to support.');
      setSubject('');
      setMessage('');
      fetchMyRequests();
    } catch (err: any) {
      showError('Failed to send', err?.message || 'Please try again later.');
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
        authorName: (user as any)?.fullName || (user as any)?.name || 'User',
        from: 'user'
      };
      await api.post(`/support/requests/${id}/reply`, payload);
      success('Reply Sent', 'Your reply has been added.');
      setTicketReplies(prev => ({ ...prev, [id]: '' }));
      fetchMyRequests();
    } catch (err: any) {
      showError('Error', err?.message || 'Could not send reply.');
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
        <ProfileHeader title="Help Center" />

        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
          <View style={styles.iconWrap}>
            <View style={styles.iconGlow} />
            <View style={styles.iconCircle}>
              <HelpCircle size={34} color={Colors.primary} />
            </View>
          </View>
          <Text style={[styles.screenTitle, Typography.threeD]}>Need Help?</Text>
          <Text style={styles.screenSubtitle}>Tell us your concern and our team will get back to you.</Text>
        </Animated.View>

        {/* Create Request Form */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.formSection}>
          <InputField
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Issue with booking"
          />

          <Text style={styles.messageLabel}>Message</Text>
          <GlassCard style={styles.messageCard} intensity={20} padding={Spacing.m}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Write your message here..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              style={styles.messageInput}
            />
          </GlassCard>

          <Text style={styles.helperText}>{contactText}</Text>

          <CustomButton
            title={isPending ? 'Sending...' : 'Send to Support'}
            onPress={handleSubmit}
            loading={isPending}
            style={styles.sendButton}
          />
        </Animated.View>

        {/* User Requests List with status and replies */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>My Requests</Text>
          {loadingRequests && requests.length === 0 ? (
            <Text style={styles.helperText}>Loading requests…</Text>
          ) : requests.length === 0 ? (
            <Text style={styles.helperText}>You have not submitted any support tickets yet.</Text>
          ) : (
            requests.map((r) => (
              <GlassCard key={r._id} style={styles.requestCard} intensity={18} padding={Spacing.m}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestSubject}>{r.topic || r.subject || 'General Support'}</Text>
                  <View style={[
                    styles.statusBadge, 
                    r.status === 'closed' ? styles.statusClosed :
                    r.status === 'pending' ? styles.statusPending : styles.statusOpen
                  ]}>
                    <Text style={styles.statusText}>{r.status?.toUpperCase() || 'OPEN'}</Text>
                  </View>
                </View>
                
                <Text style={styles.requestDate}>Opened on {formatDate(r.createdAt)}</Text>
                
                <View style={styles.originalMsgBox}>
                  <Text style={styles.requestMessage}>{r.message}</Text>
                </View>

                {/* Reply Message Thread */}
                {r.replies && r.replies.length > 0 && (
                  <View style={styles.repliesContainer}>
                    <Text style={styles.repliesTitle}>Conversation History</Text>
                    <View style={styles.replyThread}>
                      {r.replies.map((rep: any, idx: number) => {
                        const isAdmin = rep.from === 'admin';
                        return (
                          <View 
                            key={idx} 
                            style={[
                              styles.replyBubble,
                              isAdmin ? styles.adminBubble : styles.userBubble
                            ]}
                          >
                            <Text style={styles.replyAuthor}>
                              {isAdmin ? (rep.authorName || 'Support Agent') : 'You'}
                            </Text>
                            <Text style={styles.replyText}>{rep.message}</Text>
                            <Text style={styles.replyTime}>{formatDate(rep.createdAt)}</Text>
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
                      style={styles.quickReplyInput}
                      placeholder="Type reply to agent..."
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={ticketReplies[r._id] || ''}
                      onChangeText={(text) => handleReplyTextChange(r._id, text)}
                    />
                    <CustomButton
                      title="Send"
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
    backgroundColor: Colors.primary + '15',
  },
  iconCircle: {
    flex: 1,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
  },
  screenSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 13,
    lineHeight: 18,
  },
  formSection: {
    gap: 12,
  },
  messageLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  messageCard: {
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  messageInput: {
    minHeight: 110,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  helperText: {
    color: 'rgba(255,255,255,0.35)',
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
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  requestCard: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.l,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  requestSubject: {
    color: '#fff',
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
  statusOpen: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  statusClosed: {
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    borderColor: 'rgba(142, 142, 147, 0.3)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  requestDate: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  originalMsgBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.s,
    padding: Spacing.s,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  requestMessage: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  repliesTitle: {
    color: Colors.primary,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.secondary + '20',
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  replyAuthor: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '800',
  },
  replyText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
    fontWeight: '500',
  },
  replyTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 8,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  quickReplyContainer: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  quickReplyInput: {
    flex: 1,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.s,
    paddingHorizontal: Spacing.s,
    color: '#fff',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickReplyBtn: {
    height: 38,
    paddingHorizontal: Spacing.m,
  },
});
