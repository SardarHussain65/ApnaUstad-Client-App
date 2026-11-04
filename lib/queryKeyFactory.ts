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
    detail: (id: string, category?: string) => [...queryKeys.workers.all, 'detail', id, category || ''] as const,
    byCategory: (category: string) => [...queryKeys.workers.all, 'category', category] as const,
  },

  // Bookings
  bookings: {
    all: ['bookings'] as const,
    list: () => [...queryKeys.bookings.all, 'list'] as const,
    myBookings: (userId?: string) => userId ? ([...queryKeys.bookings.all, 'my-bookings', userId] as const) : ([...queryKeys.bookings.all, 'my-bookings'] as const),
    homeSummary: (userId?: string) => userId ? ([...queryKeys.bookings.all, 'home-summary', userId] as const) : ([...queryKeys.bookings.all, 'home-summary'] as const),
    workerHomeSummary: (workerId?: string) => workerId ? ([...queryKeys.bookings.all, 'worker-home-summary', workerId] as const) : ([...queryKeys.bookings.all, 'worker-home-summary'] as const),
    detail: (id: string) => [...queryKeys.bookings.all, 'detail', id] as const,
    byWorker: (workerId?: string) => workerId ? ([...queryKeys.bookings.all, 'worker-bookings', workerId] as const) : ([...queryKeys.bookings.all, 'worker-bookings'] as const),
    earningsAnalytics: (workerId?: string) => workerId ? ([...queryKeys.bookings.all, 'earnings-analytics', workerId] as const) : ([...queryKeys.bookings.all, 'earnings-analytics'] as const),
  },

  // Jobs
  jobs: {
    all: ['jobs'] as const,
    list: () => [...queryKeys.jobs.all, 'list'] as const,
    myPosts: (userId?: string) => userId ? ([...queryKeys.jobs.all, 'my-posts', userId] as const) : ([...queryKeys.jobs.all, 'my-posts'] as const),
    detail: (id: string) => [...queryKeys.jobs.all, 'detail', id] as const,
    nearby: (lng?: number, lat?: number) => [...queryKeys.jobs.all, 'nearby', { lng, lat }] as const,
  },

  // Bids
  bids: {
    all: ['bids'] as const,
    byJob: (jobId: string) => [...queryKeys.bids.all, 'job', jobId] as const,
    byWorker: (workerId?: string) => workerId ? ([...queryKeys.bids.all, 'worker', workerId] as const) : ([...queryKeys.bids.all, 'worker'] as const),
  },

  // Reviews
  reviews: {
    all: ['reviews'] as const,
    byWorker: (workerId: string) => [...queryKeys.reviews.all, 'worker', workerId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (userId?: string) => userId ? ([...queryKeys.notifications.all, 'list', userId] as const) : ([...queryKeys.notifications.all, 'list'] as const),
  },

  // Messages/Chat
  messages: {
    all: ['messages'] as const,
    byBooking: (bookingId: string) => [...queryKeys.messages.all, 'booking', bookingId] as const,
  },

  // User Profile
  profile: {
    all: ['profile'] as const,
    current: (userId?: string) => userId ? ([...queryKeys.profile.all, 'current', userId] as const) : ([...queryKeys.profile.all, 'current'] as const),
  },

  // Favorite Workers
  favorites: {
    all: ['favorites'] as const,
    list: (userId: string) => [...queryKeys.favorites.all, 'list', userId] as const,
  },

  // Preferences
  preferences: {
    all: ['preferences'] as const,
    current: (userId?: string) => userId ? ([...queryKeys.preferences.all, 'current', userId] as const) : ([...queryKeys.preferences.all, 'current'] as const),
  },

  // Wallet/Transactions
  wallet: {
    all: ['wallet'] as const,
    balance: (workerId?: string) => workerId ? ([...queryKeys.wallet.all, 'balance', workerId] as const) : ([...queryKeys.wallet.all, 'balance'] as const),
    transactions: (workerId?: string) => workerId ? ([...queryKeys.wallet.all, 'transactions', workerId] as const) : ([...queryKeys.wallet.all, 'transactions'] as const),
    topUps: (workerId?: string) => workerId ? ([...queryKeys.wallet.all, 'top-ups', workerId] as const) : ([...queryKeys.wallet.all, 'top-ups'] as const),
    paymentMethods: () => [...queryKeys.wallet.all, 'payment-methods'] as const,
  },

  // Help Center
  helpCenter: {
    all: ['help-center'] as const,
    topics: () => [...queryKeys.helpCenter.all, 'topics'] as const,
    channels: () => [...queryKeys.helpCenter.all, 'channels'] as const,
    search: (query: string) => [...queryKeys.helpCenter.all, 'search', query] as const,
  },

  disputes: {
    all: ['disputes'] as const,
    my: (userId?: string) => userId ? ([...queryKeys.disputes.all, 'my', userId] as const) : ([...queryKeys.disputes.all, 'my'] as const),
    byBooking: (bookingId: string) => [...queryKeys.disputes.all, 'booking', bookingId] as const,
    detail: (id: string) => [...queryKeys.disputes.all, 'detail', id] as const,
    messages: (id: string) => [...queryKeys.disputes.all, 'messages', id] as const,
  },
} as const;
