import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Image as ImageIcon,
  Maximize2,
  PauseCircle,
  PlayCircle,
  Video,
  Volume2,
  X,
} from 'lucide-react-native';

export type JobEvidenceItem = {
  type: 'image' | 'video' | 'audio';
  url: string;
};

const compactUrls = (urls: (string | undefined | null)[]) =>
  Array.from(new Set(urls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)));

export const buildJobEvidenceItems = ({
  images = [],
  videos = [],
  audios = [],
}: {
  images?: (string | undefined | null)[];
  videos?: (string | undefined | null)[];
  audios?: (string | undefined | null)[];
}): JobEvidenceItem[] => [
  ...compactUrls(images).map(url => ({ type: 'image' as const, url })),
  ...compactUrls(videos).map(url => ({ type: 'video' as const, url })),
  ...compactUrls(audios).map(url => ({ type: 'audio' as const, url })),
];

const formatPlaybackTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

function MediaFooter({ item, index }: { item: JobEvidenceItem; index: number }) {
  const MediaIcon = item.type === 'image' ? ImageIcon : item.type === 'video' ? Video : Volume2;

  return (
    <View style={styles.footer}>
      <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={styles.typeBadge}>
        <MediaIcon size={11} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.typeText}>{item.type === 'audio' ? 'VOICE' : item.type.toUpperCase()}</Text>
      </View>
    </View>
  );
}

function PreviewShell({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.previewBackdrop}>
        <TouchableOpacity style={styles.previewClose} onPress={onClose} activeOpacity={0.8}>
          <X size={22} color="#FFFFFF" strokeWidth={2.6} />
        </TouchableOpacity>
        {children}
      </View>
    </Modal>
  );
}

function ImageCard({ item, index, width }: { item: JobEvidenceItem; index: number; width: number }) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity style={[styles.card, { width }]} onPress={() => setVisible(true)} activeOpacity={0.84}>
        <Image source={{ uri: item.url }} style={styles.image} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.expandBadge}><Maximize2 size={13} color="#FFFFFF" strokeWidth={2.5} /></View>
        <MediaFooter item={item} index={index} />
      </TouchableOpacity>
      <PreviewShell visible={visible} onClose={() => setVisible(false)}>
        <Image source={{ uri: item.url }} style={styles.previewMedia} resizeMode="contain" />
      </PreviewShell>
    </>
  );
}

