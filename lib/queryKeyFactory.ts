/**
 * Query Key Factory
 * Centralized management of all React Query keys
 * Ensures consistency and prevents typos
 */

export const queryKeys = {
  // Categories
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all] as const,
  },

  // Workers
  workers: {
    all: ['workers'] as const,
    list: () => [...queryKeys.workers.all] as const,
    detail: (id: string) => [...queryKeys.workers.all, 'detail', id] as const,
    byCategory: (category: string) => [...queryKeys.workers.all, 'category', category] as const,
  },

  // Bookings
  bookings: {
    all: ['bookings'] as const,
    list: () => [...queryKeys.bookings.all, 'list'] as const,
    myBookings: () => [...queryKeys.bookings.all, 'my-bookings'] as const,
    detail: (id: string) => [...queryKeys.bookings.all, 'detail', id] as const,
    byWorker: () => [...queryKeys.bookings.all, 'worker-bookings'] as const,
  },

  // Jobs
  jobs: {
    all: ['jobs'] as const,
    list: () => [...queryKeys.jobs.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.jobs.all, 'detail', id] as const,
    nearby: () => [...queryKeys.jobs.all, 'nearby'] as const,
  },

  // Bids
  bids: {
    all: ['bids'] as const,
    byJob: (jobId: string) => [...queryKeys.bids.all, 'job', jobId] as const,
  },

  // Messages/Chat
  messages: {
    all: ['messages'] as const,
    byBooking: (bookingId: string) => [...queryKeys.messages.all, 'booking', bookingId] as const,
  },

  // User Profile
  profile: {
    all: ['profile'] as const,
    current: () => [...queryKeys.profile.all, 'current'] as const,
  },

  // Wallet/Transactions
  wallet: {
    all: ['wallet'] as const,
    balance: () => [...queryKeys.wallet.all, 'balance'] as const,
    transactions: () => [...queryKeys.wallet.all, 'transactions'] as const,
  },
} as const;
