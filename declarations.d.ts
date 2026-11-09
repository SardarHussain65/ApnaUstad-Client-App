declare module 'invariant';

declare module 'firebase/app' {
  export type FirebaseApp = any;
  export const initializeApp: any;
  export const getApps: any;
  export const getApp: any;
}

declare module 'firebase/auth' {
  export type Auth = any;
  export const initializeAuth: any;
  export const getReactNativePersistence: any;
  export const getAuth: any;
}
