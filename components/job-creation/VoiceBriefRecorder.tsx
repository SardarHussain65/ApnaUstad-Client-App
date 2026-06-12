import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Mic, Square, Trash2 } from 'lucide-react-native';
import { SectionLabel, GlassInput, P } from './shared';
import { useTranslation } from 'react-i18next';

interface VoiceBriefRecorderProps {
  isRecording: boolean;
  durationMillis: number;
  voiceNoteUri: string | null;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onRemoveRecord: () => void;
  hideLabel?: boolean;
}

const formatVoiceDuration = (durationMillis: number) => {
  const seconds = Math.max(0, Math.floor(durationMillis / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export function VoiceBriefRecorder({
  isRecording,
  durationMillis,
  voiceNoteUri,
  onStartRecord,
  onStopRecord,
  onRemoveRecord,
  hideLabel = false,
}: VoiceBriefRecorderProps) {
  const { t } = useTranslation();
  return (
    <View style={hideLabel ? null : styles.section}>
      {!hideLabel && <SectionLabel icon={Mic} label={t('jobCreation.voiceBrief', 'VOICE BRIEF')} color={P.orange} badge={t('jobCreation.voiceBriefBadge', 'Optional · Max 60s')} />}
      <GlassInput glowColor={isRecording || voiceNoteUri ? P.orange : undefined}>
        <View style={styles.voiceNoteRow}>
          <View style={[styles.voiceNoteIcon, isRecording && styles.voiceNoteIconRecording]}>
            <Mic size={19} color={P.orange} strokeWidth={2.2} />
          </View>
          <View style={styles.voiceNoteCopy}>
            <Text style={styles.voiceNoteTitle}>
              {isRecording ? t('jobCreation.recordingExplanation', 'Recording job explanation') : voiceNoteUri ? t('jobCreation.voiceBriefAttached', 'Voice brief attached') : t('jobCreation.explainWorkVoice', 'Explain the work in your own words')}
            </Text>
            <Text style={styles.voiceNoteSubtitle}>
              {isRecording
                ? `${formatVoiceDuration(durationMillis)} / 1:00`
                : voiceNoteUri
                  ? t('jobCreation.workersListenBefore', 'Workers can listen before they respond')
                  : t('jobCreation.usefulExplainVoice', 'Useful when the issue is easier to explain than type')}
            </Text>
          </View>
          {isRecording ? (
            <TouchableOpacity style={styles.voiceNoteAction} onPress={onStopRecord}>
              <Square size={15} color="#001014" fill="#001014" />
            </TouchableOpacity>
          ) : voiceNoteUri ? (
            <TouchableOpacity style={styles.voiceNoteRemove} onPress={onRemoveRecord}>
              <Trash2 size={16} color="#FF6B63" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.voiceNoteAction} onPress={onStartRecord}>
              <Mic size={16} color="#001014" strokeWidth={2.7} />
            </TouchableOpacity>
          )}
        </View>
      </GlassInput>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  voiceNoteRow: {
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceNoteIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.30)',
  },
  voiceNoteIconRecording: {
    backgroundColor: 'rgba(255,59,48,0.16)',
    borderColor: 'rgba(255,59,48,0.42)',
  },
  voiceNoteCopy: {
    flex: 1,
    gap: 4,
  },
  voiceNoteTitle: {
    color: P.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  voiceNoteSubtitle: {
    color: P.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  voiceNoteAction: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.orange,
  },
  voiceNoteRemove: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.24)',
  },
});
