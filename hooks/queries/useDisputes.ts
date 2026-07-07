import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../../services/api';
import { queryKeys } from '../../lib/queryKeyFactory';

export type DisputeReason =
  | 'incomplete_work'
  | 'unfair_pricing'
  | 'no_show'
  | 'poor_quality'
  | 'payment_issue'
  | 'other';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export interface BookingDisputeMeta {
  hasDispute: boolean;
  disputeId: string | null;
  disputeStatus: DisputeStatus | null;
  canRaiseDispute: boolean;
  canRaiseDisputeReason?: string;
  bookingAmount?: number;
  amountDisputed?: number;
  raisedByType?: 'customer' | 'worker';
  statusLabel?: string;
  nextStep?: string;
}

export interface DisputeRecord {
  _id: string;
  booking: {
    _id: string;
    category?: string;
    status?: string;
    paymentStatus?: string;
    totalAmount?: number;
    completedAt?: string;
  } | string;
  customer?: { fullName?: string; profileImage?: string };
  worker?: { fullName?: string; profileImage?: string };
  raisedByType: 'customer' | 'worker';
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  amountDisputed: number;
  proofImages?: string[];
  resolutionDetails?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RaiseDisputePayload {
  bookingId: string;
  reason: DisputeReason;
  description: string;
  proofImages?: string[];
}

const fetchMyDisputes = async (): Promise<DisputeRecord[]> => {
  const response = await api.get('/disputes/my');
  return response.data?.data || [];
};

const fetchBookingDisputeContext = async (bookingId: string): Promise<{
  dispute: DisputeRecord | null;
  eligibility: BookingDisputeMeta;
}> => {
  const response = await api.get(`/disputes/booking/${bookingId}`);
  return response.data?.data || { dispute: null, eligibility: { hasDispute: false, disputeId: null, disputeStatus: null, canRaiseDispute: false } };
};

export const raiseDisputeRequest = async (payload: RaiseDisputePayload) => {
  const response = await api.post('/disputes', payload);
  return response.data?.data as DisputeRecord;
};

export function useMyDisputes(options?: Omit<UseQueryOptions<DisputeRecord[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<DisputeRecord[]>({
    queryKey: queryKeys.disputes.my(),
    queryFn: fetchMyDisputes,
    staleTime: 1000 * 30,
    ...options,
  });
}

export function useBookingDisputeContext(
  bookingId: string | undefined,
  options?: Omit<UseQueryOptions<{ dispute: DisputeRecord | null; eligibility: BookingDisputeMeta }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.disputes.byBooking(bookingId || ''),
    queryFn: () => fetchBookingDisputeContext(bookingId!),
    enabled: !!bookingId,
    staleTime: 1000 * 15,
    ...options,
  });
}
