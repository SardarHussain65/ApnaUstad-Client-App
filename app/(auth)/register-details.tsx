import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import {
  ChevronLeft, Camera, MapPin, Building,
  Lock, CreditCard, Briefcase, Award, PenTool,
  BadgeDollarSign, FileText, CheckCircle
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, BorderRadius, Shadows } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import * as Haptics from 'expo-haptics';
import { useToast } from '../../hooks';

import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';

export default function RegisterDetailsScreen() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const params = useLocalSearchParams<{
    fullName: string;
    email: string;
    phone: string;
    role: string;
    idToken: string;
  }>();
  const { setAuth } = useAuth();

  // 🎨 Dynamic accent color based on role
  const accentColor = params.role === 'worker' ? Colors.worker : Colors.cyan;

  const [image, setImage] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Worker Specific States
  const [cnicNumber, setCnicNumber] = useState('');
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Animation values
  const progressAnim = useSharedValue(0.66); 

  useEffect(() => {
    progressAnim.value = withSpring(1.0, { damping: 20 }); 

    if (params.role === 'worker') {
      fetchCategories();
    }
  }, []);

  const fetchCategories = async () => {
    setIsFetchingCategories(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/users/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsFetchingCategories(false);
    }
  };

  const pickImage = async (type: 'profile' | 'cnicFront' | 'cnicBack') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.5,
    });

    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = result.assets[0].uri;
      if (type === 'profile') setImage(uri);
      else if (type === 'cnicFront') setCnicFront(uri);
      else if (type === 'cnicBack') setCnicBack(uri);
    }
  };

  const uploadImageMutation = useMutation({
    mutationFn: async ({ uri, fieldName, endpoint }: { uri: string, fieldName: string, endpoint: string }) => {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpg`;

      formData.append(fieldName, { uri, name: filename, type } as any);

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Failed to upload ${fieldName}`);
      const data = await response.json();
      return data.data.imageUrl;
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const endpoint = params.role === 'worker' ? '/api/v1/workers/register' : '/api/v1/users/register';
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors && Array.isArray(errorData.errors)) {
          console.warn('Frontend Validation Errors:', errorData.errors);
          const detail = errorData.errors.map((e: any) => `${e.field}: ${e.message}`).join('\n');
          throw new Error(detail || 'Validation failed');
        }
        throw new Error(errorData.message || 'Registration failed');
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Backend response structure: { success, message, data: { user/worker, token, refreshToken } }
      const responseData = data.data || data;
      const token = responseData.token;
      const refreshToken = responseData.refreshToken;
      const user = responseData.user || responseData.worker;
      
      if (!token || !refreshToken || !user) {
        console.error('Invalid registration response - missing required fields:', { 
          hasToken: !!token, 
          hasRefreshToken: !!refreshToken, 
          hasUser: !!user 
        });
        showError('Registration Error', 'Invalid server response. Please try again.');
        return;
      }
      
      setAuth(token, refreshToken, params.role as 'client' | 'worker', user);
      success('Welcome!', `Profile completed! Welcome to ApnaUstad as a ${params.role}.`);
      router.replace('/(tabs)' as any);
    },
    onError: (error: any) => {
      showError('Registration Error', error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  });

  const handleCompleteProfile = async () => {
    // Basic Validation
    if (!address || !city || !password) {
      showError('Missing Fields', 'Please fill in your address, city, and password.');
      return;
    }

    // Worker Validation
    if (params.role === 'worker') {
      if (!cnicNumber || !category || !cnicFront || !cnicBack || !hourlyRate || !experience) {
        showError('Missing Fields', 'All identity and professional fields are required.');
        return;
      }
    }

    try {
      setIsUploading(true);
      let profileImageUrl = '';
      let cnicFrontUrl = '';
      let cnicBackUrl = '';

      if (image) {
        setUploadProgress('SYNCING AVATAR...');
        profileImageUrl = await uploadImageMutation.mutateAsync({
          uri: image,
          fieldName: 'profileImage',
          endpoint: params.role === 'worker' ? '/api/v1/workers/upload-profile-image' : '/api/v1/users/upload-image'
        });
      }

      if (params.role === 'worker') {
        if (cnicFront) {
          setUploadProgress('SYNCING CNIC FRONT...');
          cnicFrontUrl = await uploadImageMutation.mutateAsync({
            uri: cnicFront,
            fieldName: 'cnicFrontImage',
            endpoint: '/api/v1/workers/upload-cnic-front'
          });
        }
        if (cnicBack) {
          setUploadProgress('SYNCING CNIC BACK...');
          cnicBackUrl = await uploadImageMutation.mutateAsync({
            uri: cnicBack,
            fieldName: 'cnicBackImage',
            endpoint: '/api/v1/workers/upload-cnic-back'
          });
        }
      }

      setUploadProgress('FINALIZING PROTOCOL...');

      const payload: any = {
        fullName: params.fullName,
        email: params.email || undefined,
        phone: params.phone,
        password: password,
        address,
        city,
        profileImage: profileImageUrl,
        latitude: 31.5204, 
        longitude: 74.3587,
        fcmToken: '',
      };

      if (params.role === 'worker') {
        payload.cnicNumber = cnicNumber;
        payload.cnicFrontImage = cnicFrontUrl;
        payload.cnicBackImage = cnicBackUrl;
        payload.category = category;
        payload.skills = skills.split(',').map(s => s.trim()).filter(s => s !== '');
        payload.hourlyRate = Number(hourlyRate);
        payload.experience = Number(experience);
        payload.bio = bio;
      }

      registerMutation.mutate(payload);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong during upload.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const animatedProgressBar = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, Typography.threeD]}>CONFIGURATION</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Premium Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <Animated.View style={[styles.progressActive, animatedProgressBar, { backgroundColor: accentColor }]} />
              </View>
              <View style={styles.stepsRow}>
                <Text style={styles.stepLabel}>PHASE 01</Text>
                <Text style={styles.stepLabel}>PHASE 02</Text>
                <Text style={[styles.stepLabel, { color: accentColor }]}>FINAL PHASE</Text>
              </View>
            </View>

            {/* Hero Section */}
            <View style={styles.hero}>
              <Text style={[styles.title, Typography.threeD]}>FINALIZE {'\n'}<Text style={[styles.brandText, { color: accentColor }]}>SETUP</Text></Text>
              <Text style={styles.subtitle}>COMPLETE YOUR DIMENSIONAL PARAMETERS</Text>
            </View>

            <View style={styles.form}>
              {/* Profile Image Picker with Glow */}
              <TouchableOpacity
                style={[styles.imagePicker, { borderColor: image ? accentColor : 'rgba(255,255,255,0.1)' }]}
                onPress={() => pickImage('profile')}
                activeOpacity={0.8}
              >
                {image ? (
                  <Image source={{ uri: image }} style={styles.profileImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Camera size={32} color={accentColor} />
                    <Text style={[styles.pickerText, { color: accentColor }]}>SYNC PHOTO</Text>
                  </View>
                )}
                {image && <View style={[styles.imageGlow, { backgroundColor: accentColor }]} />}
              </TouchableOpacity>

              {/* Worker Specific Sections */}
              {params.role === 'worker' && (
                <View style={styles.workerSection}>
                  <GlassCard intensity={25} style={styles.formSection}>
                    <View style={styles.sectionHeader}>
                      <CreditCard size={18} color={accentColor} />
                      <Text style={[styles.sectionTitle, { color: accentColor }]}>IDENTITY VERIFICATION</Text>
                    </View>

                    <Text style={styles.label}>CNIC IDENTIFIER</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconContainer}><CreditCard size={18} color={accentColor} /></View>
                      <TextInput
                        style={styles.input}
                        placeholder="42101-0000000-0"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        keyboardType="numeric"
                        value={cnicNumber}
                        onChangeText={setCnicNumber}
                      />
                    </View>

                    <View style={styles.cnicImagesRow}>
                      <TouchableOpacity
                        style={[styles.cnicPicker, cnicFront && { borderColor: accentColor }]}
                        onPress={() => pickImage('cnicFront')}
                      >
                        {cnicFront ? (
                          <Image source={{ uri: cnicFront }} style={styles.cnicPreview} />
                        ) : (
                          <>
                            <Camera size={20} color={accentColor} />
                            <Text style={styles.cnicPickerText}>FRONT SIDE</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.cnicPicker, cnicBack && { borderColor: accentColor }]}
                        onPress={() => pickImage('cnicBack')}
                      >
                        {cnicBack ? (
                          <Image source={{ uri: cnicBack }} style={styles.cnicPreview} />
                        ) : (
                          <>
                            <Camera size={20} color={accentColor} />
                            <Text style={styles.cnicPickerText}>BACK SIDE</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </GlassCard>

                  <GlassCard intensity={25} style={[styles.formSection, { marginTop: 20 }]}>
                    <View style={styles.sectionHeader}>
                      <Briefcase size={18} color={accentColor} />
                      <Text style={[styles.sectionTitle, { color: accentColor }]}>PROFESSIONAL LINK</Text>
                    </View>

                    <Text style={styles.label}>SELECT ARCHETYPE (CATEGORY)</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.categoryScroll}
                      contentContainerStyle={{ gap: 10 }}
                    >
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat._id}
                          style={[
                            styles.categoryChip,
                            category === cat.name && { backgroundColor: accentColor + '40', borderColor: accentColor }
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setCategory(cat.name);
                          }}
                        >
                          <Text style={[
                            styles.categoryChipText,
                            category === cat.name && { color: '#fff' }
                          ]}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.label}>SKILLSET (COMMA SEPARATED)</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconContainer}><PenTool size={18} color={accentColor} /></View>
                      <TextInput
                        style={styles.input}
                        placeholder="Plumbing, Painting, Repair"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={skills}
                        onChangeText={setSkills}
                      />
                    </View>

                    <View style={styles.rowInputs}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>RATE / HR</Text>
                        <View style={styles.inputWrapper}>
                          <View style={styles.iconContainer}><BadgeDollarSign size={18} color={accentColor} /></View>
                          <TextInput
                            style={styles.input}
                            placeholder="500"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="numeric"
                            value={hourlyRate}
                            onChangeText={setHourlyRate}
                          />
                        </View>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.label}>EXP (YRS)</Text>
                        <View style={styles.inputWrapper}>
                          <View style={styles.iconContainer}><Award size={18} color={accentColor} /></View>
                          <TextInput
                            style={styles.input}
                            placeholder="5"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="numeric"
                            value={experience}
                            onChangeText={setExperience}
                          />
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.label, { marginTop: 20 }]}>MISSION DESCRIPTION (BIO)</Text>
                    <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 12, minHeight: 100 }]}>
                      <View style={[styles.iconContainer, { marginTop: 4 }]}><FileText size={18} color={accentColor} /></View>
                      <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="Briefly describe your expertise..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        multiline
                        value={bio}
                        onChangeText={setBio}
                      />
                    </View>
                  </GlassCard>
                </View>
              )}

              <GlassCard intensity={25} style={[styles.formSection, { marginTop: 20 }]}>
                <View style={styles.sectionHeader}>
                  <MapPin size={18} color={accentColor} />
                  <Text style={[styles.sectionTitle, { color: accentColor }]}>DIMENSIONAL CO-ORDINATES</Text>
                </View>

                <Text style={styles.label}>STREET ADDRESS</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}><MapPin size={18} color={accentColor} /></View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your street address"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>

                <Text style={[styles.label, { marginTop: 20 }]}>CITY</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}><Building size={18} color={accentColor} /></View>
                  <TextInput
                    style={styles.input}
                    placeholder="Karachi, Lahore, etc."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>

                <Text style={[styles.label, { marginTop: 20 }]}>ACCESS KEY (PASSWORD)</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}><Lock size={18} color={accentColor} /></View>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••••••"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </GlassCard>

              <TouchableOpacity
                style={[
                  styles.completeBtn,
                  { backgroundColor: accentColor },
                  (isUploading || registerMutation.isPending) && { opacity: 0.7 }
                ]}
                onPress={handleCompleteProfile}
                disabled={isUploading || registerMutation.isPending}
              >
                {(isUploading || registerMutation.isPending) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color="#000" style={{ marginRight: 10 }} />
                    <Text style={styles.completeBtnText}>{uploadProgress || 'UPLOADING...'}</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.completeBtnText}>INITIALIZE PROFILE</Text>
                    <CheckCircle size={20} color="#000" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 2,
  },
  progressContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressActive: {
    height: '100%',
    borderRadius: 2,
    ...Shadows.glow,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
  hero: {
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 46,
    letterSpacing: -1,
  },
  brandText: {
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 1,
  },
  form: {
    flex: 1,
  },
  imagePicker: {
    alignSelf: 'center',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 1,
  },
  imageGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 70,
    zIndex: -1,
    opacity: 0.2,
  },
  workerSection: {
    marginTop: 0,
  },
  formSection: {
    padding: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 10,
    letterSpacing: 1.5,
  },
  cnicImagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cnicPicker: {
    width: '48%',
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cnicPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cnicPickerText: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  categoryScroll: {
    marginBottom: 20,
    marginHorizontal: -5,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  rowInputs: {
    flexDirection: 'row',
    marginTop: 15,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  completeBtn: {
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 40,
    ...Shadows.glow,
    marginBottom: 40,
  },
  completeBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 10,
  },
});
