import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { alpha, Spacing, useTheme, useThemeColors } from '../../constants/Theme';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import { GlassCard } from '../home/GlassCard';

interface CustomToastProps {
  text1?: string;
  text2?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const CustomSuccessToast: React.FC<CustomToastProps> = ({
  text1,
  text2,
  onPress,
}) => {
  const theme = useTheme();
  const colors = useThemeColors();
  return (
    <GlassCard
      intensity={80}
      glowColor={colors.success}
      style={[styles.toastContainer, { borderColor: alpha(colors.success, 0.14), backgroundColor: theme.colors.toast.background }]}
    >
      <View style={styles.toastContent}>
        <CheckCircle size={20} color={colors.success} />
        <View style={styles.textContainer}>
          <Text style={[styles.toastTitle, { color: colors.success }]}>
            {text1}
          </Text>
          {text2 && <Text style={[styles.toastMessage, { color: theme.colors.toast.message }]}>{text2}</Text>}
        </View>
        <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={18} color={colors.success} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const CustomErrorToast: React.FC<CustomToastProps> = ({
  text1,
  text2,
  onPress,
}) => {
  const theme = useTheme();
  const colors = useThemeColors();
  return (
    <GlassCard
      intensity={80}
      glowColor={colors.error}
      style={[styles.toastContainer, { borderColor: alpha(colors.error, 0.14), backgroundColor: theme.colors.toast.background }]}
    >
      <View style={styles.toastContent}>
        <AlertCircle size={20} color={colors.error} />
        <View style={styles.textContainer}>
          <Text style={[styles.toastTitle, { color: colors.error }]}>
            {text1}
          </Text>
          {text2 && <Text style={[styles.toastMessage, { color: theme.colors.toast.message }]}>{text2}</Text>}
        </View>
        <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const CustomInfoToast: React.FC<CustomToastProps> = ({
  text1,
  text2,
  onPress,
}) => {
  const theme = useTheme();
  const colors = useThemeColors();
  return (
    <GlassCard
      intensity={80}
      glowColor={colors.cyan}
      style={[styles.toastContainer, { borderColor: alpha(colors.cyan, 0.14), backgroundColor: theme.colors.toast.background }]}
    >
      <View style={styles.toastContent}>
        <Info size={20} color={colors.cyan} />
        <View style={styles.textContainer}>
          <Text style={[styles.toastTitle, { color: colors.cyan }]}>
            {text1}
          </Text>
          {text2 && <Text style={[styles.toastMessage, { color: theme.colors.toast.message }]}>{text2}</Text>}
        </View>
        <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={18} color={colors.cyan} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const CustomWarningToast: React.FC<CustomToastProps> = ({
  text1,
  text2,
  onPress,
}) => {
  const theme = useTheme();
  const warning = theme.colors.status.warning;
  return (
    <GlassCard
      intensity={80}
      glowColor={warning}
      style={[styles.toastContainer, { borderColor: alpha(warning, 0.14), backgroundColor: theme.colors.toast.background }]}
    >
      <View style={styles.toastContent}>
        <AlertCircle size={20} color={warning} />
        <View style={styles.textContainer}>
          <Text style={[styles.toastTitle, { color: warning }]}>
            {text1}
          </Text>
          {text2 && <Text style={[styles.toastMessage, { color: theme.colors.toast.message }]}>{text2}</Text>}
        </View>
        <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={18} color={warning} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

export const toastConfig = {
  success: (props: any) => <CustomSuccessToast {...props} />,
  error: (props: any) => <CustomErrorToast {...props} />,
  info: (props: any) => <CustomInfoToast {...props} />,
  warning: (props: any) => <CustomWarningToast {...props} />,
};

export function BeautifulToastConfig() {
  return (
    <Toast
      config={toastConfig}
      visibilityTime={3000}
      autoHide={true}
      topOffset={60}
      bottomOffset={40}
    />
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    width: '90%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.m,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  toastMessage: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
