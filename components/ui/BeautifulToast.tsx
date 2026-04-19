import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { Colors, Typography, Spacing } from '../../constants/Theme';
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
}) => (
  <GlassCard
    intensity={80}
    glowColor={Colors.success}
    style={[styles.toastContainer, styles.successGlow]}
  >
    <View style={styles.toastContent}>
      <CheckCircle size={20} color={Colors.success} />
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, { color: Colors.success }]}>
          {text1}
        </Text>
        {text2 && <Text style={styles.toastMessage}>{text2}</Text>}
      </View>
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <X size={18} color={Colors.success} />
      </TouchableOpacity>
    </View>
  </GlassCard>
);

const CustomErrorToast: React.FC<CustomToastProps> = ({
  text1,
  text2,
  onPress,
}) => (
  <GlassCard
    intensity={80}
    glowColor={Colors.error}
    style={[styles.toastContainer, styles.errorGlow]}
  >
    <View style={styles.toastContent}>
      <AlertCircle size={20} color={Colors.error} />
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, { color: Colors.error }]}>
          {text1}
        </Text>
        {text2 && <Text style={styles.toastMessage}>{text2}</Text>}
      </View>
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <X size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  </GlassCard>
);

const CustomInfoToast: React.FC<CustomToastProps> = ({
  text1,
  text2,
  onPress,
}) => (
  <GlassCard
    intensity={80}
    glowColor={Colors.cyan}
    style={[styles.toastContainer, styles.infoGlow]}
  >
    <View style={styles.toastContent}>
      <Info size={20} color={Colors.cyan} />
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, { color: Colors.cyan }]}>
          {text1}
        </Text>
        {text2 && <Text style={styles.toastMessage}>{text2}</Text>}
      </View>
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <X size={18} color={Colors.cyan} />
      </TouchableOpacity>
    </View>
  </GlassCard>
);

const CustomWarningToast: React.FC<CustomToastProps> = ({
  text1,
  text2,
  onPress,
}) => (
  <GlassCard
    intensity={80}
    glowColor="#FFA500"
    style={[styles.toastContainer, styles.warningGlow]}
  >
    <View style={styles.toastContent}>
      <AlertCircle size={20} color="#FFA500" />
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, { color: '#FFA500' }]}>
          {text1}
        </Text>
        {text2 && <Text style={styles.toastMessage}>{text2}</Text>}
      </View>
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <X size={18} color="#FFA500" />
      </TouchableOpacity>
    </View>
  </GlassCard>
);

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
      topOffset={0}
      bottomOffset={40}
    />
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    marginHorizontal: Spacing.l,
    marginTop: Spacing.m,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderRadius: 16,
    overflow: 'hidden',
  },
  successGlow: {
    borderColor: `${Colors.success}20`,
    borderWidth: 1,
  },
  errorGlow: {
    borderColor: `${Colors.error}20`,
    borderWidth: 1,
  },
  infoGlow: {
    borderColor: `${Colors.cyan}20`,
    borderWidth: 1,
  },
  warningGlow: {
    borderColor: '#FFA50020',
    borderWidth: 1,
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
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
