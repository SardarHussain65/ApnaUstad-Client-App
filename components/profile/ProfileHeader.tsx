import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../constants/Theme';
import { useIsRTL } from '../../context/LanguageContext';

interface ProfileHeaderProps {
  title: string;
}

export const ProfileHeader = ({ title }: ProfileHeaderProps) => {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isRTL = useIsRTL();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[
          styles.backBtn,
          {
            backgroundColor: theme.colors.surface.subtle,
            borderColor: theme.colors.border.subtle,
            alignItems: 'center',
          },
        ]}
      >
        {isRTL ? (
          <ChevronRight color={theme.colors.text.primary} size={28} />
        ) : (
          <ChevronLeft color={theme.colors.text.primary} size={28} />
        )}
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>{title}</Text>
      <View style={{ width: 44 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    flex: 1,
  },
});
