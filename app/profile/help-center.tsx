import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
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
import { useEffect } from 'react';

export default function HelpCenterScreen() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { mutateAsync: createRequest, isPending } = useCreateSupportRequestMutation();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const contactText = useMemo(() => {
    if (user?.phone) return `We will contact you on ${user.phone}.`;
    if (user?.email) return `We will contact you on ${user.email}.`;
    return 'We will contact you using your account details.';
  }, [user?.email, user?.phone]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      showError('Missing details', 'Please fill in the subject and your message.');
      return;
    }

    try {
      await createRequest({
        subject: subject.trim(),
        message: message.trim(),
        name: user?.fullName || user?.name,
        email: user?.email,
        userId: user?._id,
      });
      success('Sent', 'Your request has been sent to support.');
      setSubject('');
      setMessage('');
      // refresh user's requests
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
              <HelpCircle size={34} color="#fff" />
            </View>
          </View>
          <Text style={[styles.screenTitle, Typography.threeD]}>Need Help?</Text>
          <Text style={styles.screenSubtitle}>Tell us your concern and our team will get back to you.</Text>
        </Animated.View>

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

        <Animated.View entering={FadeInDown.delay(400)} style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>My Requests</Text>
          {loadingRequests ? <Text style={styles.helperText}>Loading…</Text> : (
            requests.map((r) => (
              <GlassCard key={r._id} style={{ marginVertical: 8 }} intensity={18} padding={Spacing.m}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{r.topic || r.subject || 'General'}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{r.message}</Text>
                {r.replies && r.replies.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    {r.replies.map((rep: any, i: number) => (
                      <View key={i} style={{ marginTop: 8 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '700' }}>{rep.authorName || (rep.from === 'admin' ? 'Admin' : 'You')}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{rep.message}</Text>
                      </View>
                    ))}
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
    backgroundColor: Colors.primary + '25',
  },
  iconCircle: {
    flex: 1,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
  },
  screenSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 20,
  },
  formSection: {
    gap: 14,
  },
  messageLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  messageCard: {
    borderRadius: BorderRadius.l,
    ...Shadows.glow,
  },
  messageInput: {
    minHeight: 140,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  helperText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  sendButton: {
    marginTop: 10,
  },
  requestsSection: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
});
