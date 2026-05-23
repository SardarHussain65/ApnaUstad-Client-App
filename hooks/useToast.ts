import Toast from 'react-native-toast-message';
import { Colors } from '../constants/Theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom';
}

export function useToast() {
  const showToast = (
    type: ToastType,
    title: string,
    message?: string,
    options?: ToastOptions
  ) => {
    Toast.show({
      type,
      position: options?.position || 'top',
      text1: title,
      text2: message,
      duration: options?.duration || 3000,
      topOffset: 60,
      bottomOffset: 40,
    });
  };

  return {
    success: (title: string, message?: string, options?: ToastOptions) =>
      showToast('success', title, message, options),
    error: (title: string, message?: string, options?: ToastOptions) =>
      showToast('error', title, message, options),
    info: (title: string, message?: string, options?: ToastOptions) =>
      showToast('info', title, message, options),
    warning: (title: string, message?: string, options?: ToastOptions) =>
      showToast('warning', title, message, options),
  };
}
