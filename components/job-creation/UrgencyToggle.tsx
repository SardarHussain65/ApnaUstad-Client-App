import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Zap, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

type Urgency = 'instant' | 'scheduled';

interface UrgencyToggleProps {
  urgency: Urgency;
  onChange: (value: Urgency) => void;
  colors: {
    cyan: string;
    cyanMuted: string;
    orange: string;
    orangeMuted: string;
    surfaceRaised: string;
    border: string;
    textMuted: string;
  };
}

export function UrgencyToggle({ urgency, onChange, colors }: UrgencyToggleProps) {
  const { t } = useTranslation();
  const isInstant = urgency === 'instant';

  const handleSelect = (mode: Urgency) => {
    onChange(mode);
    void Haptics.selectionAsync();
  };

  return (
    <View style={styles.toggleContainer}>
      <View style={[styles.toggleTrack, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <View
          style={[
            styles.toggleHighlight,
            {
              left: isInstant ? 4 : '50%',
              backgroundColor: isInstant ? colors.cyanMuted : colors.orangeMuted,
              borderColor: isInstant ? colors.cyan + '50' : colors.orange + '50',
            },
          ]}
        />
        <TouchableOpacity
          style={styles.toggleOption}
          onPress={() => handleSelect('instant')}
          activeOpacity={0.7}
        >
          <Zap size={13} color={isInstant ? colors.cyan : colors.textMuted} strokeWidth={2.5} />
          <Text style={[styles.toggleText, { color: colors.textMuted }, isInstant && { color: colors.cyan }]}>{t('jobCreation.urgentNow', 'Urgent (Now)')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toggleOption}
          onPress={() => handleSelect('scheduled')}
          activeOpacity={0.7}
        >
          <Calendar size={13} color={!isInstant ? colors.orange : colors.textMuted} strokeWidth={2.5} />
          <Text style={[styles.toggleText, { color: colors.textMuted }, !isInstant && { color: colors.orange }]}>{t('jobCreation.bookLater', 'Book Later')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleContainer: { marginBottom: 18 },
  toggleTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    position: 'relative',
    height: 46,
  },
  toggleHighlight: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    borderRadius: 11,
    borderWidth: 1,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
