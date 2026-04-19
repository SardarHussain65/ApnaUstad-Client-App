import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../../services/api';
import { queryKeys } from '../../lib/queryKeyFactory';

// Types
interface Category {
  _id: string;
  name: string;
  icon: string;  // Semantic icon identifier (e.g., 'electrical', 'plumbing')
  iconLegacy?: string;  // Legacy icon name for backward compatibility
  color?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

interface Worker {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  category: string;
  hourlyRate: number;
  rating?: number;
  isVerified?: boolean;
  profileImage?: string;
  totalBookings?: number;
  experience?: number;
  isAvailable?: boolean;
  bio?: string;
  totalJobs?: number;
}

interface Booking {
  _id: string;
  jobId: string;
  workerId: string;
  clientId: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  totalAmount?: number;
  workerDetails?: Worker;
}

// Fetch Functions
const fetchCategories = async (): Promise<Category[]> => {
  const response = await api.get('/users/categories');
  return response.data.data;
};

const fetchWorker = async (id: string): Promise<Worker> => {
  const response = await api.get(`/workers/${id}`);
  return response.data.data;
};

const fetchWorkersByCategory = async (category: string, limit?: number): Promise<Worker[]> => {
  const response = await api.get('/workers', {
    params: { category, limit },
  });
  return response.data.data || [];
};

const fetchBookings = async (): Promise<Booking[]> => {
  const response = await api.get('/bookings');
  return response.data.data || [];
};

const fetchMyBookings = async (): Promise<Booking[]> => {
  const response = await api.get('/bookings/my-bookings');
  return response.data.data || [];
};

const fetchWorkerBookings = async (): Promise<Booking[]> => {
  const response = await api.get('/bookings/worker-bookings');
  return response.data.data || [];
};

const fetchBookingDetails = async (id: string): Promise<Booking> => {
  const response = await api.get(`/bookings/${id}`);
  return response.data.data;
};

// Query Hooks
export function useCategories(options?: Omit<UseQueryOptions<Category[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Category[]>({
    queryKey: queryKeys.categories.list(),
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime)
    ...options,
  });
}

export function useWorker(id: string | undefined, options?: Omit<UseQueryOptions<Worker>, 'queryKey' | 'queryFn'>) {
  return useQuery<Worker>({
    queryKey: queryKeys.workers.detail(id || ''),
    queryFn: () => fetchWorker(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
    ...options,
  });
}

export function useWorkersByCategory(category: string | undefined, options?: Omit<UseQueryOptions<Worker[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Worker[]>({
    queryKey: queryKeys.workers.byCategory(category || ''),
    queryFn: () => fetchWorkersByCategory(category!),
    enabled: !!category,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,
    ...options,
  });
}

export function useBookings(options?: Omit<UseQueryOptions<Booking[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Booking[]>({
    queryKey: queryKeys.bookings.list(),
    queryFn: fetchBookings,
    staleTime: 1000 * 60 * 2, // 2 minutes - more frequent updates
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

export function useMyBookings(options?: Omit<UseQueryOptions<Booking[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Booking[]>({
    queryKey: queryKeys.bookings.myBookings(),
    queryFn: fetchMyBookings,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

export function useWorkerBookings(options?: Omit<UseQueryOptions<Booking[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Booking[]>({
    queryKey: queryKeys.bookings.byWorker(),
    queryFn: fetchWorkerBookings,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

export function useBookingDetails(id: string | undefined, options?: Omit<UseQueryOptions<Booking>, 'queryKey' | 'queryFn'>) {
  return useQuery<Booking>({
    queryKey: queryKeys.bookings.detail(id || ''),
    queryFn: () => fetchBookingDetails(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}