function VideoCard({ item, index, width }: { item: JobEvidenceItem; index: number; width: number }) {
  const [visible, setVisible] = useState(false);
  const player = useVideoPlayer(item.url);

  useEffect(() => {
    if (!visible) player.pause();
  }, [player, visible]);

  return (
    <>
      <TouchableOpacity style={[styles.card, styles.videoCard, { width }]} onPress={() => setVisible(true)} activeOpacity={0.84}>
        <LinearGradient colors={['rgba(191,90,242,0.08)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.mediaCenter}>
          <View style={styles.playButton}><PlayCircle size={46} color="#00F5FF" strokeWidth={1.7} /></View>
          <Text style={styles.mediaTitle}>Job video</Text>
          <Text style={styles.mediaHint}>Tap to play with controls</Text>
        </View>
        <MediaFooter item={item} index={index} />
      </TouchableOpacity>
      <PreviewShell visible={visible} onClose={() => setVisible(false)}>
        <VideoView player={player} style={styles.previewMedia} nativeControls allowsFullscreen />
      </PreviewShell>
    </>
  );
}

function AudioCard({ item, index, width, isWorker }: { item: JobEvidenceItem; index: number; width: number; isWorker?: boolean }) {
  const player = useAudioPlayer(item.url);
  const status = useAudioPlayerStatus(player);

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      await player.seekTo(0);
    }
    player.play();
  };

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const progressPercent = Math.min(100, Math.max(0, progress * 100));

  return (
    <View style={[styles.whatsappVoiceCard, { width }]}>
      <LinearGradient 
        colors={['rgba(255,140,0,0.14)', 'rgba(12,16,42,0.96)']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject} 
      />
      
      {/* Left Icon Avatar */}
      <View style={styles.waAvatarShell}>
        <Volume2 size={16} color="#FF9F0A" strokeWidth={2.5} />
      </View>

      {/* Play/Pause Button */}
      <TouchableOpacity style={styles.waPlayButton} onPress={togglePlayback} activeOpacity={0.8}>
        {status.playing ? (
          <PauseCircle size={28} color="#FF9F0A" fill="rgba(255,159,10,0.1)" strokeWidth={2} />
        ) : (
          <PlayCircle size={28} color="#FF9F0A" fill="rgba(255,159,10,0.1)" strokeWidth={2} />
        )}
      </TouchableOpacity>

      {/* Progress Slider Track */}
      <View style={styles.waTrackContainer}>
        <View style={styles.waTrackBg}>
          <View style={[styles.waTrackFill, { width: `${progressPercent}%` }]} />
          <View style={[styles.waTrackThumb, { left: `${progressPercent}%` }]} />
        </View>
        
        {/* Info text below track */}
        <View style={styles.waMetaRow}>
          <Text style={styles.waTitleText}>
            {isWorker ? 'Client voice brief' : 'Your voice brief'}
          </Text>
          <Text style={styles.waTimeText}>
            {formatPlaybackTime(status.currentTime)} / {formatPlaybackTime(status.duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function JobEvidenceGallery({
  items,
  cardWidth,
  isWorker,
}: {
  items: JobEvidenceItem[];
  cardWidth?: number;
  isWorker?: boolean;
}) {
  const { width } = useWindowDimensions();
  const resolvedCardWidth = cardWidth || Math.max(280, width - 40);

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      snapToInterval={resolvedCardWidth + 12}
      decelerationRate="fast"
    >
      {items.map((item, index) => {
        const key = `${item.type}-${item.url}-${index}`;
        const cardProps = { item, index, width: resolvedCardWidth };
        if (item.type === 'video') return <VideoCard key={key} {...cardProps} />;
        if (item.type === 'audio') return <AudioCard key={key} {...cardProps} isWorker={isWorker} />;
        return <ImageCard key={key} {...cardProps} />;
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: {
    gap: 12,
    paddingRight: 4,
  },
  card: {
    height: 238,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(191,90,242,0.42)',
    backgroundColor: 'rgba(10,8,30,0.92)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(0,245,255,0.34)',
  },
  audioCard: {
    justifyContent: 'center',
    borderColor: 'rgba(255,176,0,0.34)',
  },
  mediaCenter: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    marginBottom: 8,
  },
  mediaTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  mediaHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  expandBadge: {
    position: 'absolute',
    top: 13,
    right: 13,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  footer: {
    position: 'absolute',
    left: 13,
    right: 13,
    bottom: 12,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  index: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  audioInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  audioButton: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,176,0,0.32)',
    backgroundColor: 'rgba(255,176,0,0.1)',
  },
  audioCopy: {
    flex: 1,
  },
  audioHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  audioTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  audioHint: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  audioTime: {
    color: '#FFB000',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 7,
  },
  previewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 70,
    backgroundColor: 'rgba(0,0,0,0.97)',
  },
  previewClose: {
    position: 'absolute',
    top: 54,
    right: 18,
    zIndex: 3,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
  },
  whatsappVoiceCard: {
    height: 82,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.3)',
    backgroundColor: 'rgba(12,16,42,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  waAvatarShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,159,10,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.25)',
  },
  waPlayButton: {
    marginLeft: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waTrackContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  waTrackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
  },
  waTrackFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FF9F0A',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  waTrackThumb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: -3,
    marginLeft: -5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  waMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  waTitleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '800',
  },
  waTimeText: {
    color: '#FF9F0A',
    fontSize: 10,
    fontWeight: '900',
  },
});
