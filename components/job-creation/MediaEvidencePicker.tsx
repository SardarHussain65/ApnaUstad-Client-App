import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Camera, PlayCircle, X, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SectionLabel, P } from './shared';

type EvidenceAsset = { uri: string; type: 'image' | 'video' };

interface MediaEvidencePickerProps {
  selectedMedia: EvidenceAsset[];
  onPickMedia: () => void;
  onRemoveMedia: (index: number) => void;
  onClearAll: () => void;
  hideLabel?: boolean;
}

export function MediaEvidencePicker({
  selectedMedia,
  onPickMedia,
  onRemoveMedia,
  onClearAll,
  hideLabel = false,
}: MediaEvidencePickerProps) {
  const selectedImageCount = selectedMedia.filter((asset) => asset.type === 'image').length;
  const selectedVideoCount = selectedMedia.filter((asset) => asset.type === 'video').length;

  const handleRemove = (idx: number) => {
    onRemoveMedia(idx);
    void Haptics.selectionAsync();
  };

  return (
    <View style={hideLabel ? null : styles.section}>
      {!hideLabel && <SectionLabel icon={Camera} label="PHOTOS OR VIDEO" color={P.purple} badge="Optional" />}

      {selectedMedia.length === 0 ? (
        <TouchableOpacity activeOpacity={0.75} onPress={onPickMedia} style={styles.dropzone}>
          {/* Glow scan line */}
          <View style={styles.scanLine} />
          <View style={styles.dropzoneContent}>
            <View style={[styles.cameraIconWrap, { borderColor: P.purple + '40', backgroundColor: P.purpleMuted }]}>
              <Camera size={26} color={P.purple} strokeWidth={1.5} />
            </View>
            <Text style={styles.dropzoneTitle}>Add photos or a short video</Text>
            <Text style={styles.dropzoneSubtitle}>Help the Ustad understand the work before accepting</Text>
          </View>
          {/* Corner brackets */}
          <View style={[styles.bracket, styles.bracketTL, { borderColor: P.purple + '50' }]} />
          <View style={[styles.bracket, styles.bracketTR, { borderColor: P.purple + '50' }]} />
          <View style={[styles.bracket, styles.bracketBL, { borderColor: P.purple + '30' }]} />
          <View style={[styles.bracket, styles.bracketBR, { borderColor: P.purple + '30' }]} />
        </TouchableOpacity>
      ) : (
        <View style={styles.imageGrid}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageScroll}
          >
            {selectedMedia.map((asset, i) => (
              <View key={`${asset.type}-${asset.uri}-${i}`} style={styles.imageThumb}>
                {asset.type === 'image' ? (
                  <Image source={{ uri: asset.uri }} style={styles.thumbImg} />
                ) : (
                  <View style={styles.videoThumb}>
                    <PlayCircle size={28} color={P.purple} strokeWidth={1.7} />
                    <Text style={styles.videoThumbText}>Video</Text>
                  </View>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.65)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.thumbBadge}>
                  <Text style={styles.thumbIndex}>{i + 1}</Text>
                </View>
                <View style={styles.thumbTypeBadge}>
                  <Text style={styles.thumbTypeText}>{asset.type === 'video' ? 'VID' : 'IMG'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeMediaBtn}
                  onPress={() => handleRemove(i)}
                  activeOpacity={0.75}
                >
                  <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
            {selectedMedia.length < 5 && (
              <TouchableOpacity onPress={onPickMedia} style={styles.addMoreBtn} activeOpacity={0.7}>
                <Plus size={20} color={P.textSecondary} />
                <Text style={styles.addMoreText}>Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <View style={styles.mediaSummaryRow}>
            <Text style={styles.mediaSummaryText}>{selectedImageCount} photos</Text>
            <Text style={styles.mediaSummaryDot}>•</Text>
            <Text style={styles.mediaSummaryText}>{selectedVideoCount} videos</Text>
          </View>
          <TouchableOpacity onPress={onClearAll} style={styles.clearImages} activeOpacity={0.7}>
            <Text style={styles.clearImagesText}>Clear all media</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  dropzone: {
    height: 145,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: P.textMuted + '50',
    backgroundColor: P.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    width: '65%',
    height: 1,
    backgroundColor: P.purple,
    opacity: 0.18,
  },
  dropzoneContent: { alignItems: 'center', gap: 8 },
  cameraIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: P.textSecondary,
    letterSpacing: 0.5,
  },
  dropzoneSubtitle: {
    maxWidth: 260,
    fontSize: 11,
    color: P.textMuted,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  bracket: {
    position: 'absolute',
    width: 14,
    height: 14,
  },
  bracketTL: { top: 10, left: 10, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 4 },
  bracketTR: { top: 10, right: 10, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 4 },
  bracketBL: { bottom: 10, left: 10, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 4 },
  bracketBR: { bottom: 10, right: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 4 },
  imageGrid: {
    backgroundColor: P.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
  },
  imageScroll: { padding: 12, gap: 10 },
  imageThumb: {
    width: 95,
    height: 95,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  videoThumb: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: P.purpleMuted,
  },
  videoThumbText: {
    color: P.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  thumbBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIndex: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.8)' },
  thumbTypeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: P.purple + '55',
  },
  thumbTypeText: { fontSize: 8, color: P.purple, fontWeight: '900', letterSpacing: 0.8 },
  removeMediaBtn: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreBtn: {
    width: 95,
    height: 95,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  addMoreText: { fontSize: 9, color: P.textMuted, fontWeight: '700' },
  mediaSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  mediaSummaryText: {
    fontSize: 11,
    color: P.textSecondary,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  mediaSummaryDot: {
    color: P.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  clearImages: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: P.border,
  },
  clearImagesText: { fontSize: 12, color: P.textSecondary, fontWeight: '600' },
});
