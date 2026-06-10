import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { queryKeys } from '../../lib/queryKeyFactory';

// Types
interface JobCreationPayload {
  category: string;
  description: string;
  urgency: 'instant' | 'scheduled';
  address: string;
  longitude: number;
  latitude: number;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  audioUrls?: string[];
  amount?: number;
  targetWorkerId?: string;
  scheduledDate?: Date;
  scheduledTime?: string;
}

interface JobResponse {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
}

interface BidSubmissionPayload {
  jobId: string;
  amount: number;
  description: string;
  estimatedDays?: number;
}

interface AcceptBidPayload {
  jobId: string;
  bidId: string;
  promoCode?: string;
}

interface CancelJobPayload {
  jobId: string;
}

interface UpdateBookingStatusPayload {
  bookingId: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  cancelReason?: string;
}

interface WithdrawBidPayload {
  bidId: string;
}

interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  category?: string;
  hourlyRate?: number;
  profileImage?: string;
}

interface SendMessagePayload {
  bookingId: string;
  message: string;
  messageType?: 'text' | 'audio';
  audioUrl?: string;
  audioDurationSeconds?: number;
}

interface PayBookingPayload {
  bookingId: string;
  paymentMethod: 'cash';
}

interface CreateReviewPayload {
  booking: string;
  worker: string;
  rating: number;
  comment?: string;
}

interface MarkNotificationReadPayload {
  notificationId: string;
}

interface UpdateProfilePayload {
  role: 'client' | 'worker';
  id: string;
  data: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    profileImage?: string;
    // Worker-only fields
    bio?: string;
    hourlyRate?: number;
    experience?: number;
    skills?: string[];
    isAvailable?: boolean;
  };
}

interface ChangePasswordPayload {
  role: 'client' | 'worker';
  id: string;
  oldPassword: string;
  newPassword: string;
}

interface UpdatePreferencesPayload {
  notifications?: {
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    jobAlerts?: boolean;
    messages?: boolean;
    promos?: boolean;
  };
  security?: {
    twoFactorEnabled?: boolean;
    biometricsEnabled?: boolean;
  };
}

interface LogoutAllSessionsPayload {
  role: 'client' | 'worker';
  id: string;
}

interface SupportRequestPayload {
  subject?: string;
  message: string;
  name?: string;
  email?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Mutation Functions
const createJob = async (payload: JobCreationPayload): Promise<JobResponse> => {
  const response = await api.post('/jobs', payload);
  return response.data.data;
};

const submitBid = async (payload: BidSubmissionPayload): Promise<any> => {
  const { jobId, ...bidData } = payload;
  const response = await api.post(`/jobs/${jobId}/bids`, bidData);
  return response.data.data;
};

const acceptBid = async (payload: AcceptBidPayload): Promise<any> => {
  const { jobId, bidId, promoCode } = payload;
  const response = await api.post(`/jobs/${jobId}/bids/${bidId}/accept`, { promoCode });
  return response.data.data;
};

const cancelJob = async (payload: CancelJobPayload): Promise<any> => {
  const response = await api.post(`/jobs/${payload.jobId}/cancel`);
  return response.data.data;
};

const acceptInstantJob = async (jobId: string): Promise<any> => {
  const response = await api.post(`/jobs/${jobId}/accept-instant`);
  return response.data.data;
};

const updateBookingStatus = async (payload: UpdateBookingStatusPayload): Promise<any> => {
  const { bookingId, status, cancelReason } = payload;
  const response = await api.patch(`/bookings/${bookingId}/status`, { status, cancelReason });
  return response.data.data;
};

const withdrawBid = async (payload: WithdrawBidPayload): Promise<any> => {
  const response = await api.delete(`/jobs/bids/${payload.bidId}`);
  return response.data.data;
};

const payBooking = async (payload: PayBookingPayload): Promise<any> => {
  const { bookingId, ...paymentData } = payload;
  const response = await api.post(`/bookings/${bookingId}/pay`, paymentData);
  return response.data.data;
};

const createReview = async (payload: CreateReviewPayload): Promise<any> => {
  const response = await api.post('/reviews', payload);
  return response.data.data;
};

const markNotificationRead = async (payload: MarkNotificationReadPayload): Promise<any> => {
  const response = await api.post('/notifications/mark-read', payload);
  return response.data;
};

const updateProfile = async (payload: UpdateProfilePayload): Promise<any> => {
  const endpoint = payload.role === 'worker' ? `/workers/${payload.id}` : `/users/${payload.id}`;
  const response = await api.patch(endpoint, payload.data);
  return response.data.data;
};

const changePassword = async (payload: ChangePasswordPayload): Promise<any> => {
  const endpoint = payload.role === 'worker'
    ? `/workers/${payload.id}/change-password`
    : `/users/${payload.id}/change-password`;
  const response = await api.put(endpoint, {
    oldPassword: payload.oldPassword,
    newPassword: payload.newPassword,
  });
  return response.data.data;
};

const updatePreferences = async (payload: UpdatePreferencesPayload): Promise<any> => {
  const response = await api.put('/preferences/my', payload);
  return response.data.data;
};

const logoutAllSessions = async (payload: LogoutAllSessionsPayload): Promise<any> => {
  const endpoint = payload.role === 'worker'
    ? `/workers/${payload.id}/logout-all`
    : `/users/${payload.id}/logout-all`;
  const response = await api.post(endpoint);
  return response.data.data;
};

const createSupportRequest = async (payload: SupportRequestPayload): Promise<any> => {
  const response = await api.post('/support/requests', payload);
  return response.data.data;
};

const registerUser = async (payload: RegisterPayload & { role: 'client' | 'worker' }): Promise<any> => {
  const endpoint = payload.role === 'worker' ? '/workers/register' : '/users/register';
  const response = await api.post(endpoint, payload);
  return response.data.data;
};

const sendMessage = async (payload: SendMessagePayload): Promise<any> => {
  const { bookingId, ...messageData } = payload;
  const response = await api.post(`/messages/${bookingId}`, messageData);
  return response.data.data;
};

const uploadJobImages = async (formData: FormData): Promise<JobMediaUploadResponse> => {
  const response = await api.post('/jobs/upload-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

// Mutation Hooks
export function useCreateJobMutation(options?: Omit<UseMutationOptions<JobResponse, Error, JobCreationPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<JobResponse, Error, JobCreationPayload>({
    mutationFn: createJob,
    onSuccess: (data) => {
      // Invalidate all jobs queries (list, myPosts, nearby, detail) to refresh list
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
    ...options,
  });
}

export function useSubmitBidMutation(options?: Omit<UseMutationOptions<any, Error, BidSubmissionPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, BidSubmissionPayload>({
    mutationFn: submitBid,
    onSuccess: (data, variables) => {
      // Invalidate bids for this job
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byJob(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byWorker() });
    },
    ...options,
  });
}

export function useAcceptBidMutation(options?: Omit<UseMutationOptions<any, Error, AcceptBidPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, AcceptBidPayload>({
    mutationFn: acceptBid,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byJob(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byWorker() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.myBookings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byWorker() });
    },
    ...options,
  });
}

export function useCancelJobMutation(options?: Omit<UseMutationOptions<any, Error, CancelJobPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, CancelJobPayload>({
    mutationFn: cancelJob,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byWorker() });
    },
    ...options,
  });
}

