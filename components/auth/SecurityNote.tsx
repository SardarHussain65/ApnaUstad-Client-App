import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Spacing, useTheme, useThemeColors } from '../../constants/Theme';

interface SecurityNoteProps {
  accentColor?: string;
  text?: string;
}

export function SecurityNote({
  accentColor,
  text = 'Your information is protected with secure encrypted access.',
}: SecurityNoteProps) {
  const theme = useTheme();
  const colors = useThemeColors();
  const resolvedAccentColor = accentColor ?? colors.cyan;

  return (
    <View style={styles.container}>
      <ShieldCheck size={15} color={resolvedAccentColor} strokeWidth={2.5} />
      <Text style={[styles.text, { color: theme.colors.text.dim }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.s,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginLeft: 7,
    textAlign: 'center',
  },
});
