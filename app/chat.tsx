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
  Image,
  Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, MoreVertical, ShieldCheck, CheckCheck } from 'lucide-react-native';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socketService';
import { useMessages, useSendMessageMutation, type Message } from '../hooks';
import Animated, { FadeIn, FadeInRight, FadeInLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { bookingId, recipientName, recipientId } = useLocalSearchParams<{
    bookingId: string;
    recipientName: string;
    recipientId: string;
  }>();

  const [inputText, setInputText] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // React Query hooks
  const { data: messages = [], isLoading, refetch: refetchMessages } = useMessages(bookingId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessageMutation();

  // Combine local and fetched messages
  const allMessages: Message[] = [...localMessages, ...messages];

  useEffect(() => {
    // Listen for real-time messages
    const unsubscribe = socketService.on('chat:receive', (newMessage: Message) => {
      if (newMessage.sender !== user?._id) {
        setLocalMessages(prev => [newMessage, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });

    return () => unsubscribe();
  }, [bookingId, user?._id]);

  const handleSendMessage = () => {
    if (!inputText.trim() || isSending) return;

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
        onSuccess: () => {
          // Emit via socket for real-time update
          socketService.emit('chat:send', {
            bookingId,
            content
          });
        },
        onError: () => {
          // Remove optimistic message on error
          setLocalMessages(prev => prev.filter(m => m._id !== tempId));
        }
      }
    );
  };

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
          <Text style={styles.messageContent}>{item.content}</Text>
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
              <Text style={styles.userName}>{recipientName || 'Mission Partner'}</Text>
              <View style={styles.statusRow}>
                <View style={styles.activeDot} />
                <Text style={styles.statusText}>SECURE LINE ACTIVE</Text>
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
              ref={flatListRef}
              data={allMessages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => `${item._id}-${index}`}
              inverted
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
            <GlassCard intensity={25} style={styles.inputGlass} padding={0}>
              <View style={styles.inputInner}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type a message..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || isSending}
                >
                  <Send size={20} color="#000" />
                </TouchableOpacity>
              </View>
            </GlassCard>

            <View style={styles.securitySeal}>
              <ShieldCheck size={10} color="rgba(255,255,255,0.3)" />
              <Text style={styles.securityTxt}>END-TO-END ENCRYPTED</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  statusText: {
    fontSize: 8,
    color: Colors.success,
    fontWeight: '900',
    letterSpacing: 0.5,
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
  }
});
