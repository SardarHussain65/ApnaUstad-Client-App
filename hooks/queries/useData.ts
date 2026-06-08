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
  deactivationReason?: string;
  deactivatedAt?: string | null;
  profileImage?: string;
  totalBookings?: number;
  experience?: number;
  isAvailable?: boolean;
  isInstantAvailable?: boolean;
  isScheduledAvailable?: boolean;
  bio?: string;
  totalJobs?: number;
  totalEarnings?: number;
  totalReviews?: number;
  skills?: string[];
  city?: string;
  address?: string;
  matchedSpecialtyProfile?: {
    categoryId?: string;
    category: string;
    priority: number;
    tier: 'primary' | 'additional';
    skills: string[];
    hourlyRate: number;
    experience: number;
    bio: string;
  };
}

export interface BookingPerson {
  _id: string;
  fullName: string;
  profileImage?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  category?: string;
  rating?: number;
  totalReviews?: number;
  totalJobs?: number;
  hourlyRate?: number;
  experience?: number;
  isVerified?: boolean;
  isAvailable?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface MissionCardMeta {
  source: 'booking' | 'job_post';
  title: string;
  description?: string;
  missionKind?: 'instant' | 'scheduled';
  missionKindLabel?: string;
  primaryImageUrl?: string;
  media?: {
    images: string[];
    videos: string[];
    audios?: string[];
    coverUrl?: string;
    totalCount?: number;
    hasVideo?: boolean;
    hasAudio?: boolean;
  };
  statusInfo?: {
    value: string;
    label: string;
    tone: string;
    accentColor: string;
    actionLabel?: string;
  };
  schedule?: {
    dateLabel: string;
    dayLabel?: string;
    fullDateLabel?: string;
    timeLabel: string;
  };
  location?: {
    address: string;
  };
  actionLabel?: string;
  counterParty?: {
    _id?: string;
    fullName: string;
    phone?: string;
    email?: string;
    profileImage?: string;
    roleLabel: string;
    category?: string;
    address?: string;
    city?: string;
    rating?: number;
    totalReviews?: number;
    totalJobs?: number;
    hourlyRate?: number;
    experience?: number;
    isVerified?: boolean;
    isAvailable?: boolean;
    isActive?: boolean;
    joinedAt?: string;
  };
  financial?: {
    label: string;
    amount: number;
    currency: string;
    subtotal?: number;
    platformFee?: number;
    workerEarning?: number;
    totalAmount?: number;
    amountText?: string;
  };
  bidSummary?: {
    total: number;
    pending: number;
    hasAcceptedBid: boolean;
  };
}

export interface Booking {
  _id: string;
  jobPost?: string | { _id?: string } | null;
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
  location?: {
    type: 'Point';
    coordinates: number[];
  };
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod: 'cash';
  isReviewed: boolean;
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
  cancelReason?: string;
  cancelledBy?: 'customer' | 'worker' | 'admin';
  cardMeta?: MissionCardMeta;
  createdAt: string;
  updatedAt: string;
}

export interface ClientHomeStats {
  total: number;
  active: number;
  completed: number;
  successRate: number;
  successRateLabel: string;
  totalSpent: number;
}

export interface ClientHomeSummary {
  stats: ClientHomeStats;
  recentBookings: Booking[];
}

export interface JobPost {
  _id: string;
  customer: string | BookingPerson;
  category: string;
  description: string;
  urgency: 'instant' | 'scheduled';
  scheduledDate?: string;
  scheduledTime?: string;
  address: string;
  status: 'open' | 'assigned' | 'closed' | 'cancelled' | 'reviewing';
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  audioUrls?: string[];
  media?: {
    images: string[];
    videos: string[];
    audios?: string[];
    coverUrl?: string;
    totalCount?: number;
    hasVideo?: boolean;
    hasAudio?: boolean;
  };
  clientMeta?: {
    _id?: string;
    fullName: string;
    profileImage?: string;
    phone?: string;
    rating?: number | null;
    totalReviews?: number;
    totalJobs?: number;
    completedJobs?: number;
  };
  signalMeta?: {
    title?: string;
    description?: string;
    missionKind?: 'instant' | 'scheduled';
    missionKindLabel?: string;
    evidenceCount?: number;
    hasMedia?: boolean;
    amount?: number;
    amountText?: string;
    clientBudget?: number;
    clientBudgetText?: string;
    estimatedCommission?: number;
    estimatedCommissionText?: string;
    estimatedNetEarning?: number;
    estimatedNetEarningText?: string;
    requiredWalletBalance?: number;
    walletBalance?: number;
    isWalletEligible?: boolean;
    distanceMeters?: number | null;
    distanceText?: string;
    expiresAt?: string;
    responseWindowSeconds?: number;
    schedule?: {
      dateLabel?: string;
      dayLabel?: string;
      fullDateLabel?: string;
      timeLabel?: string;
    };
    location?: {
      address?: string;
    };
  };
  amount?: number;
  bidCount?: number;
  pendingBidCount?: number;
  acceptedBid?: {
    _id: string;
    proposedPrice: number;
    message?: string;
    status: 'pending' | 'accepted' | 'rejected';
    worker?: Worker | null;
  } | null;
  cardMeta?: MissionCardMeta;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  booking: string;
  customer: BookingPerson;
  worker: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: 'booking_accepted' | 'booking_cancelled' | 'job_started' | 'job_completed' | 'payment_received' | 'new_review' | 'worker_verified' | 'general';
  icon?: string;
  color?: string;
  booking?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
  userRole?: 'user' | 'worker';
}

export interface UserPreferences {
  notifications: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    jobAlerts: boolean;
    messages: boolean;
    promos: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    biometricsEnabled: boolean;
  };
}

