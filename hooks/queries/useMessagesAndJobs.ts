import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../../services/api';
import { queryKeys } from '../../lib/queryKeyFactory';

// Types
export interface Message {
  _id: string;
  sender: string;
  senderModel: 'User' | 'Worker';
  content: string;
  messageType?: 'text' | 'audio';
  audioUrl?: string;
  audioDurationSeconds?: number;
  booking?: string;
  readAt?: string;
  createdAt: string;
}

export interface Job {
  _id: string;
  description: string;
  category: string;
  urgency?: 'instant' | 'scheduled';
  status: 'open' | 'assigned' | 'closed' | 'cancelled' | 'reviewing' | 'in-progress' | 'ongoing' | 'completed';
  customer?: string | {
    _id: string;
    fullName?: string;
    profileImage?: string;
    phone?: string;
  };
  worker?: string | {
    _id: string;
    fullName?: string;
    profileImage?: string;
    phone?: string;
  };
  clientId?: string;
  address?: string;
  amount?: number;
  budget?: number;
  scheduledDate?: string;
  scheduledTime?: string;
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
    walletTotalBalance?: number;
    walletReservedBalance?: number;
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
  detailMeta?: {
    statusInfo?: {
      value: string;
      label: string;
      tone: string;
      accentColor: string;
    };
    missionKind?: 'instant' | 'scheduled';
    missionKindLabel?: string;
    schedule?: {
      dateLabel?: string;
      dayLabel?: string;
      fullDateLabel?: string;
      timeLabel?: string;
    };
    location?: {
      address?: string;
    };
    financial?: {
      label: string;
      amount: number;
      amountText?: string;
      currency: string;
    };
    bidSummary?: {
      total: number;
      pending: number;
      hasAcceptedBid: boolean;
    };
    media?: {
      images: string[];
      videos: string[];
      audios?: string[];
      coverUrl?: string;
      totalCount?: number;
      hasVideo?: boolean;
      hasAudio?: boolean;
    };
  };
  bidCount?: number;
  pendingBidCount?: number;
  location?: string | {
    type: 'Point';
    coordinates: number[];
  };
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  _id: string;
  jobPost?: Job | string;
  worker?: string | {
    _id: string;
    fullName?: string;
    profileImage?: string;
    averageRating?: number;
    rating?: number;
    totalReviews?: number;
    totalJobs?: number;
    hourlyRate?: number;
    category?: string;
    experience?: number;
    city?: string;
    address?: string;
    bio?: string;
    skills?: string[];
    isVerified?: boolean;
    isAvailable?: boolean;
  };
  jobId?: string;
  workerId?: string;
  amount?: number;
  description?: string;
  message?: string;
  proposedPrice?: number;
  estimatedDays?: number;
  status: 'pending' | 'accepted' | 'rejected';
  cardMeta?: {
    source: 'worker_bid';
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
    };
    schedule?: {
      dateLabel?: string;
      dayLabel?: string;
      fullDateLabel?: string;
      timeLabel?: string;
    };
    location?: {
      address?: string;
    };
    counterParty?: {
      _id?: string;
      fullName: string;
      profileImage?: string;
      phone?: string;
      roleLabel: string;
      totalJobs?: number;
      completedJobs?: number;
    };
    financial?: {
      label: string;
      amount: number;
      amountText?: string;
      currency: string;
    };
    actionLabel?: string;
    submittedAt?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

// Fetch Functions
const fetchMessages = async (bookingId: string): Promise<Message[]> => {
  const response = await api.get(`/messages/${bookingId}`);
  return response.data.data || [];
};

const fetchNearbyJobs = async (longitude?: number, latitude?: number): Promise<Job[]> => {
  const response = await api.get('/jobs/nearby', {
    params: longitude !== undefined && latitude !== undefined
      ? { longitude, latitude }
      : undefined,
  });
  return response.data.data || [];
};

const fetchJobDetails = async (id: string): Promise<Job> => {
  const response = await api.get(`/jobs/${id}`);
  return response.data.data;
};

const fetchBidsByJob = async (jobId: string): Promise<Bid[]> => {
  const response = await api.get(`/jobs/${jobId}/bids`);
  return response.data.data || [];
};

const fetchWorkerBids = async (): Promise<Bid[]> => {
  const response = await api.get('/jobs/my-bids', {
    params: { status: 'pending', limit: 20 },
  });
  return response.data.data || [];
};

// Query Hooks
export function useMessages(bookingId: string | undefined, options?: Omit<UseQueryOptions<Message[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Message[]>({
    queryKey: queryKeys.messages.byBooking(bookingId || ''),
    queryFn: () => fetchMessages(bookingId!),
    enabled: !!bookingId,
    staleTime: 0, // Always fresh for messages
    gcTime: 1000 * 60 * 5,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
    ...options,
  });
}

export function useNearbyJobs(longitude?: number, latitude?: number, options?: Omit<UseQueryOptions<Job[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Job[]>({
    queryKey: queryKeys.jobs.nearby(longitude, latitude),
    queryFn: () => fetchNearbyJobs(longitude, latitude),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

export function useJobDetails(id: string | undefined, options?: Omit<UseQueryOptions<Job>, 'queryKey' | 'queryFn'>) {
  return useQuery<Job>({
    queryKey: queryKeys.jobs.detail(id || ''),
    queryFn: () => fetchJobDetails(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    ...options,
  });
}

export function useBidsByJob(jobId: string | undefined, options?: Omit<UseQueryOptions<Bid[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Bid[]>({
    queryKey: queryKeys.bids.byJob(jobId || ''),
    queryFn: () => fetchBidsByJob(jobId!),
    enabled: !!jobId,
    staleTime: 1000 * 60 * 2, // 2 minutes - bids are somewhat time-sensitive
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

export function useWorkerBids(options?: Omit<UseQueryOptions<Bid[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Bid[]>({
    queryKey: queryKeys.bids.byWorker(),
    queryFn: fetchWorkerBids,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}
