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
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Mic,
  PauseCircle,
  Phone,
  PlayCircle,
  Send,
  ShieldCheck,
  Square,
  Trash2,
  Volume2,
  Sparkles,
} from 'lucide-react-native';
import { Colors, useTheme } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { useAuth } from '../context/AuthContext';
import { useVoiceCall } from '../context/CallContext';
import { useLanguage, useIsRTL } from '../context/LanguageContext';
import { socketService } from '../services/socketService';
import { useBookingDetails, useMessages, useSendMessageMutation, type Message } from '../hooks';
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

function VoiceMessageBubble({ item, isMe }: { item: Message; isMe: boolean }) {
  const player = useAudioPlayer(item.audioUrl || null);
  const status = useAudioPlayerStatus(player);
  const { t } = useTranslation();
  const theme = useTheme();
  const { language } = useLanguage();

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

  const iconColor = isMe ? '#FFFFFF' : theme.colors.brand.primary;
  const titleColor = isMe ? '#FFFFFF' : theme.colors.text.primary;
  const durationColor = isMe ? 'rgba(255,255,255,0.75)' : theme.colors.text.muted;
  const playBg = isMe
    ? 'rgba(255,255,255,0.22)'
    : theme.isDark
    ? 'rgba(0, 245, 255, 0.12)'
    : 'rgba(37, 99, 235, 0.08)';

  return (
    <TouchableOpacity style={styles.voiceBubble} onPress={togglePlayback} activeOpacity={0.8}>
      <View style={[styles.voicePlay, { backgroundColor: playBg }]}>
        {status.playing ? <PauseCircle size={26} color={iconColor} /> : <PlayCircle size={26} color={iconColor} />}
      </View>
      <View style={styles.voiceCopy}>
        <View style={styles.voiceTitleRow}>
          <Volume2 size={13} color={iconColor} strokeWidth={2.4} />
          <Text style={[styles.voiceTitle, { color: titleColor }]}>
            {language === 'ur' ? 'وائس میسج' : t('chat.voiceMessage', 'Voice message')}
          </Text>
        </View>
        <Text style={[styles.voiceDuration, { color: durationColor }]}>
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
  const { language, isRTL } = useLanguage();
  const theme = useTheme();
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

  const bookingWorker = typeof booking?.worker === 'object' ? booking.worker : null;
  const bookingCustomer = typeof booking?.customer === 'object' ? booking.customer : null;
  const { startCall } = useVoiceCall();

  const handleCall = async () => {
    if (!bookingId) return;
    try {
      const partnerName = role === 'client' ? (bookingWorker as any)?.fullName : (bookingCustomer as any)?.fullName;
      const partnerAvatar = role === 'client' ? (bookingWorker as any)?.profileImage : (bookingCustomer as any)?.profileImage;
      const partnerRole = role === 'client' ? ((bookingWorker as any)?.category || 'Worker') : 'Client';

      await startCall({
        bookingId,
        recipientName: partnerName || recipientName || 'User',
        recipientAvatar: partnerAvatar,
        recipientRole: partnerRole,
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Call Failed',
        text2: err?.message || 'Unable to place in-app call.',
      });
    }
  };

  // Combine and deduplicate messages, then SORT DESCENDING (newest first)
  // With FlatList inverted: true, index 0 (newest) stays pinned at the BOTTOM.
  const allMessages = useMemo(() => {
    const combined = [...localMessages, ...messages];
    const unique = new Map<string, Message>();
    combined.forEach(m => {
      if (m?._id && !unique.has(m._id)) {
        unique.set(m._id, m);
      }
    });

    // Sort strictly newest to oldest so index 0 is always the latest message
    return Array.from(unique.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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

  const handleSendMessage = (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isComposerBusy || !canSendMessages) return;

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      _id: tempId,
      sender: user?._id || 'anonymous',
      senderModel: role === 'worker' ? 'Worker' : 'User',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    setLocalMessages(prev => [optimisticMsg, ...prev]);
    if (!customText) setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    sendMessage(
      { bookingId: bookingId as string, message: textToSend },
      {
        onSuccess: (data) => {
          setLocalMessages(prev => prev.map(m => (m._id === tempId ? data : m)));
        },
        onError: () => {
          setLocalMessages(prev => prev.filter(m => m._id !== tempId));
        },
      }
    );
  };

  const handleSelectSuggestion = (text: string) => {
    Haptics.selectionAsync();
    setInputText(text);
  };

  const startVoiceRecording = async () => {
    if (!canSendMessages || isComposerBusy || isRecording) return;

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Toast.show({
          type: 'warning',
          text1: language === 'ur' ? 'مائیک کی اجازت دیں' : t('chat.micAccessNeeded', 'Allow Microphone'),
          text2: language === 'ur' ? 'وائس میسج بھیجنے کے لیے مائیکروفون کی اجازت دیں۔' : t('chat.allowMic', 'Please allow microphone access.'),
        });
        return;
      }

      setVoiceUri(null);
      setVoiceDurationMillis(0);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: language === 'ur' ? 'ریکارڈنگ شروع نہیں ہو سکی' : t('chat.couldNotStart', 'Could not start recording'),
      });
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
        Toast.show({
          type: 'info',
          text1: language === 'ur' ? 'وائس میسج بہت چھوٹا تھا' : t('chat.tooShort', 'Voice message too short'),
          text2: language === 'ur' ? 'بولتے وقت مائیک کا بٹن دبا کر رکھیں۔' : t('chat.holdThought', 'Hold the mic button while speaking.'),
        });
        return;
      }
      setVoiceUri(recorder.uri);
      setVoiceDurationMillis(recordedDuration);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: language === 'ur' ? 'وائس میسج محفوظ نہیں ہو سکا' : t('chat.couldNotFinish', 'Could not save voice message'),
      });
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
          onSuccess: (data) => setLocalMessages(prev => prev.map(item => (item._id === tempId ? data : item))),
          onError: () => setLocalMessages(prev => prev.filter(item => item._id !== tempId)),
        }
      );
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: language === 'ur' ? 'وائس میسج نہیں جا سکا' : t('chat.notSent', 'Could not send voice message'),
        text2: error.response?.data?.message || (language === 'ur' ? 'انٹرنیٹ چیک کریں۔' : 'Please check connection.'),
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

  const quickSuggestions = useMemo(() => {
    return language === 'ur'
      ? ['السلام علیکم!', 'آپ کہاں پہنچے ہیں؟', 'اپنی لوکیشن شیئر کر دیں']
      : ['Assalam-o-Alaikum!', 'Where have you reached?', 'Please share your location'];
  }, [language]);

  const renderMessage = ({ item }: { item: Message; index: number }) => {
    const isMe = item.sender === user?._id;

    // In React Native:
    // If isRTL is true: flex-start = RIGHT, flex-end = LEFT.
    // If isRTL is false: flex-start = LEFT, flex-end = RIGHT.
    // This formula ensures `isMe` is ALWAYS pinned to the RIGHT side,
    // and `their` messages are ALWAYS pinned to the LEFT side in both languages!
    const bubbleAlign = isMe
      ? (isRTL ? 'flex-start' : 'flex-end')
      : (isRTL ? 'flex-end' : 'flex-start');

    return (
      <View style={[styles.messageRow, { alignSelf: bubbleAlign }]}>
        <View
          style={[
            styles.bubble,
            isMe
              ? [
                  styles.myBubble,
                  {
                    backgroundColor: theme.isDark ? '#059669' : '#10B981',
                    borderColor: theme.isDark ? '#047857' : '#059669',
                  },
                ]
              : [
                  styles.theirBubble,
                  {
                    backgroundColor: theme.isDark ? '#1A1D26' : '#FFFFFF',
                    borderColor: theme.colors.border.default,
                  },
                ],
          ]}
        >
          {item.messageType === 'audio' && item.audioUrl ? (
            <VoiceMessageBubble item={item} isMe={isMe} />
          ) : (
            <Text
              style={[
                styles.messageContent,
                { color: isMe ? '#FFFFFF' : theme.colors.text.primary },
              ]}
              selectable
            >
              {item.content}
            </Text>
          )}

          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.timeText,
                { color: isMe ? 'rgba(255,255,255,0.78)' : theme.colors.text.muted },
              ]}
            >
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && <CheckCheck size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border.default, backgroundColor: theme.colors.surface.card }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}
            activeOpacity={0.7}
          >
            {isRTL ? (
              <ChevronRight color={theme.colors.text.primary} size={22} />
            ) : (
              <ChevronLeft color={theme.colors.text.primary} size={22} />
            )}
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatar, { backgroundColor: theme.isDark ? '#1E293B' : '#E2E8F0', borderColor: theme.colors.border.default }]}>
                <Text style={[styles.avatarInitial, { color: theme.colors.brand.primary }]}>
                  {recipientName?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            </View>
            <View style={styles.userMeta}>
              <Text style={[styles.userName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {recipientName || (language === 'ur' ? 'سروس پارٹنر' : t('transactionDetails.servicePartner', 'Service Partner'))}
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.activeDot,
                    isCommunicationLocked ? styles.inactiveDot : { backgroundColor: '#10B981' },
                  ]}
                />
                <Text style={[styles.statusText, !canSendMessages && styles.inactiveStatusText]}>
                  {isLoadingBooking
                    ? (language === 'ur' ? 'لوڈ ہو رہا ہے...' : 'LOADING CHAT...')
                    : canSendMessages
                    ? (language === 'ur' ? 'چیٹ آن ہے' : 'CHAT OPEN')
                    : (language === 'ur' ? 'پرانے پیغامات' : 'PAST MESSAGES')}
                </Text>
              </View>
            </View>
          </View>

          {canSendMessages ? (
            <TouchableOpacity
              onPress={handleCall}
              style={[
                styles.headerAction,
                {
                  backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                  borderColor: theme.isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.3)',
                },
              ]}
              activeOpacity={0.75}
            >
              <Phone color={theme.isDark ? '#34D399' : '#059669'} size={18} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Messages List Area */}
        <View style={styles.chatArea}>
          {isLoading && localMessages.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.brand.primary} size="large" />
            </View>
          ) : allMessages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyChat}>
                <View style={[styles.emptyChatIcon, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}>
                  <MessageCircle size={32} color={theme.colors.brand.primary} />
                </View>
                <Text style={[styles.emptyChatTitle, { color: theme.colors.text.primary }]}>
                  {language === 'ur' ? 'ابھی کوئی پیغام نہیں ہے' : t('chat.emptyTitle', 'No messages yet')}
                </Text>
                <Text style={[styles.emptyChatText, { color: theme.colors.text.muted }]}>
                  {language === 'ur'
                    ? 'سلام کریں یا کام کے متعلق بات چیت شروع کریں۔'
                    : t('chat.emptySubtitle', 'Say Salam or send a message to coordinate your booking.')}
                </Text>

                {/* Suggestion Chips */}
                {canSendMessages && (
                  <View style={styles.suggestionsContainer}>
                    <View style={styles.suggestionHeader}>
                      <Sparkles size={12} color={theme.colors.brand.primary} />
                      <Text style={[styles.suggestionHeaderText, { color: theme.colors.text.muted }]}>
                        {language === 'ur' ? 'فوری پیغامات' : 'Quick Suggestions'}
                      </Text>
                    </View>
                    <View style={styles.suggestionChipsRow}>
                      {quickSuggestions.map((suggestion, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.suggestionChip,
                            {
                              backgroundColor: theme.colors.surface.card,
                              borderColor: theme.colors.border.default,
                            },
                          ]}
                          onPress={() => handleSelectSuggestion(suggestion)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.suggestionChipText, { color: theme.colors.text.primary }]}>
                            {suggestion}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
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
              } as any)}
            />
          )}
        </View>

        {/* Input Composer / Locked Bar */}
        {!canSendMessages ? (
          <View
            style={[
              styles.lockedContainer,
              {
                backgroundColor: theme.colors.surface.card,
                borderTopColor: theme.colors.border.subtle,
                paddingBottom: insets.bottom + 12,
              },
            ]}
          >
            <ShieldCheck size={18} color={theme.colors.text.muted} />
            <View style={styles.lockedCopy}>
              <Text style={[styles.lockedTitle, { color: theme.colors.text.primary }]}>
                {isLoadingBooking
                  ? (language === 'ur' ? 'لوڈ ہو رہا ہے...' : t('chat.checkingChatAccess', 'LOADING...'))
                  : (language === 'ur' ? 'کام مکمل ہو چکا' : t('chat.chatClosed', 'JOB FINISHED'))}
              </Text>
              <Text style={[styles.lockedText, { color: theme.colors.text.secondary }]}>
                {isLoadingBooking
                  ? (language === 'ur' ? 'بکنگ اسٹیٹس چیک ہو رہا ہے...' : t('chat.confirmingStatus', 'Loading booking details...'))
                  : (language === 'ur'
                      ? 'یہ کام ختم ہو چکا ہے۔ پرانے پیغامات نیچے پڑھے جا سکتے ہیں۔'
                      : t('chat.bookingEnded', 'This job is finished. You can still read past messages.'))}
              </Text>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          >
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <View
                style={[
                  styles.inputCard,
                  {
                    backgroundColor: theme.colors.surface.card,
                    borderColor: theme.colors.border.default,
                  },
                ]}
              >
                {isRecording || voiceUri ? (
                  <View style={styles.voiceComposer}>
                    <TouchableOpacity
                      style={styles.discardVoiceBtn}
                      onPress={discardVoiceRecording}
                      activeOpacity={0.78}
                    >
                      <Trash2 size={18} color="#EF4444" strokeWidth={2.4} />
                    </TouchableOpacity>
                    <View style={styles.recordingCopy}>
                      <View style={styles.recordingTitleRow}>
                        <View style={[styles.recordingDot, !isRecording && styles.voiceReadyDot]} />
                        <Text style={[styles.recordingTitle, { color: theme.colors.text.primary }]}>
                          {isRecording
                            ? (language === 'ur' ? 'آواز ریکارڈ ہو رہی ہے...' : t('chat.recordingVoice', 'Recording voice message...'))
                            : (language === 'ur' ? 'وائس میسج تیار ہے' : t('chat.voiceReady', 'Voice message ready'))}
                        </Text>
                      </View>
                      <Text style={[styles.recordingDuration, { color: theme.colors.brand.primary }]}>
                        {formatSeconds((isRecording ? recorderState.durationMillis : voiceDurationMillis) / 1000)}
                      </Text>
                    </View>
                    {isRecording ? (
                      <TouchableOpacity
                        style={styles.stopRecordingBtn}
                        onPress={stopVoiceRecording}
                        activeOpacity={0.78}
                      >
                        <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.sendBtn,
                          { backgroundColor: theme.colors.brand.primary },
                          isUploadingVoice && styles.composerDisabled,
                        ]}
                        onPress={sendVoiceMessage}
                        disabled={isUploadingVoice}
                        activeOpacity={0.78}
                      >
                        {isUploadingVoice ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Send size={18} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.inputInner}>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: theme.colors.text.primary,
                          textAlign: isRTL ? 'right' : 'left',
                        },
                      ]}
                      placeholder={language === 'ur' ? 'پیغام لکھیں...' : t('chat.placeholder', 'Write a message...')}
                      placeholderTextColor={theme.colors.text.muted}
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                      maxLength={500}
                    />
                    {inputText.trim() ? (
                      <TouchableOpacity
                        style={[
                          styles.sendBtn,
                          { backgroundColor: theme.isDark ? '#059669' : '#10B981' },
                          isComposerBusy && styles.composerDisabled,
                        ]}
                        onPress={() => handleSendMessage()}
                        disabled={isComposerBusy}
                        activeOpacity={0.78}
                      >
                        <Send size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.micBtn,
                          {
                            borderColor: theme.colors.border.default,
                            backgroundColor: theme.colors.surface.subtle,
                          },
                        ]}
                        onPress={startVoiceRecording}
                        disabled={isComposerBusy}
                        activeOpacity={0.78}
                      >
                        <Mic size={20} color={theme.colors.brand.primary} strokeWidth={2.4} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.securitySeal}>
                <ShieldCheck size={11} color={theme.colors.text.muted} />
                <Text style={[styles.securityTxt, { color: theme.colors.text.muted }]}>
                  {language === 'ur' ? 'محفوظ بکنگ چیٹ' : t('chat.protected', 'PRIVATE BOOKING CHAT')}
                </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  avatarWrapper: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  userMeta: {
    marginLeft: 10,
    marginRight: 10,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  inactiveDot: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  inactiveStatusText: {
    color: '#94A3B8',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
  },
  chatArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyChatIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyChatText: {
    maxWidth: 290,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    textAlign: 'center',
  },
  suggestionsContainer: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  suggestionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionChipText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: '82%',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  messageContent: {
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '500',
  },
  voiceBubble: {
    minWidth: 175,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  voicePlay: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
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
    fontSize: 14,
    fontWeight: '800',
  },
  voiceDuration: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  inputCard: {
    borderRadius: 26,
    minHeight: 54,
    borderWidth: 1.6,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 15.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1.5,
  },
  voiceComposer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discardVoiceBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  recordingCopy: {
    flex: 1,
  },
  recordingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  voiceReadyDot: {
    backgroundColor: '#10B981',
  },
  recordingTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordingDuration: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  stopRecordingBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#EF4444',
  },
  composerDisabled: {
    opacity: 0.5,
  },
  securitySeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 4,
  },
  securityTxt: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  lockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  lockedCopy: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  lockedText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
});
