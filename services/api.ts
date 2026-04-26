import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { BASE_URL } from '../constants/Config';

const api = axios.create({
  baseURL: BASE_URL + '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('--- 401 Unauthorized detected ---');
      
      if (isRefreshing) {
        console.log('Refresh already in progress, queuing request');
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const role = await AsyncStorage.getItem('user_role');
        
        if (!refreshToken) {
           console.log('No refresh token found in storage, cannot refresh');
           isRefreshing = false;
           return Promise.reject(error);
        }

        console.log(`Refreshing token for role: ${role}...`);

        // Determine refresh endpoint based on role
        const refreshEndpoint = role === 'worker' ? '/workers/refresh-token' : '/users/refresh-token';

        // Call refresh token API
        const response = await axios.post(`${BASE_URL}/api/v1${refreshEndpoint}`, {
          refreshToken,
        });

        if (response.status === 200) {
          console.log('Token refreshed successfully!');
          const { token: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

          // Save new tokens
          await AsyncStorage.setItem('user_token', newAccessToken);
          await AsyncStorage.setItem('refresh_token', newRefreshToken);

          // Update header
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          processQueue(null, newAccessToken);
          isRefreshing = false;

          return api(originalRequest);
        } else {
          console.log(`Refresh failed with status: ${response.status}`);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh failed, logout user
        console.error('Token refresh failed:', refreshError);
        await AsyncStorage.multiRemove(['user_token', 'refresh_token', 'user_role', 'user_data']);
        
        // Dispatch logout event for AuthContext to react
        DeviceEventEmitter.emit('auth:logout');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
