import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Zap,
  Calendar,
  Clock,
  MapPin,
  Camera,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Target,
  Terminal
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { useCreateJobMutation, useToast, useConfirmModal } from '../hooks';
import { ConfirmModal, AlertModal } from '../components/ui';

type Urgency = 'instant' | 'scheduled';

export default function JobCreationScreen() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { visible: confirmVisible, showConfirm, closeConfirm, isLoading: isConfirming, setLoading: setConfirmLoading } = useConfirmModal();
  const { title, color, initialDescription, targetWorkerId, targetWorkerName, urgency: urgencyParam } = useLocalSearchParams<{
    title: string;
    color: string;
    initialDescription?: string;
    targetWorkerId?: string;
    targetWorkerName?: string;
    urgency?: Urgency;
  }>();

  const [urgency, setUrgency] = useState<Urgency>(urgencyParam || 'instant');
  const [description, setDescription] = useState(initialDescription || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [address, setAddress] = useState('123 Cyber St, Neo Lahore'); // Placeholder
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 86400000)); // Default tomorrow
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  // React Query mutation
  const { mutate: createJob, isPending: isSubmitting } = useCreateJobMutation();

  const pickImage = async () => {
    try {
      // Permission check
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Visual evidence requires access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Image Pick Error', 'Could not access the image library. Please check your settings.');
    }
  };

  const handlePostJob = async () => {
    if (!description.trim()) {
      showError('Missing Details', 'Please describe the job');
      return;
    }

    // Show confirmation modal
    showConfirm(
      'Confirm Deployment',
      `You're about to ${urgency === 'instant' ? 'instantly dispatch' : 'broadcast'} this mission. Are you ready?`,
      handleConfirmSubmit,
      closeConfirm,
      'Deploy Now',
      'Review Again'
    );
  };

  const handleConfirmSubmit = async () => {
    const payload = {
      category: title || 'General',
      description,
      urgency: urgency,
      address,
      longitude: 74.3587, // Placeholder: Lahore Longitude
      latitude: 31.5204,  // Placeholder: Lahore Latitude
      targetWorkerId: targetWorkerId,
      scheduledDate: urgency === 'scheduled' ? scheduledDate : undefined,
      scheduledTime: urgency === 'scheduled' ? scheduledTime : undefined,
    };

    setConfirmLoading(true);
    createJob(payload, {
      onSuccess: (response) => {
        setConfirmLoading(false);
        closeConfirm();
        setCreatedJobId(response._id);
        setShowSuccessModal(true);
      },
      onError: (error) => {
        setConfirmLoading(false);
        showError('Deployment Failed', error.message || 'Failed to post job. Please try again.');
      }
    });
  };

  const handleSuccessModalDismiss = () => {
    setShowSuccessModal(false);
    if (urgency === 'instant') {
      router.push({
        pathname: '/finding-worker',
        params: { jobId: createdJobId }
      });
    } else {
      router.push('/(tabs)/bookings');
    }
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, Typography.threeD]}>DEPLOY MISSION</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>

          {/* Mission Target Header */}
          <Animated.View entering={FadeInDown.duration(800)}>
            <View style={styles.missionHeader}>
              <View style={[styles.glowingOrb, { shadowColor: color || Colors.cyan, borderColor: (color || Colors.cyan) + '60' }]}>
                {targetWorkerName ? <Target color={color || Colors.cyan} size={32} /> : <Sparkles color={color || Colors.cyan} size={32} />}
              </View>
              <View style={styles.missionHeaderText}>
                <Text style={styles.categoryLabel}>{targetWorkerName ? 'TARGET SPECIALIST' : 'MISSION OBJECTIVE'}</Text>
                <Text style={[styles.categoryTitle, Typography.threeD]}>
                  {targetWorkerName ? targetWorkerName.toUpperCase() : title?.toUpperCase()}
                </Text>
                <Text style={styles.categorySubLabel}>
                  {targetWorkerName ? `Protocol: ${title?.toUpperCase()}` : 'DEPLOYMENT SEQUENCE INITIATED'}
                </Text>
              </View>
            </View>
          </Animated.View>



          <Animated.View entering={FadeInDown.delay(350).duration(800)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Terminal size={14} color={Colors.cyan} />
              <Text style={styles.sectionLabel}>MISSION BRIEFING</Text>
            </View>
            <GlassCard style={styles.inputCard} intensity={15}>
              <TextInput
                style={styles.textInput}
                placeholder="Describe the anomaly (e.g., Pipe burst, leaking valve...)"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />
            </GlassCard>
          </Animated.View>

          {urgency === 'scheduled' && (
            <Animated.View entering={FadeInDown.delay(450).duration(800)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={14} color={Colors.worker} />
                <Text style={[styles.sectionLabel, { color: Colors.worker }]}>SCHEDULE PROTOCOL</Text>
              </View>
              <View style={styles.scheduleGrid}>
                <TouchableOpacity style={styles.scheduleItem}>
                  <Calendar size={18} color={Colors.textDim} />
                  <Text style={styles.scheduleText}>{scheduledDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scheduleItem}>
                  <Clock size={18} color={Colors.textDim} />
                  <Text style={styles.scheduleText}>{scheduledTime}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(500).duration(800)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={14} color={Colors.cyan} />
              <Text style={styles.sectionLabel}>DEPLOYMENT ZONE</Text>
            </View>
            <TouchableOpacity style={styles.locationSelector} activeOpacity={0.7}>
              <View style={styles.locationIconWrap}>
                <MapPin size={20} color={Colors.cyan} />
              </View>
              <Text style={styles.locationText}>{address}</Text>
              <ChevronRight size={18} color={Colors.textDim} />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(650).duration(800)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Camera size={14} color={Colors.cyan} />
              <Text style={styles.sectionLabel}>VISUAL EVIDENCE</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.imagePicker, selectedImage && { borderColor: Colors.cyan, borderStyle: 'solid' }]}
              onPress={pickImage}
            >
              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageOverlayText}>TAP TO REPLACE</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.pickerPlaceholder}>
                  <View style={styles.scannerLine} />
                  <Camera size={40} color={Colors.textDim} />
                  <Text style={styles.imagePickerText}>INITIALIZE SCAN</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(800).duration(800)} style={styles.footer}>
            <View style={styles.agreement}>
              <ShieldCheck size={16} color={Colors.cyan} />
              <Text style={styles.agreementText}>Secure deployment via ApnaUstad Protocol</Text>
            </View>
            <AnimatedButton
              title={targetWorkerId ? "INITIATE DIRECT DISPATCH" : (urgency === 'instant' ? "INITIATE INSTANT DISPATCH" : "BROADCAST TO MARKET")}
              variant={urgency === 'instant' || targetWorkerId ? 'cyan' : 'orange'}
              onPress={handlePostJob}
              isLoading={isSubmitting}
              style={styles.submitBtn}
            />
          </Animated.View>
        </ScrollView>

        <ConfirmModal
          visible={confirmVisible}
          onConfirm={handleConfirmSubmit}
          onCancel={closeConfirm}
          title="Confirm Deployment"
          message={`You're about to ${urgency === 'instant' ? 'instantly dispatch' : 'broadcast'} this mission. Are you ready?`}
          confirmText="Deploy Now"
          cancelText="Review Again"
          isLoading={isConfirming}
          confirmColor={urgency === 'instant' ? Colors.cyan : Colors.worker}
        />
        <AlertModal
          visible={showSuccessModal}
          onDismiss={handleSuccessModalDismiss}
          title="MISSION DEPLOYED"
          type="success"
          buttonText="UNDERSTOOD"
          message={`Your mission has been successfully broadcasted. ${urgency === 'instant' ? 'Our AI is now scouting for the nearest specialist.' : 'Specialists will review your briefing and submit bids shortly.'}\n\nYou can track progress in your Mission Log.`}
        />
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  scrollBody: {
    padding: Spacing.l,
    paddingBottom: 100,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: Spacing.m,
  },
  glowingOrb: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
  missionHeaderText: {
    marginLeft: 20,
    flex: 1,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 2,
    marginBottom: 2,
  },
  categoryTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
  },
  categorySubLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textDim,
    marginTop: 4,
    letterSpacing: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.textDim,
    letterSpacing: 1.5,
  },
  inputCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textInput: {
    fontSize: 15,
    color: '#fff',
    minHeight: 120,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginHorizontal: 12,
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  scheduleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  imagePicker: {
    height: 160,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  pickerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scannerLine: {
    position: 'absolute',
    top: '50%',
    width: '80%',
    height: 1,
    backgroundColor: Colors.cyan,
    opacity: 0.3,
    shadowColor: Colors.cyan,
    shadowRadius: 5,
    shadowOpacity: 1,
    elevation: 5,
  },
  imagePickerText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.textDim,
    letterSpacing: 2,
  },
  imagePreviewContainer: {
    width: '100%',
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footer: {
    marginTop: 10,
  },
  agreement: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  agreementText: {
    fontSize: 11,
    color: Colors.textDim,
    fontWeight: '600',
  },
  submitBtn: {
    width: '100%',
    height: 64,
  }
});