export function useAcceptInstantJobMutation(options?: Omit<UseMutationOptions<any, Error, string>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: acceptInstantJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byWorker() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.myBookings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
    },
    ...options,
  });
}

export function useUpdateBookingStatusMutation(options?: Omit<UseMutationOptions<any, Error, UpdateBookingStatusPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateBookingStatusPayload>({
    mutationFn: updateBookingStatus,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.myBookings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byWorker() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.transactions() });
    },
    ...options,
  });
}

export function useWithdrawBidMutation(options?: Omit<UseMutationOptions<any, Error, WithdrawBidPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, WithdrawBidPayload>({
    mutationFn: withdrawBid,
    ...options,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byWorker() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export function usePayBookingMutation(options?: Omit<UseMutationOptions<any, Error, PayBookingPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, PayBookingPayload>({
    mutationFn: payBooking,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.myBookings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.transactions() });
    },
    ...options,
  });
}

export function useCreateReviewMutation(options?: Omit<UseMutationOptions<any, Error, CreateReviewPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, CreateReviewPayload>({
    mutationFn: createReview,
    ...options,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.booking) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.myBookings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.detail(variables.worker) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byWorker(variables.worker) });
      options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export function useMarkNotificationReadMutation(options?: Omit<UseMutationOptions<any, Error, MarkNotificationReadPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, MarkNotificationReadPayload>({
    mutationFn: markNotificationRead,
    ...options,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}

export function useUpdateProfileMutation(options?: Omit<UseMutationOptions<any, Error, UpdateProfilePayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateProfilePayload>({
    mutationFn: updateProfile,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.current() });
      if (variables.role === 'worker') {
        queryClient.invalidateQueries({ queryKey: queryKeys.workers.detail(variables.id) });
      }
    },
    ...options,
  });
}

export function useChangePasswordMutation(options?: Omit<UseMutationOptions<any, Error, ChangePasswordPayload>, 'mutationFn'>) {
  return useMutation<any, Error, ChangePasswordPayload>({
    mutationFn: changePassword,
    ...options,
  });
}

export function useUpdatePreferencesMutation(options?: Omit<UseMutationOptions<any, Error, UpdatePreferencesPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdatePreferencesPayload>({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.current() });
    },
    ...options,
  });
}

export function useLogoutAllSessionsMutation(options?: Omit<UseMutationOptions<any, Error, LogoutAllSessionsPayload>, 'mutationFn'>) {
  return useMutation<any, Error, LogoutAllSessionsPayload>({
    mutationFn: logoutAllSessions,
    ...options,
  });
}

export function useCreateSupportRequestMutation(options?: Omit<UseMutationOptions<any, Error, SupportRequestPayload>, 'mutationFn'>) {
  return useMutation<any, Error, SupportRequestPayload>({
    mutationFn: createSupportRequest,
    ...options,
  });
}

export function useRegisterMutation(options?: Omit<UseMutationOptions<any, Error, RegisterPayload & { role: 'client' | 'worker' }>, 'mutationFn'>) {
  return useMutation<any, Error, RegisterPayload & { role: 'client' | 'worker' }>({
    mutationFn: registerUser,
    ...options,
  });
}

export function useSendMessageMutation(options?: Omit<UseMutationOptions<any, Error, SendMessagePayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, SendMessagePayload>({
    mutationFn: sendMessage,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.byBooking(variables.bookingId) });
    },
    ...options,
  });
}

type JobMediaUploadResponse = { imageUrls: string[]; videoUrls: string[]; audioUrls: string[] };

export function useUploadJobImagesMutation(options?: Omit<UseMutationOptions<JobMediaUploadResponse, Error, FormData>, 'mutationFn'>) {
  return useMutation<JobMediaUploadResponse, Error, FormData>({
    mutationFn: uploadJobImages,
    ...options,
  });
}
