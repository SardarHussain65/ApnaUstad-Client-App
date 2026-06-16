import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getAuth, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import * as Haptics from 'expo-haptics';
import { BorderRadius, useTheme } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { AlertModal } from '../ui/BeautifulModal';

// Configure Google Sign-In at module load time to avoid "apiClient is null" error
GoogleSignin.configure({
  webClientId: '69359738445-si95fboe7rq9jrlomcoj9tqvsfhabs4d.apps.googleusercontent.com',
  offlineAccess: true,
});

// Real official multi-colored Google "G" logo using SVG paths
function GoogleLogo() {
  return (
    <View style={styles.googleLogoContainer}>
      <Svg width={13} height={13} viewBox="0 0 24 24">
        <Path
          fill="#EA4335"
          d="M12 5.04c1.86 0 3.48.64 4.79 1.89l3.51-3.51C18.17 1.48 15.3 0 12 0 7.37 0 3.39 2.67 1.48 6.56l4.13 3.2C6.58 6.96 9.07 5.04 12 5.04z"
        />
        <Path
          fill="#34A853"
          d="M12 18.96c-2.93 0-5.42-1.92-6.39-4.72l-4.13 3.2C3.39 21.33 7.37 24 12 24c3.24 0 6.07-1.08 8.09-2.93l-3.83-2.97c-1.1.74-2.52 1.86-4.26 1.86z"
        />
        <Path
          fill="#FBBC05"
          d="M5.61 14.24c-.25-.74-.39-1.54-.39-2.36s.14-1.62.39-2.36l-4.13-3.2C.53 8.09 0 9.98 0 12s.53 3.91 1.48 5.68v4.13-3.23z"
        />
        <Path
          fill="#4285F4"
          d="M23.49 12.27c0-.81-.07-1.62-.21-2.41H12v4.56h6.46c-.28 1.47-1.11 2.72-2.36 3.56l3.83 2.97c2.24-2.07 3.56-5.12 3.56-8.68z"
        />
      </Svg>
    </View>
  );
}

interface GoogleSignInButtonProps {
  accentColor?: string;
}

export function GoogleSignInButton({ accentColor }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalConfig, setErrorModalConfig] = useState({ title: '', message: '' });
  const { setAuth } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const resolvedAccentColor = accentColor || theme.colors.brand.primary;

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // 1. Trigger native Google Sign-In
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signIn();

      // 2. Get the Google ID token
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) {
        throw new Error('Could not retrieve Google ID token.');
      }

      // 3. Exchange Google token for Firebase credential and sign in
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(getAuth(), googleCredential);

      // 4. Retrieve the actual Firebase ID token (JWT) to send to our backend
      const firebaseIdToken = await userCredential.user.getIdToken(true);

      // 5. Send Firebase ID token to backend
      const response = await fetch(`${BASE_URL}/api/v1/users/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: firebaseIdToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Google sign-in failed');
      }

      const responseData = data.data || data;

      // Existing / automatically registered user — log them in directly
      const { token, refreshToken, user } = responseData;
      if (!token || !refreshToken || !user) {
        throw new Error('Incomplete response from server. Please try again.');
      }
      await setAuth(token, refreshToken, 'client', user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)' as never);
    } catch (error: any) {
      // Handle user-cancelled sign-in silently
      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === 'SIGN_IN_CANCELLED'
      ) {
        return;
      }
      if (
        error.code === statusCodes.IN_PROGRESS ||
        error.code === 'IN_PROGRESS'
      ) {
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (
        error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE ||
        error.code === 'PLAY_SERVICES_NOT_AVAILABLE'
      ) {
        setErrorModalConfig({
          title: 'Play Services Required',
          message: 'Please update Google Play Services to continue.',
        });
      } else {
        setErrorModalConfig({
          title: 'Google Sign-In Failed',
          message: error.message || 'An unexpected error occurred. Please try again.',
        });
      }
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Divider with "or" */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.border.subtle }]} />
        <Text style={[styles.dividerText, { color: theme.colors.text.dim }]}>or continue with</Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.border.subtle }]} />
      </View>

      {/* Google Button */}
      <TouchableOpacity
        activeOpacity={0.82}
        disabled={isLoading}
        onPress={handleGoogleSignIn}
        style={[
          styles.googleButton,
          { 
            backgroundColor: theme.colors.surface.subtle,
            borderColor: `${resolvedAccentColor}30` 
          },
          isLoading && styles.googleButtonDisabled,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={resolvedAccentColor} size="small" />
        ) : (
          <GoogleLogo />
        )}
        <Text style={[styles.googleButtonText, { color: theme.colors.text.primary }]}>
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      <AlertModal
        visible={errorModalVisible}
        onDismiss={() => setErrorModalVisible(false)}
        title={errorModalConfig.title}
        message={errorModalConfig.message}
        type="error"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 14,
    letterSpacing: 0.5,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: 12,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  googleLogoContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});