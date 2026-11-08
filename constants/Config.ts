import Constants from 'expo-constants';

/**
 * Environment-driven Base URL configuration:
 * 1. Checks EXPO_PUBLIC_API_URL from environment / .env
 * 2. Checks Constants.expoConfig?.extra?.apiUrl (e.g. from app.json / EAS build profile)
 * 3. Falls back to production VPS URL in release builds (!__DEV__)
 * 4. Falls back to local dev machine IP during active development (__DEV__)
 */
const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__
    ? 'http://192.168.0.108:5001'
    : (Constants.expoConfig?.extra?.apiUrl || 'https://api.apnaustad.app'));

export const BASE_URL = rawBaseUrl.replace(/\/+$/, '');
console.log('🌐 Active API BASE_URL:', BASE_URL);

export const MAPTILER_API_KEY =
  Constants.expoConfig?.extra?.maptilerApiKey ||
  process.env.MAPTILER_API_KEY ||
  'o3cm0oM4Yn3L4Nyf1ydh';

export const AGORA_APP_ID =
  process.env.EXPO_PUBLIC_AGORA_APP_ID ||
  Constants.expoConfig?.extra?.agoraAppId ||
  'e537fd5b737642d79399d4c550d0887e';


/**
 * ImageKit CDN Image Optimizer Utility
 * Appends optimization queries to reduce mobile bandwidth payload consumption.
 * Supports custom width, height, and quality parameters.
 */
export const getOptimizedImageUrl = (
  url?: string | null,
  width?: number,
  height?: number,
  quality = 80
): string => {
  if (!url) return '';

  // Verify if it is an ImageKit URL
  const isImageKit = url.includes('ik.imagekit.io');
  if (!isImageKit) return url;

  // Build transformation parameters
  const transforms: string[] = [];
  if (width) transforms.push(`w-${width}`);
  if (height) transforms.push(`h-${height}`);
  transforms.push(`fo-auto`); // auto-focus crop if dimensions are passed
  transforms.push(`q-${quality}`); // custom or fallback quality percentage
  transforms.push(`f-auto`); // automatically serve optimized formats (WebP, AVIF)

  const transformQuery = `?tr=${transforms.join(',')}`;

  // If the URL already has query parameters, replace or strip them
  const baseUrl = url.split('?')[0];
  return `${baseUrl}${transformQuery}`;
};