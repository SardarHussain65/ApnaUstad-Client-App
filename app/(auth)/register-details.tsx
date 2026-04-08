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
import { Colors, Typography, BorderRadius } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import * as Haptics from 'expo-haptics';


export default function RegisterDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    fullName: string;
    email: string;
    phone: string;
    secondaryPhone: string;
    role: string;
    idToken: string;
  }>();

  // 🎨 Dynamic accent color based on role
  const accentColor = params.role === 'worker' ? Colors.orange : Colors.cyan;

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
  const entranceAnim = useSharedValue(0);
  const progressAnim = useSharedValue(0.66); // Start from 66% (Step 2)

  useEffect(() => {
    entranceAnim.value = withDelay(100, withSpring(1, { damping: 15 }));
    progressAnim.value = withSpring(1.0, { damping: 20 }); // Move to 100% (Complete)

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
        // If there are detailed validation errors, flatten them into a string
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
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Profile completed! Welcome to ApnaUstad as a ${params.role}.`);
      router.replace('/');
    },
    onError: (error: any) => {
      Alert.alert('Registration Error', error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  });

  const handleCompleteProfile = async () => {
    // Basic Validation
    if (!address || !city || !password) {
      Alert.alert('Missing Fields', 'Please fill in your address, city, and password.');
      return;
    }

    // Worker Validation
    if (params.role === 'worker') {
      if (!cnicNumber || !category || !cnicFront || !cnicBack || !hourlyRate || !experience) {
        Alert.alert('Missing Fields', 'Workers must provide CNIC, Category, Rate, Experience, and CNIC Photos.');
        return;
      }
    }

    try {
      setIsUploading(true);
      let profileImageUrl = '';
      let cnicFrontUrl = '';
      let cnicBackUrl = '';

      // 1. Profile Image
      if (image) {
        setUploadProgress('Uploading profile photo...');
        profileImageUrl = await uploadImageMutation.mutateAsync({
          uri: image,
          fieldName: 'profileImage',
          endpoint: params.role === 'worker' ? '/api/v1/workers/upload-profile-image' : '/api/v1/users/upload-image'
        });
      }

      // 2. Worker Images
      if (params.role === 'worker') {
        if (cnicFront) {
          setUploadProgress('Uploading CNIC Front...');
          cnicFrontUrl = await uploadImageMutation.mutateAsync({
            uri: cnicFront,
            fieldName: 'cnicFrontImage',
            endpoint: '/api/v1/workers/upload-cnic-front'
          });
        }
        if (cnicBack) {
          setUploadProgress('Uploading CNIC Back...');
          cnicBackUrl = await uploadImageMutation.mutateAsync({
            uri: cnicBack,
            fieldName: 'cnicBackImage',
            endpoint: '/api/v1/workers/upload-cnic-back'
          });
        }
      }

      setUploadProgress('Finalizing registration...');

      // 3. Final Payload
      const payload: any = {
        fullName: params.fullName,
        email: params.email || undefined,
        phone: params.phone,
        password: password,
        address,
        city,
        profileImage: profileImageUrl,
        latitude: 31.5204, // Default placeholders for now
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

  const animatedHero = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: interpolate(entranceAnim.value, [0, 1], [30, 0]) }]
  }));

  const animatedForm = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: interpolate(entranceAnim.value, [0, 1], [50, 0]) }]
  }));

  const animatedProgressBar = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <Animated.View style={[styles.header, animatedHero]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Finalize Profile</Text>
            <View style={{ width: 44 }} />
          </Animated.View>

          {/* Premium Progress Bar */}
          <Animated.View style={[styles.progressContainer, animatedHero]}>
            <View style={styles.progressBackground}>
              <Animated.View style={[styles.progressActive, animatedProgressBar, { backgroundColor: accentColor, shadowColor: accentColor }]} />
            </View>
            <View style={styles.stepsRow}>
              <Text style={styles.stepLabel}>Basic Info</Text>
              <Text style={styles.stepLabel}>OTP</Text>
              <Text style={[styles.stepLabel, { color: accentColor }]}>Finalize</Text>
            </View>
          </Animated.View>

          {/* Hero Section */}
          <Animated.View style={[styles.hero, animatedHero]}>
            <Text style={styles.title}>Finish{'\n'}<Text style={[styles.brandText, { color: accentColor }]}>Setup</Text></Text>
            <Text style={styles.subtitle}>Last step! Tell us a bit more about yourself to get started.</Text>
          </Animated.View>

          <Animated.View style={[styles.form, animatedForm]}>
            {/* Profile Image Picker */}
            <TouchableOpacity
              style={[styles.imagePicker, image && [styles.imagePickerSelected, { borderColor: accentColor }]]}
              onPress={() => pickImage('profile')}
              activeOpacity={0.8}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.profileImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Camera size={32} color={accentColor} />
                  <Text style={[styles.pickerText, { color: accentColor }]}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Worker Specific Fields */}
            {params.role === 'worker' && (
              <Animated.View style={styles.workerSection}>
                <View style={styles.sectionHeader}>
                  <CreditCard size={18} color={accentColor} />
                  <Text style={[styles.sectionTitle, { color: accentColor }]}>Identity Verification</Text>
                </View>

                <Text style={styles.label}>CNIC Number</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}><CreditCard size={20} color={accentColor} /></View>
                  <TextInput
                    style={styles.input}
                    placeholder="42101-0000000-0"
                    placeholderTextColor={Colors.textDim}
                    keyboardType="numeric"
                    value={cnicNumber}
                    onChangeText={setCnicNumber}
                  />
                </View>

                <View style={styles.cnicImagesRow}>
                  <TouchableOpacity
                    style={[styles.cnicPicker, cnicFront && styles.cnicPickerSelected]}
                    onPress={() => pickImage('cnicFront')}
                  >
                    {cnicFront ? (
                      <Image source={{ uri: cnicFront }} style={styles.cnicPreview} />
                    ) : (
                      <>
                        <Camera size={24} color={accentColor} />
                        <Text style={styles.cnicPickerText}>CNIC Front</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cnicPicker, cnicBack && styles.cnicPickerSelected]}
                    onPress={() => pickImage('cnicBack')}
                  >
                    {cnicBack ? (
                      <Image source={{ uri: cnicBack }} style={styles.cnicPreview} />
                    ) : (
                      <>
                        <Camera size={24} color={accentColor} />
                        <Text style={styles.cnicPickerText}>CNIC Back</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                  <Briefcase size={18} color={accentColor} />
                  <Text style={[styles.sectionTitle, { color: accentColor }]}>Professional Details</Text>
                </View>

                <Text style={styles.label}>Category / Profession</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat._id}
                      style={[
                        styles.categoryChip,
                        category === cat.name && { backgroundColor: accentColor, borderColor: accentColor }
                      ]}
                      onPress={() => setCategory(cat.name)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        category === cat.name && { color: '#000' }
                      ]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Skills (Comma separated)</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}><PenTool size={20} color={accentColor} /></View>
                  <TextInput
                    style={styles.input}
                    placeholder="Plumbing, Painting, Repair"
                    placeholderTextColor={Colors.textDim}
                    value={skills}
                    onChangeText={setSkills}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Hourly Rate</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconContainer}><BadgeDollarSign size={20} color={accentColor} /></View>
                      <TextInput
                        style={styles.input}
                        placeholder="500"
                        placeholderTextColor={Colors.textDim}
                        keyboardType="numeric"
                        value={hourlyRate}
                        onChangeText={setHourlyRate}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.label}>Experience (Yrs)</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconContainer}><Award size={20} color={accentColor} /></View>
                      <TextInput
                        style={styles.input}
                        placeholder="5"
                        placeholderTextColor={Colors.textDim}
                        keyboardType="numeric"
                        value={experience}
                        onChangeText={setExperience}
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.label}>Bio / Description</Text>
                <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 12 }]}>
                  <View style={[styles.iconContainer, { marginTop: 4 }]}><FileText size={20} color={accentColor} /></View>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    placeholder="Tell us about your work experience..."
                    placeholderTextColor={Colors.textDim}
                    multiline
                    value={bio}
                    onChangeText={setBio}
                  />
                </View>
              </Animated.View>
            )}

            <View style={[styles.sectionHeader, { marginTop: 32 }]}>
              <MapPin size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Location Info</Text>
            </View>

            <Text style={styles.label}>Street Address</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}><MapPin size={20} color={accentColor} /></View>
              <TextInput
                style={styles.input}
                placeholder="Enter your street address"
                placeholderTextColor={Colors.textDim}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>City</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}><Building size={20} color={accentColor} /></View>
              <TextInput
                style={styles.input}
                placeholder="Enter your city"
                placeholderTextColor={Colors.textDim}
                value={city}
                onChangeText={setCity}
              />
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Create Password</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}><Lock size={20} color={accentColor} /></View>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={Colors.textDim}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.completeBtn,
                { backgroundColor: accentColor, shadowColor: accentColor },
                (isUploading || registerMutation.isPending) && { opacity: 0.7 }
              ]}
              onPress={handleCompleteProfile}
              disabled={isUploading || registerMutation.isPending}
            >
              {(isUploading || registerMutation.isPending) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#000" style={{ marginRight: 10 }} />
                  <Text style={styles.completeBtnText}>{uploadProgress || 'Processing...'}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.completeBtnText}>Finalize Setup</Text>
                  <CheckCircle size={20} color="#000" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 32,
  },
  progressBackground: {
    height: 6,
    backgroundColor: Colors.card,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressActive: {
    height: '100%',
    backgroundColor: Colors.cyan,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDim,
  },
  stepLabelActive: {
    color: Colors.cyan,
  },
  hero: {
    marginBottom: 32,
  },
  title: {
    ...Typography.h1,
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 12,
  },
  brandText: {
    color: Colors.cyan,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 16,
    color: Colors.textMuted,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  imagePicker: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.inputBackground,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePickerSelected: {
    borderStyle: 'solid',
    borderColor: Colors.cyan,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  pickerText: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  workerSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  cnicImagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  cnicPicker: {
    width: '48%',
    height: 100,
    borderRadius: BorderRadius.m,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cnicPickerSelected: {
    borderStyle: 'solid',
  },
  cnicPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cnicPickerText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 4,
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 10,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDim,
  },
  rowInputs: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 8,
  },
  label: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.m,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  completeBtn: {
    backgroundColor: Colors.cyan,
    borderRadius: BorderRadius.m,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 40,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 40,
  },
  completeBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
});
