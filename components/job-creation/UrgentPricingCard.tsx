import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { ShieldCheck, Zap } from 'lucide-react-native';
import { SectionLabel, GlassInput, P, useJobCreationPalette } from './shared';
import { calculateUrgentPrice, getRateForCategory } from '../../constants/UrgentPricing';
import { addAlpha } from '../../utils/colorUtils';
import { useTranslation } from 'react-i18next';

interface UrgentPricingCardProps {
  category: string;
  estimatedHours: number;
  onChangeHours: (hours: number) => void;
  amount: string;
  onChangeAmount: (amount: string) => void;
}

export function UrgentPricingCard({ category, estimatedHours, onChangeHours, amount, onChangeAmount }: UrgentPricingCardProps) {
  const { t } = useTranslation();
  const palette = useJobCreationPalette();
  const rateInfo = getRateForCategory(category);
  const baseRate = rateInfo.baseRatePerHour;
  const minPrice = rateInfo.minimumPrice;
  const fixedPrice = calculateUrgentPrice(category, estimatedHours);

  const incrementHours = () => {
    if (estimatedHours < 8) {
      onChangeHours(estimatedHours + 1);
    }
  };

  const decrementHours = () => {
    if (estimatedHours > 1) {
      onChangeHours(estimatedHours - 1);
    }
  };

  const currentPrice = Number(amount) || 0;
  const isBelowMin = currentPrice < minPrice;
  const isBelowRecommended = currentPrice < fixedPrice;
  const rawCalculation = baseRate * estimatedHours;
  const showMinPriceApplied = rawCalculation < minPrice;

  return (
    <View style={styles.section}>
      <SectionLabel icon={Zap} label={t('jobCreation.urgentFixedPricing', 'URGENT FIXED PRICING')} color={palette.cyan} badge={t('jobCreation.locked', 'Locked')} />
      
      <GlassInput glowColor={isBelowMin ? palette.error : (isBelowRecommended ? palette.orange : palette.cyan)}>
        <View style={styles.container}>
          {/* Header section explaining fixed pricing */}
          <View style={styles.headerRow}>
            <View style={styles.textColumn}>
              <Text style={[styles.titleText, { color: palette.textPrimary }]}>{t('jobCreation.jobDuration', 'Job Duration (Hours)')}</Text>
              <Text style={[styles.subtitleText, { color: palette.textSecondary }]}>
                {t('jobCreation.estimateHoursDesc', 'Estimate the hours needed. Rate is Rs. {{rate}}/hr.', { rate: baseRate })}
              </Text>
            </View>

            {/* Stepper Control */}
            <View style={styles.stepperContainer}>
              <TouchableOpacity 
                style={[styles.stepperButton, estimatedHours <= 1 && styles.stepperButtonDisabled]} 
                onPress={decrementHours}
                disabled={estimatedHours <= 1}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperButtonText}>-</Text>
              </TouchableOpacity>
              
              <View style={styles.hoursDisplay}>
                <Text style={styles.hoursText}>{estimatedHours}</Text>
                <Text style={styles.hoursLabel}>{estimatedHours === 1 ? t('jobCreation.hr', 'Hr') : t('jobCreation.hrs', 'Hrs')}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.stepperButton, estimatedHours >= 8 && styles.stepperButtonDisabled]} 
                onPress={incrementHours}
                disabled={estimatedHours >= 8}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Editable Price Banner */}
          <View style={[
            styles.priceBanner, 
            isBelowMin && styles.priceBannerError, 
            isBelowRecommended && !isBelowMin && styles.priceBannerWarning
          ]}>
            <Zap 
              size={18} 
              color={isBelowMin ? palette.error : (isBelowRecommended ? palette.orange : palette.cyan)} 
              fill={isBelowMin ? palette.error : (isBelowRecommended ? palette.orange : palette.cyan)} 
              style={styles.zapIcon} 
            />
            <View style={styles.bannerTextColumn}>
              <Text style={styles.bannerLabel}>{t('jobCreation.offeredUrgentPrice', 'Your Offered Price')}</Text>
              <View style={styles.inputRow}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.priceInput}
                  value={amount}
                  onChangeText={onChangeAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={palette.textMuted}
                  maxLength={6}
                />
              </View>
            </View>
          </View>

          {/* Feedback messages */}
          {isBelowMin ? (
            <Text style={[styles.feedbackText, { color: palette.error }]}>
              {t('jobCreation.minPriceRequired', 'Minimum price required is Rs. {{price}}', { price: minPrice })}
            </Text>
          ) : isBelowRecommended ? (
            <Text style={[styles.feedbackText, { color: palette.orange }]}>
              {t('jobCreation.lowOfferWarning', 'Offer is below the recommended estimate. Ustads might take longer to accept.')}
            </Text>
          ) : currentPrice > fixedPrice ? (
            <Text style={[styles.feedbackText, { color: palette.success }]}>
              {t('jobCreation.highOfferTip', 'Higher offers attract Ustads faster! 🚀')}
            </Text>
          ) : null}

          {/* Recommended Estimate Display */}
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: palette.textSecondary }]}>{t('jobCreation.recommendedEstimate', 'Recommended Estimate:')}</Text>
            <Text style={[styles.breakdownValue, { color: palette.cyan }]}>
              {t('common.rupeesFormat', 'Rs. {{amount}}', { amount: fixedPrice.toLocaleString() })}
            </Text>
          </View>

          {showMinPriceApplied && (
            <View style={styles.minPriceAlert}>
              <ShieldCheck size={12} color={palette.success} />
              <Text style={[styles.minPriceAlertText, { color: palette.textSecondary }]}>
                {t('jobCreation.minPriceApplied', 'Platform minimum booking rate (Rs. {{price}}) applied.', { price: minPrice })}
              </Text>
            </View>
          )}

          <View style={[styles.infoBox, { borderColor: palette.border }]}>
            <Text style={[styles.infoText, { color: palette.textSecondary }]}>
              {t('jobCreation.urgentFixedPriceInfo', '⚡ Clients and Ustads are matched instantly. The price is locked before posting and cannot be negotiated. The first Ustad to accept is hired instantly.')}
            </Text>
          </View>
        </View>
      </GlassInput>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  textColumn: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: P.textPrimary,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 11,
    color: P.textSecondary,
    lineHeight: 15,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    padding: 4,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: P.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: P.borderMedium,
  },
  stepperButtonDisabled: {
    opacity: 0.35,
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: P.textPrimary,
  },
  hoursDisplay: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursText: {
    fontSize: 16,
    fontWeight: '800',
    color: P.cyan,
  },
  hoursLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: P.textSecondary,
    textTransform: 'uppercase',
    marginTop: -2,
  },
  priceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: addAlpha(P.cyan, '10'),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: addAlpha(P.cyan, '25'),
    padding: 14,
    marginBottom: 12,
  },
  zapIcon: {
    marginRight: 12,
  },
  bannerTextColumn: {
    flex: 1,
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginRight: 6,
  },
  priceInput: {
    fontSize: 22,
    fontWeight: '900',
    color: P.cyan,
    flex: 1,
    padding: 0,
  },
  priceBannerWarning: {
    borderColor: addAlpha(P.orange, '35'),
    backgroundColor: addAlpha(P.orange, '10'),
  },
  priceBannerError: {
    borderColor: addAlpha(P.error, '35'),
    backgroundColor: addAlpha(P.error, '10'),
  },
  feedbackText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: P.textSecondary,
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: '700',
    color: P.textPrimary,
  },
  minPriceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  minPriceAlertText: {
    fontSize: 10,
    fontWeight: '700',
    color: P.success,
  },
  infoBox: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: P.border,
  },
  infoText: {
    fontSize: 10,
    color: P.textSecondary,
    lineHeight: 14,
  },
});
