import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  TouchableOpacity,
  Modal,
  ModalProps,
  Dimensions,
  Text,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows } from '../../constants/Theme';
import { X, CheckCircle2, AlertTriangle, Info, HelpCircle } from 'lucide-react-native';
import { GlassCard } from '../home/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';

interface BeautifulModalProps extends Omit<ModalProps, 'visible' | 'transparent' | 'animationType'> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number | string;
  showCloseButton?: boolean;
  glowColor?: string;
  containerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export function BeautifulModal({
  visible,
  onClose,
  title,
  children,
  height = '60%',
  showCloseButton = true,
  glowColor = Colors.cyan,
  containerStyle,
  contentStyle,
  icon,
  ...modalProps
}: BeautifulModalProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  const numericHeight = useMemo(() => {
    if (typeof height === 'number') return height;
    if (typeof height === 'string' && height.endsWith('%')) {
      return (parseInt(height) / 100) * Dimensions.get('window').height;
    }
    return parseInt(height as string) || (0.6 * Dimensions.get('window').height);
  }, [height]);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 10, mass: 1, stiffness: 100 });
      opacity.value = withSpring(1, { damping: 12, mass: 1, stiffness: 100 });
    } else {
      scale.value = withSpring(0.8);
      opacity.value = withSpring(0);
    }
  }, [visible, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" {...modalProps}>
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.backdrop}
      >
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalContainer,
            { height: numericHeight },
            containerStyle,
            animatedStyle,
          ]}
        >
          <View style={[styles.modalGlow, { backgroundColor: glowColor + '20' }]} />

          <GlassCard
            intensity={Platform.OS === 'ios' ? 95 : 100}
            glowColor={glowColor}
            style={[styles.modalContent, contentStyle, { overflow: 'visible' }]}
            contentStyle={{ flex: 1 }}
            padding={0}
          >
            <LinearGradient
              colors={[glowColor, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.topAccentBar}
            />

            {icon && (
              <View style={styles.floatingIconBadge}>
                 <View style={[styles.iconBadgeInner, { borderColor: glowColor + '40' }]}>
                   {icon}
                 </View>
              </View>
            )}

            <View style={styles.contentInner}>
              {title && (
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{title.toUpperCase()}</Text>
                  {showCloseButton && (
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                      <X size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.modalBody}>
                {children}
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

interface ConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  isLoading?: boolean;
}

export function ConfirmModal({
  visible,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = Colors.cyan,
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <BeautifulModal
      visible={visible}
      onClose={onCancel}
      title={title}
      height={380}
      glowColor={confirmColor}
      icon={<HelpCircle color={confirmColor} size={32} />}
    >
      <View style={styles.modalBodyContent}>
        <Text style={styles.modalMessage}>{message}</Text>

        <View style={styles.confirmButtons}>
          <TouchableOpacity
            style={[styles.confirmBtn, styles.cancelBtn]}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelBtnText}>{cancelText.toUpperCase()}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: confirmColor, borderColor: confirmColor }]}
            onPress={onConfirm}
            disabled={isLoading}
          >
            <LinearGradient colors={[confirmColor, confirmColor]} style={styles.solidBtnGradient}>
              <Text style={styles.solidBtnText}>
                {isLoading ? '...' : confirmText.toUpperCase()}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </BeautifulModal>
  );
}

interface AlertModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message: string;
  buttonText?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function AlertModal({
  visible,
  onDismiss,
  title,
  message,
  buttonText = 'OK',
  type = 'info',
}: AlertModalProps) {
  const getColor = () => {
    switch (type) {
      case 'success': return Colors.success;
      case 'error': return Colors.error;
      case 'warning': return '#FFA500';
      default: return Colors.cyan;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 color={getColor()} size={32} />;
      case 'error': return <AlertTriangle color={getColor()} size={32} />;
      default: return <Info color={getColor()} size={32} />;
    }
  };

  return (
    <BeautifulModal
      visible={visible}
      onClose={onDismiss}
      title={title}
      height={420}
      glowColor={getColor()}
      icon={getIcon()}
    >
      <View style={styles.modalBodyContent}>
        <Text style={styles.modalMessage}>{message}</Text>
        <TouchableOpacity
          style={[styles.alertBtn, { backgroundColor: getColor(), borderColor: getColor() }]}
          onPress={onDismiss}
        >
           <LinearGradient colors={[getColor(), getColor()]} style={styles.solidBtnGradient}>
              <Text style={styles.solidBtnText}>{buttonText.toUpperCase()}</Text>
            </LinearGradient>
        </TouchableOpacity>
      </View>
    </BeautifulModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: { ...StyleSheet.absoluteFillObject },
  modalContainer: {
    width: '88%',
    borderRadius: 32,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 30,
  },
  modalGlow: {
    position: 'absolute',
    top: -50, left: -50, right: -50, bottom: -50,
    borderRadius: 100, opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: 'rgba(15, 15, 30, 0.95)',
  },
  topAccentBar: {
    height: 4, width: '100%', position: 'absolute', top: 0, zIndex: 2,
  },
  contentInner: {
    flex: 1, padding: 24, paddingTop: 55,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, zIndex: 10, height: 30,
  },
  modalTitle: {
    fontSize: 14, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: 2, textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute', right: -10, top: -5,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  modalBody: {
    flex: 1, justifyContent: 'center',
  },
  modalBodyContent: {
    alignItems: 'center', width: '100%',
  },
  floatingIconBadge: {
    position: 'absolute', top: -45, alignSelf: 'center', zIndex: 100,
  },
  iconBadgeInner: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#0F0F1A', borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 15, elevation: 20,
  },
  modalMessage: {
    fontSize: 16, color: '#FFFFFF', lineHeight: 24,
    textAlign: 'center', marginBottom: 40, fontWeight: '600',
    paddingHorizontal: 10,
  },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtn: { flex: 1, height: 56, borderRadius: 20, overflow: 'hidden' },
  solidBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  solidBtnText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  alertBtn: { width: '100%', height: 58, borderRadius: 22, overflow: 'hidden' },
});
