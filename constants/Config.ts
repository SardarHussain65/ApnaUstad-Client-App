import Constants from 'expo-constants';

export const BASE_URL = 'http://192.168.0.118:5000';

export const MAPTILER_API_KEY = Constants.expoConfig?.extra?.maptilerApiKey || process.env.MAPTILER_API_KEY || 'o3cm0oM4Yn3L4Nyf1ydh';


// ipconfig getifaddr en0