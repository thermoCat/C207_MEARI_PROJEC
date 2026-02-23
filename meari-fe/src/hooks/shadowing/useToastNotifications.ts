// Toast Message 관리를 위한 커스텀 훅

import { useState, useCallback } from "react";

export type ToastType = 'error' | 'success' | 'info';

export function useToastNotifications() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('error');

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    setToastType(type);
    setToastMessage(message);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
    setToastType('error');
  }, []);

  return {
    toastMessage,
    toastType,
    showToast,
    clearToast,
  };
}
