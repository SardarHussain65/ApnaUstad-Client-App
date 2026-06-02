import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Colors, Spacing } from '../../constants/Theme';

interface SecurityNoteProps {
  accentColor?: string;
  text?: string;
}

export function SecurityNote({
  accentColor = Colors.cyan,
  text = 'Your information is protected with secure encrypted access.',
}: SecurityNoteProps) {
  return (
    <View style={styles.container}>
      <ShieldCheck size={15} color={accentColor} strokeWidth={2.5} />
      <Text style={styles.text}>{text}</Text>
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
    color: 'rgba(255,255,255,0.38)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginLeft: 7,
    textAlign: 'center',
  },
});
