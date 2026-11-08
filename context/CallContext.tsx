import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngineEventHandler,
} from 'react-native-agora';
import { createAudioPlayer } from 'expo-audio';
import { socketService } from '../services/socketService';
import { callService, InitiateCallResponse } from '../services/callService';
import { AGORA_APP_ID } from '../constants/Config';
import { VoiceCallModal, CallStatus } from '../components/call/VoiceCallModal';
import { useAuth } from './AuthContext';

interface StartCallOptions {
  bookingId: string;
  recipientName?: string;
  recipientAvatar?: string;
  recipientRole?: string;
}

interface CallContextType {
  status: CallStatus;
  startCall: (options: StartCallOptions) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  isMuted: boolean;
  isSpeakerOn: boolean;
  callDurationSeconds: number;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const agoraEngineRef = useRef<IRtcEngine | null>(null);

  const [status, setStatus] = useState<CallStatus>('idle');
  const [partnerName, setPartnerName] = useState<string>('');
  const [partnerAvatar, setPartnerAvatar] = useState<string | undefined>(undefined);
  const [partnerRole, setPartnerRole] = useState<string | undefined>(undefined);
  const [partnerId, setPartnerId] = useState<string>('');
  const [partnerType, setPartnerType] = useState<'user' | 'worker'>('worker');

