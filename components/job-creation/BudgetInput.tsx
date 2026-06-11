import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Banknote } from 'lucide-react-native';
import { SectionLabel, GlassInput, P } from './shared';

interface BudgetInputProps {
  amount: string;
  onChangeAmount: (value: string) => void;
  hideLabel?: boolean;
}

export function BudgetInput({ amount, onChangeAmount, hideLabel = false }: BudgetInputProps) {
  return (
    <View style={hideLabel ? null : styles.section}>
      {!hideLabel && <SectionLabel icon={Banknote} label="YOUR OFFER" color={P.success} badge="Required" />}
      <GlassInput glowColor={amount ? P.success : undefined}>
        <View style={styles.budgetRow}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencySymbol}>PKR</Text>
          </View>
          <TextInput
            style={styles.budgetInput}
            placeholder="Enter your offered amount"
            placeholderTextColor={P.textMuted}
            keyboardType="numeric"
            value={amount}
            onChangeText={onChangeAmount}
          />
        </View>
        <View style={styles.quickBudgetRow}>
          {['500', '1000', '2000'].map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.quickBudgetChip, amount === value && styles.quickBudgetChipActive]}
              onPress={() => onChangeAmount(value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.quickBudgetText, amount === value && styles.quickBudgetTextActive]}>
                Rs. {Number(value).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassInput>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: P.surface,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: P.border,
  },
  currencySymbol: {
    fontSize: 11,
    fontWeight: '800',
    color: P.textSecondary,
    letterSpacing: 1,
  },
  budgetInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: P.textPrimary,
    paddingVertical: 0,
  },
  quickBudgetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 13,
  },
  quickBudgetChip: {
    flex: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  quickBudgetChipActive: {
    borderColor: 'rgba(0, 230, 118, 0.55)',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  quickBudgetText: {
    fontSize: 10,
    color: P.textSecondary,
    fontWeight: '800',
  },
  quickBudgetTextActive: {
    color: P.success,
  },
});
