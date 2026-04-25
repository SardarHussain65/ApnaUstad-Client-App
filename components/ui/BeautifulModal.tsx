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
  ...modalProps
}: BeautifulModalProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  // Convert percentage string to pixel value
  const numericHeight = useMemo(() => {
    if (typeof height === 'number') return height;
    if (typeof height === 'string' && height.endsWith('%')) {
      return (parseInt(height) / 100) * Dimensions.get('window').height;
    }
    return parseInt(height as string) || (0.6 * Dimensions.get('window').height);
  }, [height]);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, {
        damping: 10,
        mass: 1,
        stiffness: 100,
        overshootClamping: false,
      });
      opacity.value = withSpring(1, {
        damping: 12,
        mass: 1,
        stiffness: 100,
      });
    } else {
      scale.value = withSpring(0.8);
      opacity.value = withSpring(0);
    }
  }, [visible, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      {...modalProps}
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={[styles.backdrop]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            { height: numericHeight },
            containerStyle,
            animatedStyle,
          ]}
        >
          {/* Floating Glow Behind Modal */}
          <View style={[styles.modalGlow, { backgroundColor: glowColor + '20' }]} />

          <GlassCard
            intensity={Platform.OS === 'ios' ? 95 : 100}
            glowColor={glowColor}
            style={[styles.modalContent, contentStyle]}
            padding={0}
          >
            {/* Top Accent Gradient Bar */}
            <LinearGradient
              colors={[glowColor, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.topAccentBar}
            />

            {/* Content Wrap with Padding */}
            <View style={styles.contentInner}>
              {/* Header */}
              {title && (
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, Typography.threeD]}>
                    {title.toUpperCase()}
                  </Text>
                  {showCloseButton && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeBtn}
                    >
                      <X size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Body */}
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
    >
      <View style={styles.confirmContent}>
        <View style={styles.floatingIconBadge}>
           <View style={[styles.iconBadgeInner, { borderColor: confirmColor + '40' }]}>
             <HelpCircle color={confirmColor} size={32} />
           </View>
        </View>

        <Text style={styles.confirmMessage}>
          {message}
        </Text>

        <View style={styles.confirmButtons}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.confirmBtn, styles.cancelBtn]}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelBtnText}>
              {cancelText.toUpperCase()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.confirmBtn, { backgroundColor: confirmColor, borderColor: confirmColor }]}
            onPress={onConfirm}
            disabled={isLoading}
          >
            <LinearGradient
               colors={[confirmColor, confirmColor]}
               style={styles.solidBtnGradient}
            >
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
      case 'success':
        return Colors.success;
      case 'error':
        return Colors.error;
      case 'warning':
        return '#FFA500';
      default:
        return Colors.cyan;
    }
  };

  return (
    <BeautifulModal
      visible={visible}
      onClose={onDismiss}
      title={title}
      height={420}
      glowColor={getColor()}
    >
      <View style={styles.alertContent}>
        <View style={styles.floatingIconBadge}>
           <View style={[styles.iconBadgeInner, { borderColor: getColor() + '40' }]}>
             {type === 'success' && <CheckCircle2 color={getColor()} size={32} />}
             {type === 'error' && <AlertTriangle color={getColor()} size={32} />}
             {(type === 'info' || type === 'warning') && <Info color={getColor()} size={32} />}
           </View>
        </View>

        <Text style={styles.alertMessage}>
          {message}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.alertBtn,
            { backgroundColor: getColor(), borderColor: getColor() },
          ]}
          onPress={onDismiss}
        >
           <LinearGradient
               colors={[getColor(), getColor()]}
               style={styles.solidBtnGradient}
            >
              <Text style={styles.solidBtnText}>
                {buttonText.toUpperCase()}
              </Text>
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
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
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
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 100,
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: 'rgba(15, 15, 30, 0.95)',
  },
  topAccentBar: {
    height: 4,
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  contentInner: {
    flex: 1,
    padding: 24,
    paddingTop: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    flex: 1,
    letterSpacing: 3,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    justifyContent: 'center',
  },
  confirmContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingIconBadge: {
    marginTop: -10,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.depth,
  },
  confirmMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
    paddingHorizontal: 10,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
  },
  solidBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  alertContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
    paddingHorizontal: 10,
  },
  alertBtn: {
    width: '100%',
    height: 58,
    borderRadius: 22,
    overflow: 'hidden',
  },
});
