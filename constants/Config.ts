import Constants from 'expo-constants';

// For local development on your Mac, you can switch this back to your local IP address:
// export const BASE_URL = 'http://192.168.18.20:5001';
export const BASE_URL = 'http://192.168.86.29:5001';


// Production VPS Server:
// export const BASE_URL = 'https://api.apnaustad.app';

export const MAPTILER_API_KEY = Constants.expoConfig?.extra?.maptilerApiKey || process.env.MAPTILER_API_KEY || 'o3cm0oM4Yn3L4Nyf1ydh';


// ipconfig getifaddr en0


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