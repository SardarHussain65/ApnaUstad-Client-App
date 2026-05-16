/**
 * RecentBookingCard.tsx
 * A compact card showing a single booking with status badge and key metadata.
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2, Clock, XCircle, Zap, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { Booking } from '../../hooks';

// ─── Status config ────────────────────────────────────────────────────────────

type StatusConfig = { label: string; color: string; Icon: any };

const STATUS_CONFIG: Record<string, StatusConfig> = {
  completed: { label: 'Completed', color: Colors.success,  Icon: CheckCircle2 },
  pending:   { label: 'Pending',   color: '#FFD700',       Icon: Clock },
  accepted:  { label: 'Accepted',  color: Colors.cyan,     Icon: Zap },
  ongoing:   { label: 'Ongoing',   color: Colors.primary,  Icon: Zap },
  cancelled: { label: 'Cancelled', color: Colors.error,    Icon: XCircle },
};

const STATUS_GRADIENTS: Record<string, [string, string]> = {
  completed: ['#004D26', '#001A0D'], // Deep Green
  accepted:  ['#004D4D', '#001A1A'], // Deep Teal
  ongoing:   ['#004D4D', '#001A1A'], // Deep Teal
  cancelled: ['#4D0000', '#1A0000'], // Deep Red
  pending:   ['#4D3300', '#1A1100'], // Deep Amber
};

// ─── Component ────────────────────────────────────────────────────────────────

interface RecentBookingCardProps {
  booking: Booking;
  onPress: () => void;
}

export const RecentBookingCard = React.memo(
  ({ booking, onPress }: RecentBookingCardProps) => {
    const cfg: StatusConfig =
      STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
    
    const gradient = 
      STATUS_GRADIENTS[booking.status] ?? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'];

    const formattedDate = new Date(booking.scheduledDate).toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric' }
    );

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <LinearGradient
          colors={gradient as any}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {/* Colored left accent bar */}
        <View style={[styles.accent, { backgroundColor: cfg.color }]} />

        <View style={styles.body}>
          {/* Top row: category + status badge */}
          <View style={styles.topRow}>
            <Text style={styles.category} numberOfLines={1}>
              {booking.category}
            </Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: cfg.color + '22',
                  borderColor: cfg.color + '55',
                },
              ]}
            >
              <cfg.Icon size={10} color={cfg.color} strokeWidth={2.5} />
              <Text style={[styles.badgeText, { color: cfg.color }]}>
                {cfg.label}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={1}>
            {booking.description}
          </Text>

          {/* Meta row: date + amount */}
          <View style={styles.metaRow}>
            <Calendar size={11} color={Colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaText}>{formattedDate}</Text>
            <View style={styles.dot} />
            <Text style={styles.metaText}>
              Rs. {booking.totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  accent: {
    width: 3,
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  category: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    letterSpacing: 0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  description: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textDim,
  },
});
