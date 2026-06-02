import React, { useState, useCallback, useMemo } from 'react';
import { Share, Platform, View, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Colors, Typography } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import {
  useMyPayments,
  useWorkerWallet,
  useWalletTransactions,
  useWalletPaymentMethods,
  useWalletTopUps,
  useCreateWalletTopUpMutation,
  useToast,
  useUserWallet,
} from '../../hooks';

// Subcomponents & Shimmer Skeletons
import { ClientWalletView } from '../../components/wallet/ClientWalletView';
import { WorkerWalletView } from '../../components/wallet/WorkerWalletView';
import { RechargeModal } from '../../components/wallet/RechargeModal';
import { Skeleton, useShimmerTranslateX } from '../../components/ui/Skeleton';

// ─── Types & Constants ────────────────────────────────────────────────────────
const FILTERS = ['All', 'Paid', 'Payable', 'Pending', 'Refund'] as const;
type FilterType = typeof FILTERS[number];

// ─── Wallet Skeleton ──────────────────────────────────────────────────────────
interface WalletSkeletonProps {
  isWorker: boolean;
  insets: any;
}

function WalletSkeleton({ isWorker, insets }: WalletSkeletonProps) {
  const translateX = useShimmerTranslateX();

  return (
    <View style={{ gap: 16, padding: 16, paddingTop: insets.top + 16 }}>
      {/* Static Header shown immediately while content shimmers load */}
      <View style={{ marginBottom: 8 }}>
        <Text style={[{ fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 0.5 }, Typography.threeD]}>
          Wallet & History
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textMuted, fontWeight: '600', marginTop: 4 }}>
          {isWorker
            ? 'Manage earnings, top-ups, and commission logs'
            : 'View credit balance and payment history'}
        </Text>
      </View>

      {/* Hero card shimmer */}
      <Skeleton width="100%" height={140} borderRadius={24} translateX={translateX} />

      {/* Metric chips row shimmer */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width="48%" height={72} borderRadius={16} translateX={translateX} />
        <Skeleton width="48%" height={72} borderRadius={16} translateX={translateX} />
      </View>

      {/* History ledger rows shimmer */}
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} width="100%" height={72} borderRadius={18} translateX={translateX} />
      ))}
    </View>
  );
}

