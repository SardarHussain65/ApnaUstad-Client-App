import { MapPin, Target } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GlassInput, P, SectionLabel, useJobCreationPalette } from './shared';
import { useTranslation } from 'react-i18next';

interface LocationSelectorProps {
  address: string;
  latitude: number;
  longitude: number;
  isGettingLocation: boolean;
  onAddressChange: (value: string) => void;
  onGetLiveLocation: () => void;
}

export function LocationSelector({
  address,
  latitude,
  longitude,
  isGettingLocation,
  onAddressChange,
  onGetLiveLocation,
}: LocationSelectorProps) {
  const { t } = useTranslation();
  const palette = useJobCreationPalette();
  return (
    <View style={styles.section}>
      <SectionLabel icon={MapPin} label={t('jobCreation.serviceLocation', 'SERVICE LOCATION')} badge={t('common.required', 'Required')} />
      <GlassInput glowColor={palette.cyan}>
        {/* Coordinates status row */}
        <View style={[styles.coordRow, { borderBottomColor: palette.border }]}>
          <View style={[styles.coordDot, { backgroundColor: palette.cyanMuted, borderColor: palette.cyan }]}>
            <View style={[styles.coordDotInner, { backgroundColor: palette.cyan }]} />
          </View>
          <Text style={[styles.coordText, { color: palette.cyanDim }]}>
            {latitude.toFixed(4)}°N · {longitude.toFixed(4)}°E
          </Text>
          {isGettingLocation && (
            <ActivityIndicator size="small" color={palette.cyan} style={{ marginLeft: 'auto' }} />
          )}
        </View>

        {/* Address input row */}
        <View style={styles.locationRow}>
          <TextInput
            style={[styles.locationInput, { color: palette.textPrimary }]}
            placeholder={t('jobCreation.locationPlaceholder', 'Enter the address where service is needed')}
            placeholderTextColor={palette.textMuted}
            value={address}
            onChangeText={onAddressChange}
            multiline
          />
        </View>

        {/* Refresh button */}
        <TouchableOpacity
          style={[styles.locationAction, { borderTopColor: palette.border, backgroundColor: palette.cyanMuted }]}
          onPress={onGetLiveLocation}
          disabled={isGettingLocation}
          activeOpacity={0.75}
        >
          <Target size={13} color={palette.cyanDim} />
          <Text style={[styles.locationActionText, { color: palette.cyanDim }]}>
            {isGettingLocation ? t('jobCreation.updatingLocation', 'Updating current location...') : t('jobCreation.useCurrentLocation', 'Use my current location')}
          </Text>
        </TouchableOpacity>
      </GlassInput>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
  },
  coordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: P.cyanMuted,
    borderWidth: 1.5,
    borderColor: P.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordDotInner: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: P.cyan },
  coordText: { fontSize: 11, color: P.cyanDim, fontWeight: '700', letterSpacing: 0.5 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: P.textPrimary,
    fontWeight: '500',
    paddingVertical: 2,
    lineHeight: 20,
  },
  locationAction: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: P.border,
    backgroundColor: 'rgba(0,245,255,0.025)',
  },
  locationActionText: { color: P.cyanDim, fontSize: 12, fontWeight: '700' },
});
