import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  TouchableOpacity,
  Modal,
  ModalProps,
  Dimensions,
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
import { Colors, Spacing } from '../../constants/Theme';
import { X } from 'lucide-react-native';
import { GlassCard } from '../home/GlassCard';

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
          <GlassCard
            intensity={90}
            glowColor={glowColor}
            style={[styles.modalContent, contentStyle]}
          >
            {/* Header */}
            {title && (
              <View style={styles.modalHeader}>
                <Animated.Text
                  entering={FadeIn.delay(100).duration(300)}
                  style={styles.modalTitle}
                >
                  {title}
                </Animated.Text>
                {showCloseButton && (
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={24} color={Colors.textDim} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Content */}
            <Animated.View
              entering={FadeIn.delay(200).duration(300)}
              style={styles.modalBody}
            >
              {children}
            </Animated.View>
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
      height={280}
      glowColor={confirmColor}
    >
      <View style={styles.confirmContent}>
        <Animated.Text
          entering={FadeIn.delay(100).duration(300)}
          style={styles.confirmMessage}
        >
          {message}
        </Animated.Text>

        <View style={styles.confirmButtons}>
          <TouchableOpacity
            style={[styles.confirmBtn, styles.cancelBtn]}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Animated.Text style={styles.cancelBtnText}>
              {cancelText}
            </Animated.Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: confirmColor + '30', borderColor: confirmColor }]}
            onPress={onConfirm}
            disabled={isLoading}
          >
            <Animated.Text style={[styles.confirmBtnText, { color: confirmColor }]}>
              {isLoading ? 'Loading...' : confirmText}
            </Animated.Text>
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
      height={320}
      glowColor={getColor()}
    >
      <View style={styles.alertContent}>
        <Animated.Text
          entering={FadeIn.delay(100).duration(300)}
          style={styles.alertMessage}
        >
          {message}
        </Animated.Text>

        <TouchableOpacity
          style={[
            styles.alertBtn,
            { backgroundColor: getColor() + '30', borderColor: getColor() },
          ]}
          onPress={onDismiss}
        >
          <Animated.Text style={[styles.alertBtnText, { color: getColor() }]}>
            {buttonText}
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </BeautifulModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '85%',
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 1000,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.l,
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.m,
    paddingBottom: Spacing.m,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  modalBody: {
    flex: 1,
  },
  confirmContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  confirmMessage: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: Spacing.m,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: Spacing.m,
    marginTop: Spacing.m,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDim,
  },
  alertContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  alertMessage: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: Spacing.m,
  },
  alertBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.m,
  },
  alertBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
