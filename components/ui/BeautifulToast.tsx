import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { alpha, BorderRadius, useTheme, useThemeColors } from '../../constants/Theme';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';
import { isUrduLanguage } from '../../i18n';

interface CustomToastProps {
  text1?: string;
  text2?: string;
  onPress?: () => void;
  hide?: () => void;
  text1Style?: StyleProp<TextStyle>;
  text2Style?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

interface ThemedToastProps extends CustomToastProps {
  type: 'success' | 'error' | 'info' | 'warning';
}

const ThemedToastItem: React.FC<ThemedToastProps> = ({
  type,
  text1,
  text2,
  onPress,
  hide,
  text1Style,
  text2Style,
  style,
}) => {
  const theme = useTheme();
  const colors = useThemeColors();
  const { i18n } = useTranslation();
  const isRTL = isUrduLanguage(i18n.language);

  const config = React.useMemo(() => {
    switch (type) {
      case 'success':
        return {
          color: colors.success || theme.colors.status.success,
          Icon: CheckCircle2,
        };
      case 'error':
        return {
          color: colors.error || theme.colors.status.error,
          Icon: AlertCircle,
        };
      case 'warning':
        return {
          color: theme.colors.status.warning || colors.orange,
          Icon: AlertTriangle,
        };
      case 'info':
      default:
        return {
          color: colors.cyan || theme.colors.status.info || theme.colors.brand.primary,
          Icon: Info,
        };
    }
  }, [type, colors, theme]);

  const handleDismiss = () => {
    if (hide) {
      hide();
    } else {
      Toast.hide();
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      handleDismiss();
    }
  };

  const { Icon, color: accentColor } = config;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handlePress}
      style={[
        styles.toastContainer,
        {
          backgroundColor: theme.colors.toast.background,
          borderColor: alpha(accentColor, theme.id === 'light' ? 0.35 : 0.45),
          flexDirection: isRTL ? 'row-reverse' : 'row',
          shadowColor: theme.id === 'light' ? '#0F172A' : '#000000',
        },
        style,
      ]}
    >
      {/* Icon Badge */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: alpha(accentColor, theme.id === 'light' ? 0.12 : 0.2),
            borderColor: alpha(accentColor, 0.3),
          },
        ]}
      >
        <Icon size={18} color={accentColor} strokeWidth={2.4} />
      </View>

      {/* Text Container */}
      <View
        style={[
          styles.textContainer,
          isRTL
            ? { alignItems: 'flex-end', marginRight: 12, marginLeft: 6 }
            : { alignItems: 'flex-start', marginLeft: 12, marginRight: 6 },
        ]}
      >
        {text1 ? (
          <Text
            style={[
              styles.toastTitle,
              {
                color: theme.colors.toast.title || theme.colors.text.primary,
                textAlign: isRTL ? 'right' : 'left',
              },
              text1Style,
            ]}
            numberOfLines={1}
          >
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            style={[
              styles.toastMessage,
              {
                color: theme.colors.toast.message || theme.colors.text.muted,
                textAlign: isRTL ? 'right' : 'left',
              },
              text2Style,
            ]}
            numberOfLines={2}
          >
            {text2}
          </Text>
        ) : null}
      </View>

      {/* Close button */}
      <TouchableOpacity
        onPress={handleDismiss}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close notification"
      >
        <X size={16} color={theme.colors.text.muted} strokeWidth={2} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const CustomSuccessToast = (props: any) => <ThemedToastItem type="success" {...props} />;
export const CustomErrorToast = (props: any) => <ThemedToastItem type="error" {...props} />;
export const CustomInfoToast = (props: any) => <ThemedToastItem type="info" {...props} />;
export const CustomWarningToast = (props: any) => <ThemedToastItem type="warning" {...props} />;

export const toastConfig = {
  success: (props: any) => <ThemedToastItem type="success" {...props} />,
  error: (props: any) => <ThemedToastItem type="error" {...props} />,
  info: (props: any) => <ThemedToastItem type="info" {...props} />,
  warning: (props: any) => <ThemedToastItem type="warning" {...props} />,
};

export function BeautifulToastConfig() {
  const insets = useSafeAreaInsets();
  const topOffset = Math.max(insets.top + 8, Platform.OS === 'ios' ? 54 : 44);

  return (
    <Toast
      config={toastConfig}
      visibilityTime={3500}
      autoHide={true}
      topOffset={topOffset}
      bottomOffset={Math.max(insets.bottom + 16, 40)}
    />
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    width: '92%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  toastMessage: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
