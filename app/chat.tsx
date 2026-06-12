import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  CheckCheck,
  ChevronLeft,
  MessageCircle,
  Mic,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  Send,
  ShieldCheck,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react-native';
import { Colors, Shadows } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socketService';
import { useBookingDetails, useMessages, useSendMessageMutation, type Message } from '../hooks';
import Animated, { FadeInRight, FadeInLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import Toast from 'react-native-toast-message';
import api from '../services/api';

const formatSeconds = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

function VoiceMessageBubble({ item }: { item: Message }) {
  const player = useAudioPlayer(item.audioUrl || null);
  const status = useAudioPlayerStatus(player);
  const { t } = useTranslation();
  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      await player.seekTo(0);
    }
    player.play();
  };

  return (
    <TouchableOpacity style={styles.voiceBubble} onPress={togglePlayback} activeOpacity={0.8}>
      <View style={styles.voicePlay}>
        {status.playing ? <PauseCircle size={30} color={Colors.cyan} /> : <PlayCircle size={30} color={Colors.cyan} />}
      </View>
      <View style={styles.voiceCopy}>
        <View style={styles.voiceTitleRow}>
          <Volume2 size={13} color={Colors.cyan} strokeWidth={2.4} />
          <Text style={styles.voiceTitle}>{t('chat.voiceMessage')}</Text>
        </View>
        <Text style={styles.voiceDuration}>
          {formatSeconds(status.currentTime)} / {formatSeconds(status.duration || item.audioDurationSeconds || 0)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const { bookingId, recipientName } = useLocalSearchParams<{
    bookingId: string;
    recipientName: string;
  }>();

  const [inputText, setInputText] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceDurationMillis, setVoiceDurationMillis] = useState(0);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const flatListRef = useRef<FlatList<any>>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  // React Query hooks
  const { data: messages = [], isLoading } = useMessages(bookingId);
  const { data: booking, isLoading: isLoadingBooking } = useBookingDetails(bookingId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessageMutation();
  const isCommunicationLocked = booking?.status === 'completed' || booking?.status === 'cancelled';
  const canSendMessages = Boolean(booking) && !isCommunicationLocked;
  const isRecording = recorderState.isRecording;
  const isComposerBusy = isSending || isUploadingVoice;

  // Combine and deduplicate messages (prefer local for instant feedback, then official from server)
  const allMessages = React.useMemo(() => {
    const combined = [...localMessages, ...messages];
    const unique = new Map();
    combined.forEach(m => {
      if (!unique.has(m._id)) {
        unique.set(m._id, m);
      }
    });
    return Array.from(unique.values());
  }, [localMessages, messages]);

  useEffect(() => {
    // Listen for real-time messages
    const unsubscribe = socketService.on('chat:receive', (newMessage: Message) => {
      if (newMessage.booking === bookingId && newMessage.sender !== user?._id) {
        setLocalMessages(prev => [newMessage, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });

    return () => unsubscribe();
  }, [bookingId, user?._id]);

  const handleSendMessage = () => {
    if (!inputText.trim() || isComposerBusy || !canSendMessages) return;

    const content = inputText.trim();

    // Optimistic UI update
    const tempId = Date.now().toString();
    const optimisticMsg: Message = {
      _id: tempId,
      sender: user?._id || 'anonymous',
      senderModel: role === 'worker' ? 'Worker' : 'User',
      content,
      createdAt: new Date().toISOString(),
    };

    setLocalMessages(prev => [optimisticMsg, ...prev]);
    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Send message via mutation
    sendMessage(
      { bookingId: bookingId as string, message: content },
      {
        onSuccess: (data) => {
          // Replace optimistic message with real one to prevent duplication
          setLocalMessages(prev => prev.map(m => m._id === tempId ? data : m));
        },
        onError: () => {
          // Remove optimistic message on error
          setLocalMessages(prev => prev.filter(m => m._id !== tempId));
        }
      }
    );
  };

  const startVoiceRecording = async () => {
    if (!canSendMessages || isComposerBusy || isRecording) return;

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('chat.micAccessNeeded'), t('chat.allowMic'));
        return;
      }

      setVoiceUri(null);
      setVoiceDurationMillis(0);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      Toast.show({ type: 'error', text1: t('chat.couldNotStart'), text2: t('bidSubmission.tryAgain') });
    }
  };

  const stopVoiceRecording = async () => {
    if (!isRecording) return;

    try {
      const recordedDuration = recorderState.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (!recorder.uri || recordedDuration < 500) {
        setVoiceUri(null);
        setVoiceDurationMillis(0);
        Toast.show({ type: 'info', text1: t('chat.tooShort'), text2: t('chat.holdThought') });
        return;
      }
      setVoiceUri(recorder.uri);
      setVoiceDurationMillis(recordedDuration);
    } catch (error) {
      Toast.show({ type: 'error', text1: t('chat.couldNotFinish'), text2: t('bidSubmission.tryAgain') });
    }
  };

  const discardVoiceRecording = async () => {
    if (isRecording) {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    }
    setVoiceUri(null);
    setVoiceDurationMillis(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const sendVoiceMessage = async () => {
    if (!voiceUri || !bookingId || isComposerBusy || !canSendMessages) return;

    setIsUploadingVoice(true);
    try {
      const extension = voiceUri.split('.').pop()?.toLowerCase() || 'm4a';
      const mimeType = extension === 'webm' ? 'audio/webm' : extension === 'aac' ? 'audio/aac' : 'audio/m4a';
      const formData = new FormData();
      formData.append('audio', {
        uri: voiceUri,
        name: `voice-message-${Date.now()}.${extension}`,
        type: mimeType,
      } as any);
      const uploadResponse = await api.post(`/messages/${bookingId}/upload-audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const audioUrl = uploadResponse.data.data.audioUrl as string;
      const durationSeconds = Math.max(1, Math.round(voiceDurationMillis / 1000));
      const tempId = `voice-${Date.now()}`;
      const optimisticMsg: Message = {
        _id: tempId,
        sender: user?._id || 'anonymous',
        senderModel: role === 'worker' ? 'Worker' : 'User',
        content: 'Voice message',
        messageType: 'audio',
        audioUrl,
        audioDurationSeconds: durationSeconds,
        createdAt: new Date().toISOString(),
      };

      setLocalMessages(prev => [optimisticMsg, ...prev]);
      setVoiceUri(null);
      setVoiceDurationMillis(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      sendMessage(
        {
          bookingId: bookingId as string,
          message: 'Voice message',
          messageType: 'audio',
          audioUrl,
          audioDurationSeconds: durationSeconds,
        },
        {
          onSuccess: data => setLocalMessages(prev => prev.map(item => item._id === tempId ? data : item)),
          onError: () => setLocalMessages(prev => prev.filter(item => item._id !== tempId)),
        }
      );
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: t('chat.notSent'),
        text2: error.response?.data?.message || t('chat.checkConnection'),
      });
    } finally {
      setIsUploadingVoice(false);
    }
  };

  useEffect(() => {
    if (isRecording && recorderState.durationMillis >= 120000) {
      void stopVoiceRecording();
    }
  }, [isRecording, recorderState.durationMillis]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender === user?._id;

    return (
      <Animated.View
        entering={isMe ? FadeInRight.delay(index * 50) : FadeInLeft.delay(index * 50)}
        style={[
          styles.messageRow,
          isMe ? styles.myMessageRow : styles.theirMessageRow
        ]}
      >
        <GlassCard
          intensity={isMe ? 35 : 20}
          style={[
            styles.bubble,
            isMe ? styles.myBubble : styles.theirBubble
          ]}
        >
          {item.messageType === 'audio' && item.audioUrl ? (
            <VoiceMessageBubble item={item} />
          ) : (
            <Text style={styles.messageContent}>{item.content}</Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={styles.timeText}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && <CheckCheck size={12} color={Colors.cyan} style={{ marginLeft: 4 }} />}
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.userInfo}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarGlow, { backgroundColor: Colors.cyan }]} />
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>{recipientName?.[0] || 'U'}</Text>
              </View>
            </View>
            <View style={styles.userMeta}>
              <Text style={styles.userName}>{recipientName || t('transactionDetails.servicePartner')}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.activeDot, !canSendMessages && styles.inactiveDot]} />
                <Text style={[styles.statusText, !canSendMessages && styles.inactiveStatusText]}>
                  {isLoadingBooking ? t('chat.checkingAccess') : canSendMessages ? t('chat.secureLine') : t('chat.historyOnly')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerAction}>
            <MoreVertical color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <View style={styles.chatArea}>
          {isLoading && localMessages.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.cyan} />
            </View>
          ) : (
            <FlatList
              {...({
                ref: flatListRef,
                data: allMessages,
                renderItem: renderMessage,
                keyExtractor: (item: any, index: number) => `${item._id}-${index}`,
                inverted: true,
                contentContainerStyle: styles.messageList,
                showsVerticalScrollIndicator: false,
                ListEmptyComponent: (
                  <View style={styles.emptyChat}>
                    <View style={styles.emptyChatIcon}><MessageCircle size={24} color={Colors.cyan} /></View>
                    <Text style={styles.emptyChatTitle}>{t('chat.secureReady')}</Text>
                    <Text style={styles.emptyChatText}>{t('chat.bookingActiveDesc')}</Text>
                  </View>
                ),
              } as any)}
            />
          )}
        </View>

        {/* Input */}
        {!canSendMessages ? (
          <View style={[styles.lockedContainer, { paddingBottom: insets.bottom + 12 }]}>
            <ShieldCheck size={16} color={Colors.textMuted} />
            <View style={styles.lockedCopy}>
              <Text style={styles.lockedTitle}>{isLoadingBooking ? t('chat.checkingChatAccess') : t('chat.chatClosed')}</Text>
              <Text style={styles.lockedText}>
                {isLoadingBooking
                  ? t('chat.confirmingStatus')
                  : t('chat.bookingEnded')}
              </Text>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
              <GlassCard intensity={60} style={styles.inputGlass} padding={0}>
                {isRecording || voiceUri ? (
                  <View style={styles.voiceComposer}>
                    <TouchableOpacity style={styles.discardVoiceBtn} onPress={discardVoiceRecording} activeOpacity={0.78}>
                      <Trash2 size={18} color="#FF453A" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.recordingCopy}>
                      <View style={styles.recordingTitleRow}>
                        <View style={[styles.recordingDot, !isRecording && styles.voiceReadyDot]} />
                        <Text style={styles.recordingTitle}>{isRecording ? t('chat.recordingVoice') : t('chat.voiceReady')}</Text>
                      </View>
                      <Text style={styles.recordingDuration}>
                        {formatSeconds((isRecording ? recorderState.durationMillis : voiceDurationMillis) / 1000)}
                      </Text>
                    </View>
                    {isRecording ? (
                      <TouchableOpacity style={styles.stopRecordingBtn} onPress={stopVoiceRecording} activeOpacity={0.78}>
                        <Square size={17} color="#FFFFFF" fill="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.sendBtn, isUploadingVoice && styles.composerDisabled]}
                        onPress={sendVoiceMessage}
                        disabled={isUploadingVoice}
                        activeOpacity={0.78}
                      >
                        {isUploadingVoice ? <ActivityIndicator size="small" color="#001014" /> : <Send size={20} color="#001014" />}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.inputInner}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('chat.placeholder')}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                      maxLength={500}
                    />
                    {inputText.trim() ? (
                      <TouchableOpacity
                        style={[styles.sendBtn, isComposerBusy && styles.composerDisabled]}
                        onPress={handleSendMessage}
                        disabled={isComposerBusy}
                        activeOpacity={0.78}
                      >
                        <Send size={20} color="#001014" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.micBtn} onPress={startVoiceRecording} disabled={isComposerBusy} activeOpacity={0.78}>
                        <Mic size={20} color={Colors.cyan} strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </GlassCard>

              <View style={styles.securitySeal}>
                <ShieldCheck size={10} color="rgba(255,255,255,0.3)" />
                <Text style={styles.securityTxt}>{t('chat.protected')}</Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    opacity: 0.15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  userMeta: {
    marginLeft: 12,
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  inactiveDot: {
    backgroundColor: Colors.textMuted,
  },
  statusText: {
    fontSize: 8,
    color: Colors.success,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  inactiveStatusText: {
    color: Colors.textMuted,
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 40,
    transform: [{ scaleY: -1 }],
  },
  emptyChatIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.28)',
    backgroundColor: 'rgba(0,245,255,0.09)',
    marginBottom: 14,
  },
  emptyChatTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  emptyChatText: {
    maxWidth: 280,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 7,
  },
  messageList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
  },
  theirMessageRow: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  myBubble: {
    borderBottomRightRadius: 4,
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  voiceBubble: {
    minWidth: 185,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  voicePlay: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(0,245,255,0.08)',
  },
  voiceCopy: {
    flex: 1,
  },
  voiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  voiceTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  voiceDuration: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  inputGlass: {
    borderRadius: 28,
    minHeight: 56,
    justifyContent: 'center',
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 15,
    maxHeight: 100,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  micBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.28)',
    backgroundColor: 'rgba(0,245,255,0.08)',
  },
  voiceComposer: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 6,
  },
  discardVoiceBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255,69,58,0.1)',
  },
  recordingCopy: {
    flex: 1,
  },
  recordingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF453A',
  },
  voiceReadyDot: {
    backgroundColor: '#00FF7F',
  },
  recordingTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  recordingDuration: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 5,
  },
  stopRecordingBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FF453A',
    ...Shadows.glow,
  },
  composerDisabled: {
    opacity: 0.56,
  },
  securitySeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
    opacity: 0.5,
  },
  securityTxt: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
  },
  lockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(7,10,24,0.88)',
  },
  lockedCopy: {
    flex: 1,
  },
  lockedTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  lockedText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});
