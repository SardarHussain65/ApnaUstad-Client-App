import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import api from '../../services/api';
import { queryKeys } from '../../lib/queryKeyFactory';

export interface WorkerWallet {
  _id: string;
  worker: string;
  balance: number;
  reservedBalance?: number;
  availableBalance?: number;
  totalRecharged: number;
  totalCommissionDeducted: number;
  isActive: boolean;
  lastRechargedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requiredBalance?: number;
  platformFeePercentage?: number;
  commissionEnabled?: boolean;
  isEligibleForNewJobs?: boolean;
}

export interface WalletTransaction {
  _id: string;
  wallet: string;
  worker: string;
  type: 'recharge' | 'commission_deduction' | 'refund' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference?: {
    booking?: string;
    payment?: string;
    topUpRequest?: string;
  };
  performedBy: {
    actor: string;
    actorType: 'worker' | 'admin';
  };
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsResponse {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalletPaymentMethod {
  method: 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'other';
  label: string;
  accountTitle?: string;
  accountNumber?: string;
  bankName?: string;
  iban?: string;
  instructions?: string;
  isConfigured?: boolean;
}

export interface WalletTopUpRequest {
  _id: string;
  requestId: string;
  worker: string;
  wallet: string;
  amount: number;
  method: WalletPaymentMethod['method'];
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentDetailsSnapshot: WalletPaymentMethod;
  adminNotes?: string;
  rejectionReason?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TopUpsResponse {
  requests: WalletTopUpRequest[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

const fetchWorkerWallet = async (): Promise<WorkerWallet> => {
  const response = await api.get('/wallet/my-wallet');
  return response.data.data;
};

const fetchWalletTransactions = async (page = 1, limit = 10): Promise<TransactionsResponse> => {
  const response = await api.get('/wallet/transactions', {
    params: { page, limit },
  });
  return response.data.data;
};

const fetchPaymentMethods = async (): Promise<WalletPaymentMethod[]> => {
  const response = await api.get('/wallet/payment-methods');
  return response.data.data;
};

const fetchTopUps = async (page = 1, limit = 20): Promise<TopUpsResponse> => {
  const response = await api.get('/wallet/topups', {
    params: { page, limit },
  });
  return response.data.data;
};

const createTopUpRequest = async (formData: FormData): Promise<WalletTopUpRequest> => {
  const response = await api.post('/wallet/topups', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export function useWorkerWallet(options?: Omit<UseQueryOptions<WorkerWallet, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<WorkerWallet, Error>({
    queryKey: queryKeys.wallet.balance(),
    queryFn: fetchWorkerWallet,
    ...options,
  });
}

export function useWalletTransactions(
  page = 1,
  limit = 10,
  options?: Omit<UseQueryOptions<TransactionsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TransactionsResponse, Error>({
    queryKey: [...queryKeys.wallet.transactions(), page, limit],
    queryFn: () => fetchWalletTransactions(page, limit),
    ...options,
  });
}

export function useWalletPaymentMethods(options?: Omit<UseQueryOptions<WalletPaymentMethod[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<WalletPaymentMethod[], Error>({
    queryKey: queryKeys.wallet.paymentMethods(),
    queryFn: fetchPaymentMethods,
    ...options,
  });
}

export function useWalletTopUps(
  page = 1,
  limit = 20,
  options?: Omit<UseQueryOptions<TopUpsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TopUpsResponse, Error>({
    queryKey: [...queryKeys.wallet.topUps(), page, limit],
    queryFn: () => fetchTopUps(page, limit),
    ...options,
  });
}

export function useCreateWalletTopUpMutation(options?: Omit<UseMutationOptions<WalletTopUpRequest, Error, FormData>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation<WalletTopUpRequest, Error, FormData>({
    mutationFn: createTopUpRequest,
    ...options,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.transactions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.topUps() });
      options?.onSuccess?.(data, variables, context, mutation);
    },
  });
}
