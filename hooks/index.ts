// Query Hooks - Data Fetching
export {
  useCategories,
  useWorker,
  useWorkersByCategory,
  useAllWorkers,
  useBookings,
  useMyBookings,
  useClientHomeSummary,
  useWorkerBookings,
  useBookingDetails,
  useWorkerReviews,
  useNotifications,
  useMyJobPosts,
  usePreferences,
  useMyPayments,
  useHelpTopics,
  useHelpChannels,
  useHelpSearch,
  useProfile,
  useFavoriteWorkers,
  type Worker,
  type JobPost,
  type Review,
  type AppNotification,
  type NotificationsResponse,
  type UserPreferences,
  type PaymentsResponse,
  type PaymentEntry,
  type HelpTopic,
  type HelpArticle,
  type SupportChannel,
  type ProfileData,
  type Booking,
  type BookingPerson,
  type ClientHomeSummary,
  type ClientHomeStats,
} from './queries/useData';

export {
  useMessages,
  useNearbyJobs,
  useJobDetails,
  useBidsByJob,
  useWorkerBids,
  type Message,
  type Job,
  type Bid,
} from './queries/useMessagesAndJobs';

export {
  useMyDisputes,
  useBookingDisputeContext,
  raiseDisputeRequest,
  type DisputeRecord,
  type BookingDisputeMeta,
  type DisputeReason,
} from './queries/useDisputes';

// Mutation Hooks - Data Changes
export {
  useCreateJobMutation,
  useCancelJobMutation,
  useSubmitBidMutation,
  useAcceptBidMutation,
  useAcceptInstantJobMutation,
  useWithdrawBidMutation,
  useUpdateBookingStatusMutation,
  usePayBookingMutation,
  useCreateReviewMutation,
  useMarkNotificationReadMutation,
  useRegisterMutation,
  useSendMessageMutation,
  useUploadJobImagesMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useUpdatePreferencesMutation,
  useLogoutAllSessionsMutation,
  useCreateSupportRequestMutation,
  useToggleFavoriteMutation,
} from './mutations/useMutations';

// Wallet Hooks
export {
  useWorkerWallet,
  useWalletTransactions,
  useWalletPaymentMethods,
  useWalletTopUps,
  useCreateWalletTopUpMutation,
  type WorkerWallet,
  type WalletTransaction,
  type TransactionsResponse,
  type WalletPaymentMethod,
  type WalletTopUpRequest,
  type TopUpsResponse,
} from './queries/useWallet';

export {
  useUserWallet,
  type UserWallet,
  type UserWalletTransaction,
  type UserWalletResponse,
} from './queries/useUserWallet';

// UI Hooks
export { useToast } from './useToast';
export { useModal, useConfirmModal, useAlertModal, useBottomSheet } from './useUIModals';
export { useUserLocation, type UserLocation } from './useUserLocation';

// Query Key Factory
export { queryKeys } from '../lib/queryKeyFactory';

// Worker Analytics
export {
  useWorkerAnalytics,
  type WorkerAnalyticsData,
  type EarningsDataPoint,
  type EarningsSummary,
} from './useWorkerAnalytics';
