import { initializeApp as initializeJSApp, getApps as getJSApps, getApp as getJSApp, FirebaseApp } from 'firebase/app';
// @ts-ignore: getReactNativePersistence typings
import { initializeAuth, getReactNativePersistence, getAuth, Auth as JSAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Modular Native Firebase imports
import auth from '@react-native-firebase/auth';

/**
 * PROJECT CONFIGURATION
 * ---------------------
 * This config is shared between the JS SDK (Web fallback) 
 * and the Native SDK (Android/iOS high-performance features).
 */
const firebaseConfig = {
  apiKey: "AIzaSyBvHiMbRym0rM5bmKmLrr7BEl5BVBnUtzQ", // From latest JSON
  authDomain: "apnaustad-eab72.firebaseapp.com",
  projectId: "apnaustad-eab72",
  storageBucket: "apnaustad-eab72.firebasestorage.app",
  messagingSenderId: "69359738445",
  appId: "1:69359738445:web:0e0770176c942cc6f74604",
  measurementId: "G-L0XTCEJL9P",
  databaseURL: "https://apnaustad-eab72-default-rtdb.firebaseio.com"
};

// 1. Initialize JS SDK (Required for shared logic if needed)
let jsApp: FirebaseApp;
let jsAuth: JSAuth;
if (!getJSApps().length) {
  jsApp = initializeJSApp(firebaseConfig);
  jsAuth = initializeAuth(jsApp, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} else {
  jsApp = getJSApp();
  jsAuth = getAuth(jsApp);
}

// 2. Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '69359738445-si95fboe7rq9jrlomcoj9tqvsfhabs4d.apps.googleusercontent.com',
  offlineAccess: true,
});

/**
 * EXPORTS
 * Use 'auth' for all mobile authentication (Phone, Google, etc.)
 */
export { jsApp, jsAuth, auth };