// ─── Main Container Component ──────────────────────────────────────────────────
export default function WalletTab() {
  const { role } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const isWorker = role === 'worker';

  // 1. Client View states
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [isClientRefreshing, setIsClientRefreshing] = useState(false);

  const { data: paymentsData, isLoading: isPaymentsLoading, refetch: refetchPayments } = useMyPayments();

  // Fetch customer credit UserWallet
  const { data: userWalletData, isLoading: isUserWalletLoading, refetch: refetchUserWallet } = useUserWallet(1, 50, {
    enabled: !isWorker,
  });

  const payments = paymentsData?.payments ?? [];
  const summary = paymentsData?.summary ?? { total: 0, paid: 0, payable: 0, pending: 0, cancelled: 0, currency: 'PKR' };

  const walletBalance = userWalletData?.wallet?.balance ?? 0;
  const walletTransactions = userWalletData?.transactions ?? [];

  const handleClientRefresh = useCallback(async () => {
    setIsClientRefreshing(true);
    try {
      await Promise.all([
        refetchPayments(),
        refetchUserWallet(),
      ]);
    } finally {
      setIsClientRefreshing(false);
    }
  }, [refetchPayments, refetchUserWallet]);

  // 2. Worker View states
  const [workerTab, setWorkerTab] = useState<'wallet' | 'topups' | 'earnings'>('wallet');
  const [isWorkerRefreshing, setIsWorkerRefreshing] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedMethodKey, setSelectedMethodKey] = useState<any | null>(null);
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);

  const { data: wallet, isLoading: isWalletLoading, refetch: refetchWallet } = useWorkerWallet({
    enabled: isWorker,
  });
  const { data: transactionsData, isLoading: isTransactionsLoading, refetch: refetchTransactions } = useWalletTransactions(1, 50, {
    enabled: isWorker,
  });
  const { data: paymentMethods = [], isLoading: areMethodsLoading, refetch: refetchPaymentMethods } = useWalletPaymentMethods({
    enabled: isWorker,
  });
  const { data: topUpsData, isLoading: areTopUpsLoading, refetch: refetchTopUps } = useWalletTopUps(1, 50, {
    enabled: isWorker,
  });

  const transactions = transactionsData?.transactions ?? [];
  const topUps = useMemo(() => topUpsData?.requests ?? [], [topUpsData?.requests]);
  const topUpMutation = useCreateWalletTopUpMutation();

  const selectedMethod = useMemo(
    () => paymentMethods.find((method) => method.method === selectedMethodKey) || paymentMethods[0],
    [paymentMethods, selectedMethodKey]
  );
  const selectedMethodIsConfigured = selectedMethod ? selectedMethod.isConfigured !== false : false;

  const totalEarnings = (summary.paid || 0) + (summary.payable || 0);

  const handleWorkerRefresh = useCallback(async () => {
    setIsWorkerRefreshing(true);
    try {
      await Promise.all([
        refetchWallet(),
        refetchTransactions(),
        refetchPayments(),
        refetchPaymentMethods(),
        refetchTopUps(),
      ]);
    } finally {
      setIsWorkerRefreshing(false);
    }
  }, [refetchWallet, refetchTransactions, refetchPayments, refetchPaymentMethods, refetchTopUps]);

  const handleCopy = async (label: string, value?: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    toast.success('Copied', `${label} copied to clipboard.`);
  };

  const handlePickProofImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Permission Required', 'Please allow photo access to upload your payment proof.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setProofImageUri(result.assets[0].uri);
    }
  };

  const resetTopUpForm = () => {
    setRechargeAmount('');
    setSelectedMethodKey(null);
    setProofImageUri(null);
  };

  const handleConfirmRecharge = async () => {
    const amountVal = parseFloat(rechargeAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Invalid Amount', 'Please enter a positive amount to top up.');
      return;
    }
    if (!selectedMethod) {
      toast.error('No Payment Method', 'Payment methods are not configured yet. Please contact support.');
      return;
    }
    if (!selectedMethodIsConfigured) {
      toast.error('Payment Details Missing', `${selectedMethod.label} payment details are not configured yet. Please contact support.`);
      return;
    }
    if (!proofImageUri) {
      toast.error('Proof Required', 'Please upload your payment screenshot or slip.');
      return;
    }

    setIsSubmittingRecharge(true);
    try {
      const formData = new FormData();
      formData.append('amount', String(amountVal));
      formData.append('method', selectedMethod.method);

      const filename = proofImageUri.split('/').pop() || 'payment-proof.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('proof', {
        uri: Platform.OS === 'ios' ? proofImageUri.replace('file://', '') : proofImageUri,
        name: filename,
        type,
      } as any);

      await topUpMutation.mutateAsync(formData);
      toast.success('Submitted', 'Top-up proof uploaded successfully. Approvals take up to 24 hours.');
      setShowRechargeModal(false);
      resetTopUpForm();
    } catch (err: any) {
      toast.error('Top-Up Failed', err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmittingRecharge(false);
    }
  };

  const handleShareStatement = async () => {
    const availableBalance = wallet?.availableBalance ?? wallet?.balance ?? 0;
    const lines = [
      'ApnaUstad Worker Wallet Statement',
      `Available Balance: Rs. ${availableBalance.toLocaleString()}`,
      `Held for Active Jobs: Rs. ${(wallet?.reservedBalance ?? 0).toLocaleString()}`,
      `Total Earnings: Rs. ${totalEarnings.toLocaleString()}`,
      `Ready to Collect: Rs. ${summary.payable.toLocaleString()}`,
      `Total Recharged: Rs. ${wallet?.totalRecharged?.toLocaleString() ?? '0'}`,
      `Commission Deducted: Rs. ${wallet?.totalCommissionDeducted?.toLocaleString() ?? '0'}`,
      '',
      ...transactions.slice(0, 20).map((tx) => {
        const sign = ['recharge', 'refund'].includes(tx.type) ? '+' : '-';
        return `${new Date(tx.createdAt).toLocaleDateString()} | ${tx.description} | ${sign}Rs. ${tx.amount.toLocaleString()} | Bal Rs. ${tx.balanceAfter.toLocaleString()}`;
      }),
    ];
    await Share.share({ message: lines.join('\n') });
  };

  // Determine full page loading state
  const isClientLoading = (isPaymentsLoading || isUserWalletLoading) && !isClientRefreshing;
  const isWorkerLoading = (isWalletLoading || isTransactionsLoading || areMethodsLoading || areTopUpsLoading) && !isWorkerRefreshing;

  const showSkeleton = isWorker ? isWorkerLoading : isClientLoading;

  return (
    <BackgroundWrapper>
      {showSkeleton ? (
        <WalletSkeleton isWorker={isWorker} insets={insets} />
      ) : isWorker ? (
        <>
          <WorkerWalletView
            wallet={wallet ?? null}
            transactions={transactions}
            topUps={topUps}
            payments={payments}
            summary={summary}
            workerTab={workerTab}
            onTabChange={setWorkerTab}
            refreshing={isWorkerRefreshing}
            onRefresh={handleWorkerRefresh}
            onOpenRecharge={() => setShowRechargeModal(true)}
          />
          <RechargeModal
            visible={showRechargeModal}
            onDismiss={() => { setShowRechargeModal(false); resetTopUpForm(); }}
            amount={rechargeAmount}
            onAmountChange={setRechargeAmount}
            paymentMethods={paymentMethods}
            selectedMethodKey={selectedMethodKey}
            onSelectMethod={setSelectedMethodKey}
            proofImageUri={proofImageUri}
            onPickProofImage={handlePickProofImage}
            isSubmitting={isSubmittingRecharge}
            onConfirm={handleConfirmRecharge}
            onCopy={handleCopy}
          />
        </>
      ) : (
        <ClientWalletView
          payments={payments}
          summary={summary}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          refreshing={isClientRefreshing}
          onRefresh={handleClientRefresh}
          walletBalance={walletBalance}
          walletTransactions={walletTransactions}
        />
      )}
    </BackgroundWrapper>
  );
}
