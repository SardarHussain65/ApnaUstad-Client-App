// Query Hooks - Data Fetching
export {
  useCategories,
  useWorker,
  useWorkersByCategory,
  useAllWorkers,
  useBookings,
  useMyBookings,
  useWorkerBookings,
  useBookingDetails,
  useWorkerReviews,
  useNotifications,
  useMyJobPosts,
  type Worker,
  type JobPost,
  type Review,
  type AppNotification,
  type NotificationsResponse,
  type Booking,
  type BookingPerson,
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

// Mutation Hooks - Data Changes
export {
  useCreateJobMutation,
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
} from './mutations/useMutations';

// UI Hooks
export { useToast } from './useToast';
export { useModal, useConfirmModal, useAlertModal, useBottomSheet } from './useUIModals';
export { useUserLocation, type UserLocation } from './useUserLocation';

// Query Key Factory
export { queryKeys } from '../lib/queryKeyFactory';
