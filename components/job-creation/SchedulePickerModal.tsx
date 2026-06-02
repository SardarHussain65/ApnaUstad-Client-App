import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChevronUp, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { P } from './shared';

interface SchedulePickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (date: Date, time: string) => void;
  initialDate: Date;
  initialTime: string;
}

export function SchedulePickerModal({
  visible,
  onDismiss,
  onSave,
  initialDate,
  initialTime,
}: SchedulePickerModalProps) {
  const [tempDate, setTempDate] = useState<Date>(initialDate);
  const [tempTime, setTempTime] = useState<string>(initialTime);

  useEffect(() => {
    if (visible) {
      setTempDate(initialDate);
      setTempTime(initialTime);
    }
  }, [visible, initialDate, initialTime]);

  const getNext14Days = useCallback(() => {
    const days = [];
    const start = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const validateSchedule = useCallback((date: Date, timeStr: string): boolean => {
    const [h, m] = timeStr.split(':').map(Number);
    const check = new Date(date);
    check.setHours(h, m, 0, 0);
    const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
    return check.getTime() >= oneHourLater.getTime();
  }, []);

  const handleDateSelect = (day: Date) => {
    setTempDate(day);
    void Haptics.selectionAsync();
  };

  const handleAdjustHour = (amount: number) => {
    const [h, m] = tempTime.split(':').map(Number);
    const nextH = (h + amount + 24) % 24;
    setTempTime(`${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAdjustMinute = (amount: number) => {
    const [h, m] = tempTime.split(':').map(Number);
    const nextM = (m + amount + 60) % 60;
    setTempTime(`${String(h).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isScheduleValid = validateSchedule(tempDate, tempTime);

  const handleSave = () => {
    if (isScheduleValid) {
      onSave(tempDate, tempTime);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <BlurView intensity={35} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.container}>
          <Text style={styles.title}>Schedule Visit</Text>
          <Text style={styles.subtitle}>Choose a date and time for the service</Text>

          {/* Date Horizontal Picker */}
          <Text style={styles.sectionTitle}>Select Date</Text>
          <View style={styles.dateScrollWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
              {getNext14Days().map((day, idx) => {
                const isSelected = day.toDateString() === tempDate.toDateString();
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dateCard,
                      isSelected && { borderColor: P.orange, backgroundColor: 'rgba(255, 107, 0, 0.15)' },
                    ]}
                    onPress={() => handleDateSelect(day)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dateDayText, isSelected && { color: P.orange }]}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dateNumText, isSelected && { color: P.orange }]}>
                      {day.getDate()}
                    </Text>
                    <Text style={styles.dateMonthText}>
                      {day.toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Time Picker Block */}
          <Text style={styles.sectionTitle}>Adjust Time (24h)</Text>
          <View style={styles.timeRow}>
            {/* Hours Column */}
            <View style={styles.timeCol}>
              <TouchableOpacity style={styles.timeBtn} onPress={() => handleAdjustHour(1)} activeOpacity={0.7}>
                <ChevronUp size={22} color={P.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.timeVal}>{tempTime.split(':')[0]}</Text>
              <TouchableOpacity style={styles.timeBtn} onPress={() => handleAdjustHour(-1)} activeOpacity={0.7}>
                <ChevronDown size={22} color={P.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={styles.timeColon}>:</Text>

            {/* Minutes Column */}
            <View style={styles.timeCol}>
              <TouchableOpacity style={styles.timeBtn} onPress={() => handleAdjustMinute(5)} activeOpacity={0.7}>
                <ChevronUp size={22} color={P.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.timeVal}>{tempTime.split(':')[1]}</Text>
              <TouchableOpacity style={styles.timeBtn} onPress={() => handleAdjustMinute(-5)} activeOpacity={0.7}>
                <ChevronDown size={22} color={P.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Validation Status Indicator */}
          <View style={styles.statusContainer}>
            {isScheduleValid ? (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(0, 230, 118, 0.08)', borderColor: 'rgba(0, 230, 118, 0.2)' }]}>
                <CheckCircle2 size={13} color={P.success} />
                <Text style={[styles.statusText, { color: P.success }]}>SCHEDULE IS AVAILABLE</Text>
              </View>
            ) : (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(255, 107, 0, 0.08)', borderColor: 'rgba(255, 107, 0, 0.2)' }]}>
                <AlertCircle size={13} color={P.orange} />
                <Text style={[styles.statusText, { color: P.orange }]}>CHOOSE AT LEAST 1 HOUR FROM NOW</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={onDismiss}
              activeOpacity={0.75}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnSave,
                !isScheduleValid && { opacity: 0.4 },
              ]}
              disabled={!isScheduleValid}
              onPress={handleSave}
              activeOpacity={0.75}
            >
              <Text style={styles.btnSaveText}>Lock Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    width: '90%',
    backgroundColor: '#0c0f1a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    alignItems: 'center',
  },
  title: { fontSize: 18, color: '#fff', fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  subtitle: { fontSize: 12, color: P.textSecondary, fontWeight: '500', marginBottom: 18 },
  sectionTitle: { fontSize: 11, color: P.textSecondary, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, alignSelf: 'flex-start' },
  dateScrollWrapper: { width: '100%', marginBottom: 20, height: 72 },
  dateScroll: { gap: 10 },
  dateCard: {
    width: 58,
    height: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.surfaceRaised,
    gap: 3,
  },
  dateDayText: { fontSize: 9, color: P.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  dateNumText: { fontSize: 16, color: '#fff', fontWeight: '900' },
  dateMonthText: { fontSize: 9, color: P.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20 },
  timeCol: { alignItems: 'center', width: 60 },
  timeBtn: { height: 32, width: 32, alignItems: 'center', justifyContent: 'center' },
  timeVal: { fontSize: 24, color: '#fff', fontWeight: '900', marginVertical: 4 },
  timeColon: { fontSize: 24, color: P.textSecondary, fontWeight: '900', paddingBottom: 6 },
  statusContainer: { width: '100%', marginBottom: 20, alignItems: 'center' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  actionRow: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 4 },
  btn: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: P.border },
  btnCancelText: { fontSize: 13, color: P.textSecondary, fontWeight: '800' },
  btnSave: { backgroundColor: P.orange },
  btnSaveText: { fontSize: 13, color: '#001014', fontWeight: '900' },
});
