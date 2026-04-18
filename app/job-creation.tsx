import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Image, Alert } from 'react-native';
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
  ChevronRight
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { AnimatedButton } from '../components/AnimatedButton';
import api from '../services/api';

type Urgency = 'instant' | 'scheduled';

export default function JobCreationScreen() {
  const router = useRouter();
  const { title, color, initialDescription, targetWorkerId, targetWorkerName } = useLocalSearchParams<{ 
    title: string; 
    color: string; 
    initialDescription?: string;
    targetWorkerId?: string;
    targetWorkerName?: string;
  }>();
  
  const [urgency, setUrgency] = useState<Urgency>('instant');
  const [description, setDescription] = useState(initialDescription || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [address, setAddress] = useState('123 Cyber St, Neo Lahore'); // Placeholder for now
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
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

    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePostJob = async () => {
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        category: title,
        description,
        urgency,
        longitude: 74.3587, // Mock লাহোর coordinates
        latitude: 31.5204,
        address,
        targetWorkerId: targetWorkerId || undefined,
        scheduledDate: urgency === 'scheduled' ? new Date().toISOString() : undefined,
        scheduledTime: urgency === 'scheduled' ? "10:00" : undefined,
      };

      const response = await api.post('/jobs', payload);
      
      if (urgency === 'instant') {
        router.push({
          pathname: '/finding-worker',
          params: { jobId: response.data.data._id }
        });
      } else {
        router.push('/(tabs)/bookings');
      }
    } catch (error) {
      console.error('Error posting job:', error);
    } finally {
      setIsSubmitting(false);
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
          <Animated.View entering={FadeInDown.duration(800)}>
            <GlassCard style={styles.categoryCard} gradient={[color || Colors.primary, '#000000'] as any}>
              <Text style={styles.categoryLabel}>{targetWorkerName ? 'DIRECT MISSION TO' : 'OBJECTIVE'}</Text>
              <Text style={[styles.categoryTitle, Typography.threeD]}>
                {targetWorkerName ? targetWorkerName.toUpperCase() : title?.toUpperCase()}
              </Text>
              {targetWorkerName && (
                <Text style={styles.categorySubLabel}>Protocol: {title?.toUpperCase()}</Text>
              )}
            </GlassCard>
          </Animated.View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>URGENCY PROTOCOL</Text>
            <View style={styles.urgencyGrid}>
               <TouchableOpacity 
                 style={[styles.urgencyOption, urgency === 'instant' && { borderColor: Colors.cyan, backgroundColor: 'rgba(0, 245, 255, 0.1)' }]}
                 onPress={() => setUrgency('instant')}
               >
                 <Zap size={24} color={urgency === 'instant' ? Colors.cyan : Colors.textDim} />
                 <Text style={[styles.urgencyTitle, urgency === 'instant' && { color: Colors.cyan }]}>INSTANT</Text>
                 <Text style={styles.urgencySub}>ETA: 15-30 MIN</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 style={[styles.urgencyOption, urgency === 'scheduled' && { borderColor: Colors.worker, backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}
                 onPress={() => setUrgency('scheduled')}
               >
                 <Calendar size={24} color={urgency === 'scheduled' ? Colors.worker : Colors.textDim} />
                 <Text style={[styles.urgencyTitle, urgency === 'scheduled' && { color: Colors.worker }]}>SCHEDULED</Text>
                 <Text style={styles.urgencySub}>PICK YOUR TIME</Text>
               </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MISSION BRIEFING</Text>
            <GlassCard style={styles.inputCard}>
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
          </View>

          <View style={styles.section}>
             <Text style={styles.sectionLabel}>DEPLOYMENT ZONE</Text>
             <TouchableOpacity style={styles.locationSelector}>
                <MapPin size={20} color={Colors.cyan} />
                <Text style={styles.locationText}>{address}</Text>
                <ChevronRight size={18} color={Colors.textDim} />
             </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VISUAL EVIDENCE (OPTIONAL)</Text>
            <TouchableOpacity 
              style={[styles.imagePicker, selectedImage && { borderColor: Colors.cyan, borderStyle: 'solid' }]} 
              onPress={pickImage}
            >
               {selectedImage ? (
                 <Image source={{ uri: selectedImage }} style={styles.previewImage} />
               ) : (
                 <>
                   <Camera size={32} color={Colors.textDim} />
                   <Text style={styles.imagePickerText}>CAPTURE ANOMALY</Text>
                 </>
               )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
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
          </View>
        </ScrollView>
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
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  scrollBody: {
    padding: Spacing.l,
    paddingBottom: 60,
  },
  categoryCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  categorySubLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    letterSpacing: 1,
  },
  section: {
    marginBottom: 25,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 12,
  },
  urgencyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyOption: {
    flex: 1,
    height: 100,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  urgencyTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    marginTop: 8,
  },
  urgencySub: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textDim,
    marginTop: 2,
  },
  inputCard: {
    padding: 16,
    borderRadius: 20,
  },
  textInput: {
    fontSize: 15,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginHorizontal: 12,
  },
  imagePicker: {
    height: 120,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textDim,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  footer: {
    marginTop: 20,
  },
  agreement: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  agreementText: {
    fontSize: 12,
    color: Colors.textDim,
    fontWeight: '600',
  },
  submitBtn: {
    width: '100%',
    height: 60,
  }
});
