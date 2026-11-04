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
  withTiming,
} from 'react-native-reanimated';
import { alpha, useTheme, useThemeColors } from '../../constants/Theme';
import { X, CheckCircle2, AlertTriangle, Info, HelpCircle } from 'lucide-react-native';
import { GlassCard } from '../home/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_WIDTH < 380;

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
  glowColor,
  containerStyle,
  contentStyle,
  icon,
  ...modalProps
}: BeautifulModalProps) {
  const theme = useTheme();
  const resolvedGlowColor = glowColor ?? theme.colors.brand.primary;
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
      scale.value = withTiming(1, { duration: 220 });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      scale.value = withTiming(0.92, { duration: 160 });
      opacity.value = withTiming(0, { duration: 140 });
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
        style={[styles.backdrop, { backgroundColor: theme.colors.modal.backdrop }]}
      >
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              height: numericHeight,
              borderColor: theme.colors.modal.border,
              shadowColor: theme.colors.shadow.color,
              shadowOpacity: theme.id === 'light' ? 0.14 : 0.5,
            },
            containerStyle,
            animatedStyle,
          ]}
        >
          <View style={[styles.modalGlow, { backgroundColor: alpha(resolvedGlowColor, theme.id === 'current' ? 0.12 : 0.08) }]} />

          <GlassCard
            intensity={Platform.OS === 'ios' ? 95 : 100}
            glowColor={resolvedGlowColor}
            style={[styles.modalContent, { backgroundColor: theme.colors.modal.card }, contentStyle, { overflow: 'visible' }]}
            contentStyle={{ flex: 1 }}
            padding={0}
          >
            <LinearGradient
              colors={[resolvedGlowColor, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.topAccentBar}
            />

            {icon && (
              <View style={styles.floatingIconBadge}>
                 <View
                   style={[
                     styles.iconBadgeInner,
                     {
                       backgroundColor: theme.colors.surface.raised,
                       borderColor: alpha(resolvedGlowColor, 0.28),
                       shadowColor: theme.colors.shadow.color,
                       shadowOpacity: theme.id === 'light' ? 0.12 : 0.5,
                     },
                   ]}
                 >
                   {icon}
                 </View>
              </View>
            )}

            <View style={styles.contentInner}>
              {title && (
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>{title.toUpperCase()}</Text>
                  {showCloseButton && (
                    <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.modal.closeBackground }]}>
                      <X size={20} color={theme.colors.text.primary} />
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
  confirmColor,
  isLoading = false,
}: ConfirmModalProps) {
  const theme = useTheme();
  const colors = useThemeColors();
  const resolvedConfirmColor = confirmColor ?? theme.colors.brand.primary;
  const isConfirmLong = (confirmText?.length ?? 0) > 10;
  const confirmTextColor =
    resolvedConfirmColor === colors.error || resolvedConfirmColor === colors.success
      ? '#FFFFFF'
      : theme.colors.button.primaryText;

  return (
    <BeautifulModal
      visible={visible}
      onClose={onCancel}
      title={title}
      height={IS_SMALL_DEVICE ? 390 : 380}
      glowColor={resolvedConfirmColor}
      icon={<HelpCircle color={resolvedConfirmColor} size={32} />}
    >
      <View style={styles.modalBodyContent}>
        <Text style={[styles.modalMessage, { color: theme.colors.text.primary }]}>{message}</Text>

        <View style={styles.confirmButtons}>
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              isConfirmLong && styles.cancelBtnCompact,
              {
                backgroundColor: theme.colors.surface.subtle,
                borderColor: theme.colors.border.subtle,
              },
            ]}
            onPress={onCancel}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.cancelBtnText, { color: theme.colors.text.muted }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {cancelText.toUpperCase()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmBtn,
              isConfirmLong && styles.confirmBtnExpanded,
              { backgroundColor: resolvedConfirmColor, borderColor: resolvedConfirmColor },
            ]}
            onPress={onConfirm}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[resolvedConfirmColor, resolvedConfirmColor]} style={styles.solidBtnGradient}>
              <Text
                style={[styles.solidBtnText, { color: confirmTextColor }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
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
  const theme = useTheme();
  const colors = useThemeColors();
  const getColor = () => {
    switch (type) {
      case 'success': return colors.success;
      case 'error': return colors.error;
      case 'warning': return theme.colors.status.warning;
      default: return colors.cyan;
    }
  };

  const getButtonTextColor = () => {
    if (type === 'error' || type === 'success') {
      return '#FFFFFF';
    }
    return theme.id === 'light' ? '#FFFFFF' : '#001014';
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 color={getColor()} size={32} />;
      case 'error': return <AlertTriangle color={getColor()} size={32} />;
      default: return <Info color={getColor()} size={32} />;
    }
  };

  const safeButtonText = (
    buttonText && typeof buttonText === 'string' && buttonText.trim().length > 0
      ? buttonText
      : 'OK'
  ).toUpperCase();

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
        <Text style={[styles.modalMessage, { color: theme.colors.text.primary }]}>{message}</Text>
        <TouchableOpacity
          style={[styles.alertBtn, { backgroundColor: getColor(), borderColor: getColor() }]}
          onPress={onDismiss}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[getColor(), getColor()]} style={styles.solidBtnGradient}>
            <Text
              style={[styles.solidBtnText, { color: getButtonTextColor() }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {safeButtonText}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: { ...StyleSheet.absoluteFillObject },
  modalContainer: {
    width: IS_SMALL_DEVICE ? '92%' : '88%',
    maxWidth: 420,
    borderRadius: 28,
    zIndex: 1000,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 20 },
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
    borderRadius: 28,
  },
  topAccentBar: {
    height: 4, width: '100%', position: 'absolute', top: 0, zIndex: 2,
  },
  contentInner: {
    flex: 1,
    padding: IS_SMALL_DEVICE ? 18 : 24,
    paddingTop: 52,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, zIndex: 10, height: 30,
  },
  modalTitle: {
    fontSize: 14, fontWeight: '900',
    letterSpacing: 1.5, textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute', right: -6, top: -5,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  floatingIconBadge: {
    position: 'absolute', top: -45, alignSelf: 'center', zIndex: 100,
  },
  iconBadgeInner: {
    width: 86, height: 86, borderRadius: 43,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15, elevation: 20,
  },
  modalMessage: {
    fontSize: 15, lineHeight: 22,
    textAlign: 'center',
    marginBottom: IS_SMALL_DEVICE ? 24 : 32,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmBtnExpanded: {
    flex: 1.35,
  },
  solidBtnGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  solidBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cancelBtnCompact: {
    flex: 0.75,
    maxWidth: 110,
    minWidth: 76,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    width: '100%',
  },
  alertBtn: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    overflow: 'hidden',
  },
});
