import Constants from 'expo-constants';

// For local development on your Mac, you can switch this back to your local IP address:
export const BASE_URL = 'http://192.168.18.75:5001';

// Production VPS Server:
// export const BASE_URL = 'https://api.apnaustad.app';

export const MAPTILER_API_KEY = Constants.expoConfig?.extra?.maptilerApiKey || process.env.MAPTILER_API_KEY || 'o3cm0oM4Yn3L4Nyf1ydh';


// ipconfig getifaddr en0