export interface PaymentSummary {
  total: number;
  paid: number;
  payable: number;
  pending: number;
  cancelled: number;
  currency: string;
}

export interface PaymentEntry {
  _id: string;
  status: string;
  amount: number;
  workerEarning: number;
  createdAt: string;
  updatedAt: string;
  booking?: {
    _id: string;
    category?: string;
    description?: string;
    status?: string;
    bookingType?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    address?: string;
    paymentStatus?: string;
  };
  customer?: BookingPerson;
  worker?: BookingPerson;
}

export interface PaymentsResponse {
  payments: PaymentEntry[];
  summary: PaymentSummary;
  pagination?: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface HelpTopic {
  id: string;
  title: string;
  icon: string;
  color: string;
}

export interface HelpArticle {
  id: string;
  topicId: string;
  title: string;
  body: string;
  tags: string[];
}

export interface SupportChannel {
  id: string;
  title: string;
  subtitle: string;
  type: 'chat' | 'email' | 'community';
  action: string;
}

export interface ProfileData {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  address?: string;
  city?: string;
  category?: string;
  hourlyRate?: number;
  experience?: number;
  skills?: string[];
  isAvailable?: boolean;
  isActive?: boolean;
  deactivationReason?: string;
  deactivatedAt?: string | null;
  bio?: string;
}

// Fetch Functions
const fetchCategories = async (): Promise<Category[]> => {
  const response = await api.get('/users/categories');
  return response.data.data;
};

const fetchWorker = async (id: string, category?: string): Promise<Worker> => {
  const response = await api.get(`/users/workers/${id}`, {
    params: { category },
  });
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

const fetchClientHomeSummary = async (): Promise<ClientHomeSummary> => {
  const response = await api.get('/bookings/home-summary', {
    params: { recentLimit: 3 },
  });
  return response.data.data || {
    stats: {
      total: 0,
      active: 0,
      completed: 0,
      successRate: 0,
      successRateLabel: '100%',
      totalSpent: 0,
    },
    recentBookings: [],
  };
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

const fetchWorkerReviews = async (workerId: string): Promise<Review[]> => {
  const response = await api.get(`/reviews/worker/${workerId}`);
  return response.data.data || [];
};

const fetchNotifications = async (): Promise<NotificationsResponse> => {
  const response = await api.get('/notifications/my-notifications', {
    params: { limit: 50 },
  });
  return {
    notifications: response.data.notifications || [],
    total: response.data.total || 0,
    unreadCount: response.data.unreadCount || 0,
    userRole: response.data.userRole,
  };
};

const fetchProfile = async (id: string, role: 'client' | 'worker'): Promise<ProfileData> => {
  const endpoint = role === 'worker' ? `/workers/${id}` : `/users/${id}`;
  const response = await api.get(endpoint);
  return response.data.data;
};

const fetchPreferences = async (): Promise<UserPreferences> => {
  const response = await api.get('/preferences/my');
  return response.data.data;
};

const fetchMyPayments = async (): Promise<PaymentsResponse> => {
  const response = await api.get('/payments/my-payments');
  return response.data.data;
};

const fetchHelpTopics = async (): Promise<HelpTopic[]> => {
  const response = await api.get('/support/topics');
  return response.data.data || [];
};

const fetchHelpChannels = async (): Promise<SupportChannel[]> => {
  const response = await api.get('/support/channels');
  return response.data.data || [];
};

const fetchHelpSearch = async (query: string): Promise<HelpArticle[]> => {
  const response = await api.get('/support/search', {
    params: { query },
  });
  return response.data.data || [];
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

export function useWorker(
  id: string | undefined,
  categoryOrOptions?: string | Omit<UseQueryOptions<Worker>, 'queryKey' | 'queryFn'>,
  maybeOptions?: Omit<UseQueryOptions<Worker>, 'queryKey' | 'queryFn'>
) {
  const category = typeof categoryOrOptions === 'string' ? categoryOrOptions : undefined;
  const options = typeof categoryOrOptions === 'string' ? maybeOptions : categoryOrOptions;
  return useQuery<Worker>({
    queryKey: queryKeys.workers.detail(id || '', category),
    queryFn: () => fetchWorker(id!, category),
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

export function useClientHomeSummary(options?: Omit<UseQueryOptions<ClientHomeSummary>, 'queryKey' | 'queryFn'>) {
  return useQuery<ClientHomeSummary>({
    queryKey: queryKeys.bookings.homeSummary(),
    queryFn: fetchClientHomeSummary,
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

export function useWorkerReviews(workerId: string | undefined, options?: Omit<UseQueryOptions<Review[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Review[]>({
    queryKey: queryKeys.reviews.byWorker(workerId || ''),
    queryFn: () => fetchWorkerReviews(workerId!),
    enabled: !!workerId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    ...options,
  });
}

export function useNotifications(options?: Omit<UseQueryOptions<NotificationsResponse>, 'queryKey' | 'queryFn'>) {
  return useQuery<NotificationsResponse>({
    queryKey: queryKeys.notifications.list(),
    queryFn: fetchNotifications,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

export function usePreferences(options?: Omit<UseQueryOptions<UserPreferences>, 'queryKey' | 'queryFn'>) {
  return useQuery<UserPreferences>({
    queryKey: queryKeys.preferences.current(),
    queryFn: fetchPreferences,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

export function useMyPayments(options?: Omit<UseQueryOptions<PaymentsResponse>, 'queryKey' | 'queryFn'>) {
  return useQuery<PaymentsResponse>({
    queryKey: queryKeys.wallet.transactions(),
    queryFn: fetchMyPayments,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

export function useHelpTopics(options?: Omit<UseQueryOptions<HelpTopic[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<HelpTopic[]>({
    queryKey: queryKeys.helpCenter.topics(),
    queryFn: fetchHelpTopics,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
    ...options,
  });
}

export function useHelpChannels(options?: Omit<UseQueryOptions<SupportChannel[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<SupportChannel[]>({
    queryKey: queryKeys.helpCenter.channels(),
    queryFn: fetchHelpChannels,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
    ...options,
  });
}

export function useHelpSearch(
  query: string,
  options?: Omit<UseQueryOptions<HelpArticle[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<HelpArticle[]>({
    queryKey: queryKeys.helpCenter.search(query),
    queryFn: () => fetchHelpSearch(query),
    enabled: query.length > 0,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    ...options,
  });
}

export function useProfile(
  id: string | undefined,
  role: 'client' | 'worker' | null,
  options?: Omit<UseQueryOptions<ProfileData>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProfileData>({
    queryKey: [...queryKeys.profile.current(), role, id],
    queryFn: () => fetchProfile(id!, role as 'client' | 'worker'),
    enabled: !!id && !!role,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    ...options,
  });
}
