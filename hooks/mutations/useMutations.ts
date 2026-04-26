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
}

interface UpdateBookingStatusPayload {
  bookingId: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
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
  const { jobId, bidId } = payload;
  const response = await api.post(`/jobs/${jobId}/bids/${bidId}/accept`);
  return response.data.data;
};

const acceptInstantJob = async (jobId: string): Promise<any> => {
  const response = await api.post(`/jobs/${jobId}/accept-instant`);
  return response.data.data;
};

const updateBookingStatus = async (payload: UpdateBookingStatusPayload): Promise<any> => {
  const { bookingId, status } = payload;
  const response = await api.patch(`/bookings/${bookingId}/status`, { status });
  return response.data.data;
};

const registerUser = async (payload: RegisterPayload & { role: 'client' | 'worker' }): Promise<any> => {
  const endpoint = payload.role === 'worker' ? '/workers/register' : '/users/register';
  const response = await api.post(endpoint, payload);
  return response.data.data;
};

const sendMessage = async (payload: SendMessagePayload): Promise<any> => {
  const { bookingId, message } = payload;
  const response = await api.post(`/messages/${bookingId}`, { message });
  return response.data.data;
};

const uploadJobImages = async (formData: FormData): Promise<{ imageUrls: string[] }> => {
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
      // Invalidate jobs list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.list() });
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
    },
    ...options,
  });
}

export function useAcceptBidMutation(options?: Omit<UseMutationOptions<any, Error, AcceptBidPayload>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, AcceptBidPayload>({
    mutationFn: acceptBid,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bids.byJob(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.myBookings() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.myBookings() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.transactions() });
    },
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

export function useUploadJobImagesMutation(options?: Omit<UseMutationOptions<{ imageUrls: string[] }, Error, FormData>, 'mutationFn'>) {
  return useMutation<{ imageUrls: string[] }, Error, FormData>({
    mutationFn: uploadJobImages,
    ...options,
  });
}