  const [currentBookingId, setCurrentBookingId] = useState<string>('');
  const [currentChannelName, setCurrentChannelName] = useState<string>('');

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true); // Default to speakerphone for clear audio
  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(0);

  const timerRef = useRef<any>(null);
  const ringtonePlayerRef = useRef<any>(null);
  const vibrationTimerRef = useRef<any>(null);

  // Request runtime microphone permission on Android
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (hasPermission) return true;

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Apna Ustad needs access to your microphone for in-app voice calls.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Microphone permission check error:', err);
        return false;
      }
    }
    return true;
  };

  // Ringtone playback controls
  const startRingtone = () => {
    stopRingtone();
    try {
      const player = createAudioPlayer(require('../assets/sounds/ringtone.wav'));
      player.loop = true;
      player.volume = 1.0;
      player.play();
      ringtonePlayerRef.current = player;
    } catch (e) {
      console.warn('Failed to start ringtone player:', e);
    }

    // Pulse vibration rhythmically every 1.5s
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    vibrationTimerRef.current = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }, 1500);
  };

  const stopRingtone = () => {
    if (ringtonePlayerRef.current) {
      try {
        ringtonePlayerRef.current.pause();
        ringtonePlayerRef.current.remove();
      } catch (e) {}
      ringtonePlayerRef.current = null;
    }
    if (vibrationTimerRef.current) {
      clearInterval(vibrationTimerRef.current);
      vibrationTimerRef.current = null;
    }
  };

  // Initialize Agora Engine once
  const initAgora = useCallback(async () => {
    if (agoraEngineRef.current) return agoraEngineRef.current;
    try {
      const engine = createAgoraRtcEngine();
      engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // Enable and fully configure audio hardware
      engine.enableAudio();
      engine.enableLocalAudio(true);
      engine.muteLocalAudioStream(false);
      engine.muteAllRemoteAudioStreams(false);
      engine.adjustRecordingSignalVolume(100);
      engine.adjustPlaybackSignalVolume(100);
      engine.setDefaultAudioRouteToSpeakerphone(true);
      engine.setEnableSpeakerphone(true);

      const eventHandler: IRtcEngineEventHandler = {
        onJoinChannelSuccess: (_connection, _elapsed) => {
          console.log('Agora RTC: Successfully joined voice channel');
          engine.enableLocalAudio(true);
          engine.muteLocalAudioStream(false);
        },
        onUserJoined: (_connection, remoteUid, _elapsed) => {
          console.log('Agora RTC: Remote partner joined UID:', remoteUid);
          engine.muteRemoteAudioStream(remoteUid, false);
          stopRingtone();
          setStatus('connected');
          startDurationTimer();
        },
        onUserOffline: (_connection, _remoteUid, _reason) => {
          console.log('Agora RTC: Remote partner disconnected');
          handleEndCall();
        },
        onError: (err, msg) => {
          console.warn('Agora RTC Error:', err, msg);
        },
      };

      engine.registerEventHandler(eventHandler);
      agoraEngineRef.current = engine;
      return engine;
    } catch (err) {
      console.error('Failed to initialize Agora RTC engine:', err);
      return null;
    }
  }, []);

  const startDurationTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDurationSeconds(0);
    timerRef.current = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallDurationSeconds(0);
  };

  // Leave Agora Channel and reset local audio states
  const cleanupAgoraSession = async () => {
    stopDurationTimer();
    stopRingtone();
    try {
      if (agoraEngineRef.current) {
        agoraEngineRef.current.leaveChannel();
      }
    } catch (e) {
      console.warn('Error leaving Agora channel:', e);
    }
    setIsMuted(false);
    setIsSpeakerOn(true);
  };

  /**
   * Start an Outgoing Call
   */
  const startCall = async (options: StartCallOptions) => {
    try {
      // 1. Check microphone permission
      const micAllowed = await requestMicrophonePermission();
      if (!micAllowed) {
        Toast.show({
          type: 'error',
          text1: 'Microphone Permission Needed',
          text2: 'Please allow microphone access to place in-app calls.',
        });
        return;
      }

      setStatus('calling');
      setPartnerName(options.recipientName || 'Partner');
      setPartnerAvatar(options.recipientAvatar);
      setPartnerRole(options.recipientRole);
      setCurrentBookingId(options.bookingId);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // 2. Fetch Agora Token & Call metadata from backend
      const session: InitiateCallResponse = await callService.initiateCall(options.bookingId);
      setCurrentChannelName(session.channelName);
      setPartnerId(session.recipient.id);
      setPartnerType(session.recipient.type);
      setPartnerName(session.recipient.name || options.recipientName || 'Partner');
      setPartnerAvatar(session.recipient.avatar || options.recipientAvatar);

      // 3. Initialize Agora & Join channel as broadcaster/publisher
      const engine = await initAgora();
      if (!engine) {
        throw new Error('Voice calling engine is unavailable');
      }

      // Explicitly publish microphone audio & auto-subscribe remote audio
      engine.joinChannel(session.token, session.channelName, session.uid || 1, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
        enableAudioRecordingOrPlayout: true,
      });

      // 4. Emit live socket event to notify recipient phone
      setStatus('ringing');
      socketService.emit('call:ring', {
        bookingId: options.bookingId,
        channelName: session.channelName,
        recipientId: session.recipient.id,
        recipientType: session.recipient.type,
        callerName: session.caller.name,
        callerAvatar: session.caller.avatar,
      });
    } catch (err: any) {
      console.error('Failed to start in-app call:', err);
      setStatus('idle');
      await cleanupAgoraSession();
      Toast.show({
        type: 'error',
        text1: 'Call Failed',
        text2: err?.message || 'Could not place in-app call.',
      });
    }
  };

  /**
   * Accept an Incoming Call
   */
  const acceptCall = async () => {
    try {
      if (!currentBookingId) return;

      // 1. Check microphone permission
      const micAllowed = await requestMicrophonePermission();
      if (!micAllowed) {
        Toast.show({
          type: 'error',
          text1: 'Microphone Permission Needed',
          text2: 'Please allow microphone access to talk.',
        });
        return;
      }

      stopRingtone();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // 2. Fetch token for this booking channel (recipient token)
      const tokenData = await callService.getCallToken(currentBookingId);

      // 3. Join Agora Channel
      const engine = await initAgora();
      if (!engine) throw new Error('Voice calling engine is unavailable');

      engine.joinChannel(tokenData.token, tokenData.channelName, tokenData.uid || 2, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
        enableAudioRecordingOrPlayout: true,
      });

      setStatus('connected');
      startDurationTimer();

      // 4. Notify caller via socket
      socketService.emit('call:accept', {
        bookingId: currentBookingId,
        channelName: tokenData.channelName,
        callerId: partnerId,
        callerType: partnerType,
      });
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      handleEndCall();
      Toast.show({
        type: 'error',
        text1: 'Could not connect call',
        text2: err?.message || 'Please try again.',
      });
    }
  };

  /**
   * Reject an Incoming Call
   */
  const rejectCall = () => {
    stopRingtone();
    socketService.emit('call:reject', {
      bookingId: currentBookingId,
      channelName: currentChannelName,
      callerId: partnerId,
      callerType: partnerType,
      reason: 'declined',
    });
    setStatus('declined');
    setTimeout(() => {
      setStatus('idle');
      cleanupAgoraSession();
    }, 1200);
  };

  /**
   * End an Active Call
   */
  const handleEndCall = () => {
    stopRingtone();
    socketService.emit('call:end', {
      bookingId: currentBookingId,
      channelName: currentChannelName,
      partnerId,
      partnerType,
    });
    setStatus('ended');
    setTimeout(() => {
      setStatus('idle');
      cleanupAgoraSession();
    }, 1000);
  };

  /**
   * Audio controls
   */
  const toggleMute = () => {
    if (!agoraEngineRef.current) return;
    const nextMuted = !isMuted;
    agoraEngineRef.current.muteLocalAudioStream(nextMuted);
    setIsMuted(nextMuted);
  };

  const toggleSpeaker = () => {
    if (!agoraEngineRef.current) return;
    const nextSpeaker = !isSpeakerOn;
    agoraEngineRef.current.setEnableSpeakerphone(nextSpeaker);
    setIsSpeakerOn(nextSpeaker);
  };

  // Socket Event Listeners for Call Lifecycle
  useEffect(() => {
    const unsubIncoming = socketService.on('call:incoming', (data) => {
      console.log('Incoming call received via socket:', data);
      if (status !== 'idle') {
        // Already on a call, auto-reject with busy
        socketService.emit('call:reject', {
          bookingId: data.bookingId,
          channelName: data.channelName,
          callerId: data.callerId,
          callerType: data.callerType,
          reason: 'busy',
        });
        return;
      }

      setCurrentBookingId(data.bookingId);
      setCurrentChannelName(data.channelName);
      setPartnerId(data.callerId);
      setPartnerType(data.callerType);
      setPartnerName(data.callerName || 'Apna Ustad');
      setPartnerAvatar(data.callerAvatar);
      setStatus('incoming');

      // Start ringing sound & vibration
      startRingtone();
    });

    const unsubAccepted = socketService.on('call:accepted', () => {
      console.log('Call accepted by partner');
      stopRingtone();
      setStatus('connected');
      startDurationTimer();
    });

    const unsubRejected = socketService.on('call:rejected', (data) => {
      console.log('Call was rejected:', data?.reason);
      stopRingtone();
      setStatus('declined');
      Toast.show({
        type: 'info',
        text1: 'Call Declined',
        text2: data?.reason || 'The partner is unavailable.',
      });
      setTimeout(() => {
        setStatus('idle');
        cleanupAgoraSession();
      }, 1500);
    });

    const unsubEnded = socketService.on('call:ended', () => {
      console.log('Call ended by partner');
      stopRingtone();
      setStatus('ended');
      setTimeout(() => {
        setStatus('idle');
        cleanupAgoraSession();
      }, 1000);
    });

    return () => {
      unsubIncoming();
      unsubAccepted();
      unsubRejected();
      unsubEnded();
    };
  }, [status, currentBookingId, currentChannelName, partnerId, partnerType]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
      stopDurationTimer();
      if (agoraEngineRef.current) {
        agoraEngineRef.current.release();
        agoraEngineRef.current = null;
      }
    };
  }, []);

  return (
    <CallContext.Provider
      value={{
        status,
        startCall,
        acceptCall,
        rejectCall,
        endCall: handleEndCall,
        toggleMute,
        toggleSpeaker,
        isMuted,
        isSpeakerOn,
        callDurationSeconds,
      }}
    >
      {children}
      <VoiceCallModal
        visible={status !== 'idle'}
        status={status}
        partnerName={partnerName}
        partnerAvatar={partnerAvatar}
        partnerRole={partnerRole}
        callDurationSeconds={callDurationSeconds}
        isMuted={isMuted}
        isSpeakerOn={isSpeakerOn}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEndCall={handleEndCall}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
      />
    </CallContext.Provider>
  );
};

export const useVoiceCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useVoiceCall must be used within a CallProvider');
  }
  return context;
};
