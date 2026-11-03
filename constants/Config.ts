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
  Constants.expoConfig?.extra?.apiUrl ||
  (!__DEV__ ? 'https://api.apnaustad.app' : 'http://192.168.18.96:5001');

export const BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export const MAPTILER_API_KEY =
  Constants.expoConfig?.extra?.maptilerApiKey ||
  process.env.MAPTILER_API_KEY ||
  'o3cm0oM4Yn3L4Nyf1ydh';


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