import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { XCircle, Copy, Upload, Smartphone, Landmark, Banknote, FileImage } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { alpha, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { BlurView } from 'expo-blur';

interface WalletPaymentMethod {
  method: 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'other';
  label: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  instructions?: string;
  isConfigured?: boolean;
}

interface RechargeModalProps {
  visible: boolean;
  onDismiss: () => void;
  amount: string;
  onAmountChange: (val: string) => void;
  paymentMethods: WalletPaymentMethod[];
  selectedMethodKey: WalletPaymentMethod['method'] | null;
  onSelectMethod: (key: WalletPaymentMethod['method']) => void;
  proofImageUri: string | null;
  onPickProofImage: () => void;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCopy: (label: string, value?: string) => void;
}

const METHOD_ICON: Record<string, any> = {
  easypaisa: Smartphone,
  jazzcash: Smartphone,
  bank_transfer: Landmark,
  other: Banknote,
};

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (label: string, value?: string) => void;
}) {
  const theme = useTheme();
  const colors = useThemeColors();
  return (
    <View style={copyStyles.row}>
      <View style={{ flex: 1 }}>
        <Text style={copyStyles.label}>{label}</Text>
        <Text style={copyStyles.value}>{value}</Text>
      </View>
      <TouchableOpacity style={copyStyles.btn} onPress={() => onCopy(label, value)}>
        <Copy size={15} color={colors.cyan} />
      </TouchableOpacity>
    </View>
  );
}

const copyStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '800',
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
  },
});

export function RechargeModal({
  visible,
  onDismiss,
  amount,
  onAmountChange,
  paymentMethods,
  selectedMethodKey,
  onSelectMethod,
  proofImageUri,
  onPickProofImage,
  isSubmitting,
  onConfirm,
  onCopy,
}: RechargeModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const selectedMethod = paymentMethods.find((m) => m.method === selectedMethodKey) || paymentMethods[0];
  const selectedMethodIsConfigured = selectedMethod ? selectedMethod.isConfigured !== false : false;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <BlurView intensity={35} style={StyleSheet.absoluteFillObject} tint="dark" />
        <View style={[styles.container, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, typography.threeD, { color: theme.colors.text.primary }]}>{t('wallet.prepaidTopUp')}</Text>
            <TouchableOpacity onPress={onDismiss}>
              <XCircle size={22} color={theme.colors.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Amount input */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.muted }]}>{t('wallet.enterAmountPkr')}</Text>
            <TextInput
              style={[styles.amountInput, { backgroundColor: theme.colors.input.background, borderColor: theme.colors.input.border, color: theme.colors.input.text }]}
              placeholder="e.g. 1000"
              placeholderTextColor={theme.colors.input.placeholder}
              keyboardType="numeric"
              value={amount}
              onChangeText={onAmountChange}
            />
            {/* Quick selectors */}
            <View style={styles.quickSelectRow}>
              {[500, 1000, 2000, 5000].map((val) => (
                <TouchableOpacity
                   key={val}
                   onPress={() => onAmountChange(val.toString())}
                   style={[styles.quickSelectChip, amount === val.toString() && styles.quickSelectChipActive, { borderColor: amount === val.toString() ? alpha(colors.cyan, 0.8) : theme.colors.border.subtle, backgroundColor: amount === val.toString() ? alpha(colors.cyan, 0.08) : theme.colors.surface.subtle }]}
                >
                  <Text style={[styles.quickSelectText, amount === val.toString() && styles.quickSelectTextActive, { color: amount === val.toString() ? colors.cyan : theme.colors.text.muted }]}>
                    +{val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.muted }]}>{t('wallet.selectMethod')}</Text>
            <View style={styles.methodList}>
              {paymentMethods.map((method) => {
                const isSelected = selectedMethodKey === method.method || (!selectedMethodKey && paymentMethods[0]?.method === method.method);
                const IconComponent = METHOD_ICON[method.method] || Banknote;
                return (
                  <TouchableOpacity
                    key={method.method}
                    onPress={() => onSelectMethod(method.method)}
                    style={[styles.methodCard, isSelected && styles.methodCardActive, isSelected && { borderColor: alpha(colors.cyan, 0.8), backgroundColor: alpha(colors.cyan, 0.06) }, !isSelected && { borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.surface.subtle }]}
                  >
                    <IconComponent size={20} color={isSelected ? colors.cyan : theme.colors.text.muted} />
                    <Text style={[styles.methodLabel, isSelected && styles.methodLabelActive, { color: isSelected ? colors.cyan : theme.colors.text.muted }]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Dynamic Instructions */}
          {selectedMethod && (
            <View style={styles.instructionsBox}>
              <Text style={[styles.instructionsTitle, { color: colors.cyan }]}>{t('wallet.transferInstructions')}</Text>
              <Text style={[styles.instructionsText, { color: theme.colors.text.muted }]}>
                {selectedMethod.instructions || t('wallet.transferFallback', { method: selectedMethod.label })}
              </Text>

              <View style={[styles.accountDetails, { gap: 2 }]}>
                {selectedMethod.bankName && (
                  <CopyRow label={t('wallet.bankName')} value={selectedMethod.bankName} onCopy={onCopy} />
                )}
                {selectedMethod.accountNumber && (
                  <CopyRow label={t('wallet.accountNumber')} value={selectedMethod.accountNumber} onCopy={onCopy} />
                )}
                {selectedMethod.accountName && (
                  <CopyRow label={t('wallet.accountName')} value={selectedMethod.accountName} onCopy={onCopy} />
                )}
              </View>
            </View>
          )}

          {/* Proof upload */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.muted }]}>{t('wallet.depositScreenshot')}</Text>
            {proofImageUri ? (
              <View style={styles.proofPreviewWrapper}>
                <Image source={{ uri: proofImageUri }} style={styles.proofPreview} />
                <TouchableOpacity style={styles.changeProofBtn} onPress={onPickProofImage}>
                  <Upload size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.changeProofText}>{t('wallet.replaceScreenshot')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBtn} onPress={onPickProofImage}>
                <FileImage size={24} color={theme.colors.text.muted} style={{ marginBottom: 6 }} />
                <Text style={[styles.uploadText, { color: theme.colors.text.muted }]}>{t('wallet.selectScreenshot')}</Text>
                <Text style={[styles.uploadSub, { color: theme.colors.text.muted }]}>{t('wallet.supportedReceipts')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: colors.cyan },
              (!amount || !proofImageUri || !selectedMethodIsConfigured || isSubmitting) && styles.confirmBtnDisabled,
            ]}
            onPress={onConfirm}
            disabled={!amount || !proofImageUri || !selectedMethodIsConfigured || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#001014" />
            ) : (
              <Text style={styles.confirmBtnText}>{t('wallet.submitProof')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing.m,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  amountInput: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickSelectRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickSelectChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickSelectChipActive: {},
  quickSelectText: { fontSize: 11, fontWeight: '800' },
  quickSelectTextActive: {},
  methodList: { flexDirection: 'row', gap: 8 },
  methodCard: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  methodCardActive: {},
  methodLabel: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  methodLabelActive: {},
  instructionsBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  instructionsTitle: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  instructionsText: { fontSize: 11, lineHeight: 16, fontWeight: '600', marginBottom: 10 },
  accountDetails: {},
  proofPreviewWrapper: {
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  proofPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeProofBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeProofText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  uploadBtn: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.01)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: { fontSize: 12, fontWeight: '800' },
  uploadSub: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  confirmBtn: {
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: '#001014', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
});