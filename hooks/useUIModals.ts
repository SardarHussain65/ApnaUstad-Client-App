import { useState, useCallback } from 'react';

interface ModalState {
  visible: boolean;
  data?: any;
}

export function useModal() {
  const [modalState, setModalState] = useState<ModalState>({
    visible: false,
    data: undefined,
  });

  const openModal = useCallback((data?: any) => {
    setModalState({
      visible: true,
      data,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({
      visible: false,
      data: undefined,
    });
  }, []);

  return {
    visible: modalState.visible,
    data: modalState.data,
    openModal,
    closeModal,
  };
}

export function useConfirmModal() {
  const [confirmState, setConfirmState] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isLoading: false,
  });

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText?: string,
      cancelText?: string
    ) => {
      setConfirmState({
        visible: true,
        title,
        message,
        onConfirm,
        onCancel: onCancel || (() => {}),
        confirmText: confirmText || 'Confirm',
        cancelText: cancelText || 'Cancel',
        isLoading: false,
      });
    },
    []
  );

  const setLoading = useCallback((isLoading: boolean) => {
    setConfirmState(prev => ({
      ...prev,
      isLoading,
    }));
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return {
    ...confirmState,
    showConfirm,
    closeConfirm,
    setLoading,
  };
}

export function useAlertModal() {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    onDismiss: () => {},
    buttonText: 'OK',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      onDismiss?: () => void,
      type?: 'success' | 'error' | 'warning' | 'info',
      buttonText?: string
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        onDismiss: onDismiss || (() => {}),
        buttonText: buttonText || 'OK',
        type: type || 'info',
      });
    },
    []
  );

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return {
    ...alertState,
    showAlert,
    closeAlert,
  };
}

export function useBottomSheet() {
  const [sheetState, setSheetState] = useState({
    visible: false,
    data: undefined,
  });

  const openSheet = useCallback((data?: any) => {
    setSheetState({
      visible: true,
      data,
    });
  }, []);

  const closeSheet = useCallback(() => {
    setSheetState({
      visible: false,
      data: undefined,
    });
  }, []);

  return {
    visible: sheetState.visible,
    data: sheetState.data,
    openSheet,
    closeSheet,
  };
}
