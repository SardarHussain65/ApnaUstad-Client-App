import { useInfiniteQuery, useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import api from '../../services/api';
import { queryKeys } from '../../lib/queryKeyFactory';

export type DisputeReason =
  | 'incomplete_work'
  | 'unfair_pricing'
  | 'no_show'
  | 'poor_quality'
  | 'payment_issue'
  | 'other';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'dismissed' | 'withdrawn';
export type DisputePhase = 'reported' | 'checking' | 'closed';
export type DisputeOutcome = 'customer_favor' | 'worker_favor' | 'settled' | null;
export type DisputePartyType = 'customer' | 'worker' | 'admin' | 'system';

export const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = ['open', 'under_review'];
export const isDisputeStatusClosed = (status?: string | null) =>
  status === 'resolved' || status === 'dismissed' || status === 'withdrawn';

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

export interface DisputeTimelineEvent {
  type: 'opened' | 'evidence_added' | 'under_review' | 'withdrawn' | 'resolved' | 'dismissed' | 'closed';
  actorType: DisputePartyType;
  actorName?: string;
  note?: string;
  at: string;
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
    scheduledDate?: string;
    scheduledTime?: string;
  } | string;
  customer?: { _id?: string; fullName?: string; profileImage?: string };
  worker?: { _id?: string; fullName?: string; profileImage?: string };
  raisedByType: 'customer' | 'worker';
  reason: DisputeReason;
  reasonLabel?: string;
  description: string;
  status: DisputeStatus;
  amountDisputed: number;
  proofImages?: string[];
  resolutionDetails?: string;
  resolvedBy?: { fullName?: string } | string;
  resolvedAt?: string;
  closedAt?: string | null;
  moderationApplied?: {
    warnedCustomer?: boolean;
    warnedWorker?: boolean;
    workerPenalty?: number;
    workerCommissionRefund?: number;
    customerRefund?: number;
    customerBlocked?: boolean;
    workerBlocked?: boolean;
  };
  // Case Room fields (computed by the server for the viewer)
  timeline?: DisputeTimelineEvent[];
  phase?: DisputePhase;
  isClosed?: boolean;
  outcome?: DisputeOutcome;
  outcomeLabel?: string;
  myRole?: 'customer' | 'worker';
  isRaisedByMe?: boolean;
  canChat?: boolean;
  canWithdraw?: boolean;
  unreadCount?: number;
  messageCount?: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string;
  lastMessageSenderType?: DisputePartyType | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeMessage {
  _id: string;
  dispute: string;
  disputeId?: string;
  senderType: DisputePartyType;
  sender?: string | null;
  senderName?: string;
  content: string;
  attachments: string[];
  kind: 'message' | 'system' | 'decision';
  replyTo?: string | null;
  replySnapshot?: { content: string; senderType: DisputePartyType; senderName?: string } | null;
  createdAt: string;
  /** Client-only flag for optimistic messages */
  pending?: boolean;
}

export interface RaiseDisputePayload {
  bookingId: string;
  reason: DisputeReason;
  description: string;
  proofImages?: string[];
}

export type DisputeScope = 'active' | 'history' | 'all';

const fetchMyDisputes = async (scope: DisputeScope = 'all'): Promise<DisputeRecord[]> => {
  const response = await api.get('/disputes/my', { params: scope === 'all' ? undefined : { scope } });
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

/** Upload evidence photos. Works for both customers and Ustads. */
export const uploadDisputeEvidence = async (
  assets: Array<{ uri: string; fileName?: string | null; mimeType?: string | null }>
): Promise<string[]> => {
  const formData = new FormData();
  assets.forEach((asset, index) => {
    formData.append('images', {
      uri: asset.uri,
      name: asset.fileName || `dispute-evidence-${Date.now()}-${index}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    } as any);
  });
  const response = await api.post('/disputes/upload-evidence', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data?.imageUrls || [];
};

export function useMyDisputes(
  scope: DisputeScope = 'all',
  options?: Omit<UseQueryOptions<DisputeRecord[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DisputeRecord[]>({
    queryKey: [...queryKeys.disputes.my(), scope],
    queryFn: () => fetchMyDisputes(scope),
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

/* ─────────────────────────── Case Room ─────────────────────────── */

export function useDisputeDetail(disputeId: string | undefined) {
  return useQuery<DisputeRecord>({
    queryKey: queryKeys.disputes.detail(disputeId || ''),
    queryFn: async () => {
      const response = await api.get(`/disputes/${disputeId}`);
      return response.data?.data;
    },
    enabled: !!disputeId,
    staleTime: 1000 * 10,
  });
}

type MessagesPage = { messages: DisputeMessage[]; hasMore: boolean };

export function useDisputeMessages(disputeId: string | undefined) {
  return useInfiniteQuery<MessagesPage>({
    queryKey: queryKeys.disputes.messages(disputeId || ''),
    queryFn: async ({ pageParam }) => {
      const response = await api.get(`/disputes/${disputeId}/messages`, {
        params: { limit: 40, ...(pageParam ? { before: pageParam } : {}) },
      });
      return response.data?.data || { messages: [], hasMore: false };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasMore || !lastPage.messages.length) return undefined;
      return lastPage.messages[lastPage.messages.length - 1].createdAt;
    },
    enabled: !!disputeId,
  });
}

export function useSendDisputeMessage(disputeId: string) {
  return useMutation({
    mutationFn: async (payload: { content?: string; attachments?: string[]; replyTo?: string | null }) => {
      const response = await api.post(`/disputes/${disputeId}/messages`, payload);
      return response.data?.data as DisputeMessage;
    },
  });
}

export function useWithdrawDispute(disputeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (note: string) => {
      const response = await api.post(`/disputes/${disputeId}/withdraw`, { note });
      return response.data?.data as DisputeRecord;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.disputes.detail(disputeId), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export const markDisputeReadRequest = async (disputeId: string) => {
  try {
    await api.post(`/disputes/${disputeId}/read`);
  } catch {
    // non-critical
  }
};
