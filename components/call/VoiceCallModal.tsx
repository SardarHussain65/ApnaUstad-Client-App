import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../constants/Theme';

const { width } = Dimensions.get('window');

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'incoming'
  | 'connected'
  | 'ended'
  | 'declined';

interface VoiceCallModalProps {
  visible: boolean;
  status: CallStatus;
  partnerName: string;
  partnerAvatar?: string;
  partnerRole?: string;
  callDurationSeconds: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  visible,
  status,
  partnerName,
  partnerAvatar,
  partnerRole,
  callDurationSeconds,
  isMuted,
  isSpeakerOn,
  onAccept,
  onReject,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
}) => {
  const theme = useTheme();

  // Format seconds to mm:ss
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'calling':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'incoming':
        return 'Incoming Voice Call...';
      case 'connected':
        return formatDuration(callDurationSeconds);
      case 'ended':
        return 'Call Ended';
      case 'declined':
        return 'Call Declined';
      default:
        return '';
    }
  };

  if (!visible && status === 'idle') {
    return null;
  }

  const isIncoming = status === 'incoming';
  const isConnected = status === 'connected';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Top Security Banner */}
        <View style={styles.header}>
          <View style={styles.securityBadge}>
            <ShieldCheck size={16} color="#10B981" />
            <Text style={styles.securityText}>Private & Encrypted Call</Text>
          </View>
          <Text style={styles.subSecurityText}>
            Phone numbers are hidden to protect your privacy
          </Text>
        </View>

        {/* Center: Profile, Name, Role & Status */}
        <View style={styles.profileSection}>
          <View style={[styles.avatarWrapper, isConnected && styles.avatarConnected]}>
            {partnerAvatar ? (
              <Image source={{ uri: partnerAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {partnerName ? partnerName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.partnerName} numberOfLines={1}>
            {partnerName || 'Apna Ustad'}
          </Text>

          {partnerRole ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{partnerRole.toUpperCase()}</Text>
            </View>
          ) : null}

          <Text style={[styles.statusText, isConnected && styles.connectedStatusText]}>
            {getStatusText()}
          </Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionsContainer}>
          {isIncoming ? (
            // Incoming Call Buttons (Decline / Accept)
            <View style={styles.incomingActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={onReject}
                activeOpacity={0.8}
              >
                <PhoneOff size={32} color="#FFFFFF" />
                <Text style={styles.buttonLabel}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={onAccept}
                activeOpacity={0.8}
              >
                <Phone size={32} color="#FFFFFF" />
                <Text style={styles.buttonLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Active / Outgoing Call Buttons (Mute, End, Speaker)
            <View style={styles.activeActions}>
              <View style={styles.controlsRow}>
                {/* Mute Button */}
                <TouchableOpacity
                  style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                  onPress={onToggleMute}
                  activeOpacity={0.7}
                >
                  {isMuted ? (
                    <MicOff size={26} color="#EF4444" />
                  ) : (
                    <Mic size={26} color="#FFFFFF" />
                  )}
                  <Text style={styles.controlLabel}>{isMuted ? 'Muted' : 'Mute'}</Text>
                </TouchableOpacity>

                {/* Speaker Button */}
                <TouchableOpacity
                  style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                  onPress={onToggleSpeaker}
                  activeOpacity={0.7}
                >
                  {isSpeakerOn ? (
                    <Volume2 size={26} color="#10B981" />
                  ) : (
                    <VolumeX size={26} color="#FFFFFF" />
                  )}
                  <Text style={styles.controlLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</Text>
                </TouchableOpacity>
              </View>

              {/* End Call Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.endCallButton]}
                onPress={onEndCall}
                activeOpacity={0.8}
              >
                <PhoneOff size={34} color="#FFFFFF" />
                <Text style={styles.buttonLabel}>End Call</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120', // Premium dark slate background
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  securityText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  subSecurityText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    width: '100%',
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 4,
    marginBottom: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarConnected: {
    borderColor: '#10B981',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
  },
  partnerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: 14,
  },
  roleBadgeText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  connectedStatusText: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  actionsContainer: {
    width: '100%',
    marginBottom: Platform.OS === 'ios' ? 20 : 36,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  activeActions: {
    alignItems: 'center',
    width: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 32,
    width: '100%',
  },
  controlButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  controlLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

