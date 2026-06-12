import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { queryKeys } from '../lib/queryKeyFactory';

export interface EarningsDataPoint {
  label: string;
  date?: string;
  earnings: number;
  jobs: number;
}

export interface WeeklyDataPoint extends EarningsDataPoint {
  week?: number;
  startDate?: string;
}

export interface MonthlyDataPoint extends EarningsDataPoint {
  month?: number;
  year?: number;
}

export interface EarningsSummary {
  todayEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  todayJobs: number;
  thisWeekJobs: number;
  thisMonthJobs?: number;
  bestDay: { label: string; earnings: number };
  streak: number;
  trendPercent: number;
}

export interface WorkerAnalyticsData {
  daily: EarningsDataPoint[];
  weekly: WeeklyDataPoint[];
  monthly: MonthlyDataPoint[];
  summary: EarningsSummary;
}

async function fetchWorkerAnalytics(): Promise<WorkerAnalyticsData> {
  const response = await api.get('/bookings/worker-earnings-analytics');
  return response.data.data;
}

export function useWorkerAnalytics() {
  return useQuery<WorkerAnalyticsData>({
    queryKey: queryKeys.bookings.earningsAnalytics(),
    queryFn: fetchWorkerAnalytics,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes cache
  });
}
