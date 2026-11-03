import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, ActivityIndicator } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { getAuth, signInWithCredential, OAuthProvider } from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme, BorderRadius } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import { AlertModal } from '../ui/BeautifulModal';

interface AppleSignInButtonProps {
  onSuccess?: () => void;
}

export function AppleSignInButton({ onSuccess }: AppleSignInButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { setAuth } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync()
        .then(setIsAvailable)
        .catch(() => setIsAvailable(false));
    }
  }, []);

  if (Platform.OS !== 'ios' || !isAvailable) {
    return null;
  }

  const handleAppleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName } = credential;
      if (!identityToken) {
        throw new Error('Could not retrieve Apple identity token.');
      }

      // 1. Sign in with Firebase OAuthProvider
      const provider = new OAuthProvider('apple.com');
      const oauthCredential = provider.credential({
        idToken: identityToken,
      });

      const userCredential = await signInWithCredential(getAuth(), oauthCredential);
      const firebaseIdToken = await userCredential.user.getIdToken(true);

      // 2. Exchange with backend
      const displayName = [fullName?.givenName, fullName?.familyName]
        .filter(Boolean)
        .join(' ');

      const response = await fetch(`${BASE_URL}/api/v1/users/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: firebaseIdToken,
          name: displayName || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Apple sign-in failed on server.');
      }

      const responseData = data.data || data;
      const { token, refreshToken, user } = responseData;
      if (!token || !refreshToken || !user) {
        throw new Error('Incomplete response from server. Please try again.');
      }

      await setAuth(token, refreshToken, 'client', user);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.();
      router.replace('/(tabs)' as never);
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED' || error.code === '1001') {
        // User cancelled Apple sign in dialog
        return;
      }
      console.error('Apple Sign-In Error:', error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(error.message || 'Apple sign-in could not be completed.');
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={[styles.loadingBox, { backgroundColor: theme.isDark ? '#FFFFFF' : '#000000' }]}>
          <ActivityIndicator color={theme.isDark ? '#000000' : '#FFFFFF'} />
        </View>
      ) : (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            theme.isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={BorderRadius.xl}
          style={styles.button}
          onPress={handleAppleSignIn}
        />
      )}

      <AlertModal
        visible={errorModalVisible}
        onDismiss={() => setErrorModalVisible(false)}
        title="Sign In Notice"
        message={errorMessage}
        type="error"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  button: {
    width: '100%',
    height: 48,
  },
  loadingBox: {
    width: '100%',
    height: 48,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
