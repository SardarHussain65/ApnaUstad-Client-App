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

export interface Worker {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  category: string;
  hourlyRate: number;
  rating?: number;
  isVerified?: boolean;
  isActive?: boolean;
  profileImage?: string;
  totalBookings?: number;
  experience?: number;
  isAvailable?: boolean;
  bio?: string;
  totalJobs?: number;
  totalEarnings?: number;
  totalReviews?: number;
  skills?: string[];
  city?: string;
  address?: string;
}

export interface BookingPerson {
  _id: string;
  fullName: string;
  profileImage?: string;
  address?: string;
}

export interface Booking {
  _id: string;
  customer: BookingPerson;
  worker: BookingPerson;
  category: string;
  description: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  bookingType: 'instant' | 'scheduled';
  scheduledDate: string;
  scheduledTime: string;
  estimatedHours: number;
  hourlyRate: number;
  subtotal: number;
  platformFee: number;
  totalAmount: number;
  workerEarning: number;
  address: string;
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod: 'card' | 'cash';
  isReviewed: boolean;
  cancelReason?: string;
  cancelledBy?: 'customer' | 'worker' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface JobPost {
  _id: string;
  customer: string;
  category: string;
  description: string;
  urgency: 'instant' | 'scheduled';
  scheduledDate?: string;
  scheduledTime?: string;
  address: string;
  status: 'open' | 'assigned' | 'closed' | 'cancelled' | 'reviewing';
  imageUrl?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// Fetch Functions
const fetchCategories = async (): Promise<Category[]> => {
  const response = await api.get('/users/categories');
  return response.data.data;
};

const fetchWorker = async (id: string): Promise<Worker> => {
  const response = await api.get(`/users/workers/${id}`);
  return response.data.data;
};

const fetchAllWorkers = async (category?: string, search?: string): Promise<Worker[]> => {
  const response = await api.get('/users/workers', {
    params: { category, search },
  });
  return response.data.data?.data || [];
};

const fetchWorkersByCategory = async (category: string, limit?: number): Promise<Worker[]> => {
  const response = await api.get('/users/workers', {
    params: { category, limit },
  });
  // The new API wraps the array in data.data
  return response.data.data?.data || [];
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

const fetchMyJobPosts = async (): Promise<JobPost[]> => {
  const response = await api.get('/jobs/my-posts');
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

export function useAllWorkers(category?: string, search?: string, options?: Omit<UseQueryOptions<Worker[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Worker[]>({
    queryKey: [...queryKeys.workers.all, 'all', category, search],
    queryFn: () => fetchAllWorkers(category, search),
    staleTime: 1000 * 60 * 5,
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

export function useMyJobPosts(options?: Omit<UseQueryOptions<JobPost[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<JobPost[]>({
    queryKey: queryKeys.jobs.myPosts(),
    queryFn: fetchMyJobPosts,
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
