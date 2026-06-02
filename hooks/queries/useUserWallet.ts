import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../../services/api';

export interface UserWallet {
  _id: string;
  user: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserWalletTransaction {
  _id: string;
  wallet: string;
  user: string;
  type: 'refund' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference?: {
    booking?: string;
    dispute?: string;
  };
  performedBy: {
    actor: string;
    actorType: 'user' | 'admin';
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserWalletResponse {
  wallet: UserWallet;
  transactions: UserWalletTransaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const fetchUserWallet = async (page = 1, limit = 10): Promise<UserWalletResponse> => {
  const response = await api.get('/user-wallet/my', {
    params: { page, limit },
  });
  return response.data.data;
};

export const userWalletKeys = {
  all: ['userWallet'] as const,
  details: (page: number, limit: number) => [...userWalletKeys.all, 'details', page, limit] as const,
};

export function useUserWallet(
  page = 1,
  limit = 10,
  options?: Omit<UseQueryOptions<UserWalletResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<UserWalletResponse, Error>({
    queryKey: userWalletKeys.details(page, limit),
    queryFn: () => fetchUserWallet(page, limit),
    ...options,
  });
}
