import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  SlideInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Search,
  Star,
  Briefcase,
  MapPin,
  BadgeCheck,
  Zap,
  X,
  TrendingUp,
  Award,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Typography, Spacing, Shadows } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { SkeletonCard, WorkerDetailsModal } from '../components/ui';
import { useAllWorkers, type Worker } from '../hooks';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// 🧠 LEARNING NOTE — React.memo
// React.memo wraps a component to prevent unnecessary re-renders.
// It only re-renders WorkerCard when its OWN props change (worker, themeColor,
// index, onHire). Without memo, every parent state change (e.g. typing in
// the search bar) would re-render ALL visible cards — expensive with 20+ cards.
// ─────────────────────────────────────────────────────────────────────────────

interface WorkerCardProps {
  worker: Worker;
  themeColor: string;
  index: number;
  onHire: (worker: Worker) => void;
  onViewDetails: (id: string) => void;
}

const WorkerCard = React.memo(({ worker, themeColor, index, onHire, onViewDetails }: WorkerCardProps) => {
  const ratingStr = worker.rating ? worker.rating.toFixed(1) : '5.0';
  const ratingNum = worker.rating ?? 5.0;

  const [imageError, setImageError] = React.useState(false);

  // ─── LEARNING: encodeURIComponent ─────────────────────────────────────────
  // Converts special chars in a name (spaces → %20, & → %26) so the URL is
  // valid when fetching the avatar from the ui-avatars CDN.
  // ──────────────────────────────────────────────────────────────────────────
  const isValidImage = worker.profileImage && worker.profileImage !== 'null' && worker.profileImage !== 'undefined' && worker.profileImage.trim() !== '';
  const avatarUri = (isValidImage && !imageError)
    ? worker.profileImage
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.fullName || 'W')}&background=0d0d1a&color=fff&size=200&bold=true`;


  console.log("This is the profile image", avatarUri)

  // ─── LEARNING: Derived star-fill logic ────────────────────────────────────
  // We build an array of 5 elements and decide per-star whether it's full,
  // half, or empty by comparing the loop index to the numeric rating.
  // ──────────────────────────────────────────────────────────────────────────
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(ratingNum)) return 'full';
    if (i < ratingNum) return 'half';
    return 'empty';
  });

  return (
    // ─── LEARNING: Animated.View + entering prop ───────────────────────────
    // entering={FadeInDown.delay(index * 100)} staggers each card's entrance
    // by 100ms × its position in the list, creating a cascading reveal effect.
    // ──────────────────────────────────────────────────────────────────────────
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(500).springify()}
      style={styles.cardWrapper}
    >
      {/* ── Accent glow border behind the card ─────────────────────────── */}
      <View style={[styles.cardGlow, { shadowColor: themeColor }]} />

      <View style={styles.workerCard}>
        {/* ── Top gradient strip ─────────────────────────────────────────── */}
        <LinearGradient
          colors={[themeColor + '22', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardTopGradient}
        />

        {/* ── LEFT STRIPE — category color accent ─────────────────────── */}
        <View style={[styles.leftStripe, { backgroundColor: themeColor }]} />

        {/* ── CARD INNER CONTENT ───────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.cardInner}
          activeOpacity={0.9}
          onPress={() => onViewDetails(worker._id)}
        >

          {/* ── ROW 1: Avatar + Name Block ─────────────────────────────── */}
          <View style={styles.topRow}>

            {/* Avatar with status ring */}
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarRing, { borderColor: themeColor + '60' }]}>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  onError={() => setImageError(true)}
                />
              </View>
              {/* ─── LEARNING: Conditional rendering with && ──────────────
                  If worker.isAvailable is truthy, the dot renders. If falsy,
                  nothing renders (React ignores `false`). Clean & idiomatic.
              ──────────────────────────────────────────────────────────── */}
              <View
                style={[
                  styles.availabilityDot,
                  {
                    backgroundColor: worker.isAvailable
                      ? '#00E5A0'   // neon green = online
                      : '#FF4C6A', // red = offline
                    borderColor: '#0a0a1a',
                  },
                ]}
              />
            </View>

            {/* Name + meta */}
            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.workerName} numberOfLines={1}>
                  {worker.fullName}
                </Text>
                {/* ─── LEARNING: Short-circuit conditional rendering ──────
                    worker.isVerified && <Component /> only renders the
                    component when isVerified is true. Saves nesting an if.
                ────────────────────────────────────────────────────────── */}
                {worker.isVerified && (
                  <BadgeCheck size={16} color={themeColor} fill={themeColor + '30'} />
                )}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Briefcase size={9} color={themeColor} />
                  {/* ─── LEARNING: toUpperCase() for consistent visual style */}
                  <Text style={[styles.metaChipText, { color: themeColor }]}>
                    {worker.category.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.metaChip}>
                  <MapPin size={9} color={Colors.textDim} />
                  {/* ─── LEARNING: Nullish coalescing (??) ────────────────
                      Returns right-hand side only when left side is null
                      or undefined — NOT when it's 0 or ''. Safer than ||.
                  ──────────────────────────────────────────────────────── */}
                  <Text style={styles.metaChipText}>
                    {worker.city ?? 'Remote'}
                  </Text>
                </View>
              </View>

              {/* Star rating row */}
              <View style={styles.starsRow}>
                {stars.map((type, i) => (
                  <Star
                    key={i}
                    size={11}
                    color="#FFD700"
                    fill={type === 'full' ? '#FFD700' : type === 'half' ? '#FFD70080' : 'transparent'}
                  />
                ))}
                <Text style={styles.ratingText}>{ratingStr}</Text>
              </View>
            </View>
          </View>

          {/* ── ROW 2: Stats Bar ────────────────────────────────────────── */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <TrendingUp size={12} color={themeColor} />
              <Text style={styles.statValue}>{worker.totalJobs ?? 0}</Text>
              <Text style={styles.statLabel}>Jobs</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Award size={12} color={themeColor} />
              <Text style={styles.statValue}>{worker.totalReviews ?? 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Zap size={12} color={themeColor} />
              <Text style={[styles.statValue, { color: worker.isAvailable ? '#00E5A0' : '#FF4C6A' }]}>
                {worker.isAvailable ? 'Open' : 'Busy'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>

          {/* ── ROW 3: Skills chips ──────────────────────────────────────── */}
          {/* ─── LEARNING: Optional chaining (?.) + slice() ─────────────────
              worker.skills?.slice(0, 3) safely accesses skills even if it's
              undefined — preventing a crash. slice(0,3) takes first 3 items.
          ──────────────────────────────────────────────────────────────────── */}
          {(worker.skills?.length ?? 0) > 0 && (
            <View style={styles.skillsRow}>
              {worker.skills?.slice(0, 3).map((skill) => (
                <View key={skill} style={[styles.skillPill, { borderColor: themeColor + '35' }]}>
                  <Text style={[styles.skillText, { color: themeColor }]}>#{skill}</Text>
                </View>
              ))}
              {(worker.skills?.length ?? 0) > 3 && (
                <View style={[styles.skillPill, { borderColor: 'rgba(255,255,255,0.12)' }]}>
                  <Text style={styles.skillTextMore}>+{(worker.skills?.length ?? 0) - 3}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Bio ──────────────────────────────────────────────────────── */}
          {!!worker.bio && (
            <Text style={styles.bioText} numberOfLines={2}>
              {worker.bio}
            </Text>
          )}

          {/* ── ROW 4: DEPLOY button ─────────────────────────────────────── */}
          {/* ─── LEARNING: TouchableOpacity + activeOpacity ──────────────────
              activeOpacity={0.75} dims the button to 75% opacity when pressed,
              giving tactile visual feedback. Default is 0.2 (too dim). 0.75–0.85
              feels polished for prominent CTAs.
          ──────────────────────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.deployBtn}
            onPress={() => onHire(worker)}
            activeOpacity={0.78}
          >
            <LinearGradient
              colors={[themeColor, themeColor + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.deployBtnGradient}
            >
              <View style={styles.deployBtnLeft}>
                <Text style={styles.deployRateLabel}>Total Earnings</Text>
                <Text style={styles.deployRateValue}>
                  Rs. {worker.totalEarnings ?? '0'}
                </Text>
              </View>
              <View style={styles.deployBtnRight}>
                <Zap size={14} color="#000" fill="#000" />
                <Text style={styles.deployBtnText}>DEPLOY</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

        </TouchableOpacity>{/* end cardInner */}
      </View>{/* end workerCard */}
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 🧩 MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkerListScreen() {
  // ─── LEARNING: useSafeAreaInsets ─────────────────────────────────────────
  // Returns { top, bottom, left, right } pixel values of the device's safe area
  // (notch, home indicator, status bar). We add insets.top to our header padding
  // so content never hides behind the notch on iPhone X+ or Android punch-holes.
  // ──────────────────────────────────────────────────────────────────────────
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ─── LEARNING: useLocalSearchParams ──────────────────────────────────────
  // Expo Router equivalent of React Navigation's route.params. Returns an
  // object of URL query params typed by our generic <{ ... }>.
  // ──────────────────────────────────────────────────────────────────────────
  const params = useLocalSearchParams<{ category: string; color: string; title: string }>();

  const category = params.category || params.title || '';
  const themeColor = params.color || Colors.cyan;

  const [search, setSearch] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);

  const { data: workers = [], isLoading } = useAllWorkers(category, undefined);

  // ─── LEARNING: useMemo ────────────────────────────────────────────────────
  // useMemo caches the filtered array. It only recomputes when [workers, search]
  // change. Without it, filtering runs on EVERY render — even unrelated ones.
  // The rule: use memo when the computation is expensive OR produces a new array
  // reference (which would break downstream React.memo comparisons).
  // ──────────────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return workers;
    const q = search.toLowerCase();
    return workers.filter(
      (w) =>
        w.fullName.toLowerCase().includes(q) ||
        w.skills?.some((s) => s.toLowerCase().includes(q)) ||
        w.city?.toLowerCase().includes(q)
    );
  }, [workers, search]);

  const handleHire = (worker: Worker) => {
    setModalVisible(false);
    router.push({
      pathname: '/job-creation',
      params: {
        title: category,
        color: themeColor,
        targetWorkerId: worker._id,
        targetWorkerName: worker.fullName,
      },
    });
  };

  const handleViewDetails = (id: string) => {
    setSelectedWorkerId(id);
    setModalVisible(true);
  };

  return (
    <BackgroundWrapper>
      <View style={styles.container}>

        {/* ── Decorative atmospheric blobs ─────────────────────────────── */}
        {/* ─── LEARNING: Dynamic style with themeColor + hex opacity ──────
            e.g. themeColor + '18' appends 18 (hex = ~9% opacity) to a color
            string like '#00CFFF' → '#00CFFF18'. Quick way to create tinted
            transparent backgrounds without converting to rgba().
        ──────────────────────────────────────────────────────────────────── */}
        <View style={[styles.blobTop, { backgroundColor: themeColor + '14' }]} />
        <View style={[styles.blobBottom, { backgroundColor: Colors.purple + '10' }]} />

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <Animated.View
          entering={SlideInDown.duration(450).springify()}
          // ─── LEARNING: Inline style array ──────────────────────────────
          // RN accepts an array for `style`. Later objects win on conflict.
          // Here we combine static styles with a dynamic paddingTop.
          // ──────────────────────────────────────────────────────────────
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft color="#fff" size={22} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{category.toUpperCase()}</Text>
            <Text style={styles.headerSub}>
              {isLoading
                ? 'Scanning network...'
                : `${filtered.length} specialist${filtered.length !== 1 ? 's' : ''} available`}
            </Text>
          </View>

          {/* Placeholder keeps header title centered via flexbox */}
          <View style={styles.iconBtnPlaceholder} />
        </Animated.View>

        {/* ── SEARCH BAR ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(180).duration(450)} style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search size={15} color={Colors.textDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, skill, city..."
              placeholderTextColor={Colors.textDim}
              value={search}
              onChangeText={setSearch}
            />
            {/* ─── LEARNING: Conditional clear button ──────────────────────
                Only show the ✕ when there's text typed. This pattern avoids
                showing a useless button — improves UX significantly.
            ──────────────────────────────────────────────────────────────── */}
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color={Colors.textDim} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── WORKER LIST ──────────────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled" // ─── taps dismiss keyboard naturally
        >
          {isLoading ? (
            // ─── LEARNING: Array(4).fill(0).map() ───────────────────────
            // Creates an array of 4 zeros, then maps over it to render 4
            // skeleton placeholders while data loads. fill(0) is needed
            // because sparse arrays (Array(4)) can't be mapped over.
            // ──────────────────────────────────────────────────────────
            Array(4)
              .fill(0)
              .map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length > 0 ? (
            filtered.map((worker, idx) => (
              <WorkerCard
                key={worker._id}
                worker={worker}
                themeColor={themeColor}
                index={idx}
                onHire={handleHire}
                onViewDetails={handleViewDetails}
              />
            ))
          ) : (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No Specialists Found</Text>
              <Text style={styles.emptySub}>
                {search
                  ? 'Try a different search term.'
                  : 'No workers available in this category yet.'}
              </Text>
              {search ? (
                <TouchableOpacity style={[styles.clearBtn, { borderColor: themeColor }]} onPress={() => setSearch('')}>
                  <Text style={[styles.clearBtnText, { color: themeColor }]}>Clear Search</Text>
                </TouchableOpacity>
              ) : null}
            </Animated.View>
          )}
        </ScrollView>
      </View>

      <WorkerDetailsModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        workerId={selectedWorkerId}
        themeColor={themeColor}
        onDeploy={handleHire}
      />
    </BackgroundWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎨 STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Atmosphere blobs ──────────────────────────────────────────────────────
  blobTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 999,
    top: -100,
    right: -80,
    zIndex: 0,
  },
  blobBottom: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    bottom: 40,
    left: -80,
    zIndex: 0,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.m,
    zIndex: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconBtnPlaceholder: {
    width: 42,
    height: 42,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.textDim,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // ── Search ────────────────────────────────────────────────────────────────
  searchRow: {
    paddingHorizontal: Spacing.l,
    marginBottom: Spacing.m,
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    padding: 0,
  },

  // ── List ─────────────────────────────────────────────────────────────────
  list: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
    gap: 16,
  },

  // ── Worker Card ───────────────────────────────────────────────────────────
  cardWrapper: {
    position: 'relative',
  },
  // ─── LEARNING: `shadowColor` only works on iOS. On Android, use `elevation`.
  // We use both here. The `cardGlow` is a sibling View placed behind the card
  // using position:absolute to simulate a colored drop-shadow/glow effect.
  cardGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 0, // no elevation for the glow layer
  },
  workerCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardTopGradient: {
    // ─── LEARNING: StyleSheet.absoluteFill shortcut ──────────────────────
    // Equivalent to { position:'absolute', top:0, left:0, right:0, bottom:0 }
    // We DON'T use absoluteFill here because LinearGradient needs explicit size.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 0,
  },

  // ─── Left color accent stripe ─────────────────────────────────────────────
  leftStripe: {
    width: 3,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },

  cardInner: {
    flex: 1,
    padding: 16,
    gap: 14,
  },

  // ── Top Row (Avatar + Name) ───────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarRing: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 2,
    padding: 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  availabilityDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  nameBlock: {
    flex: 1,
    gap: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textDim,
    letterSpacing: 0.3,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },

  // ── Stats Bar ────────────────────────────────────────────────────────────
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textDim,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Skills ────────────────────────────────────────────────────────────────
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  skillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skillTextMore: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textDim,
  },
  bioText: {
    color: Colors.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },

  // ── Deploy Button ─────────────────────────────────────────────────────────
  deployBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  deployBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
  deployBtnLeft: {
    flex: 1,
    paddingLeft: 16,
  },
  deployRateLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.55)',
    letterSpacing: 0.5,
  },
  deployRateValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  deployBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.12)',
    height: '100%',
  },
  deployBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5,
  },

  // ── Empty State ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 70,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 18,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptySub: {
    color: Colors.textDim,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearBtn: {
    marginTop: 22,
    paddingHorizontal: 26,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});