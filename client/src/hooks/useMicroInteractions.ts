import { useState, useCallback } from "react";
import type { Toast } from "@/components/ui/animated-toast";

interface MicroInteractionState {
  buttonStates: Record<string, boolean>;
  toasts: Toast[];
  feedbackCount: number;
}

export function useMicroInteractions() {
  const [state, setState] = useState<MicroInteractionState>({
    buttonStates: {},
    toasts: [],
    feedbackCount: 0
  });

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showToast = useCallback((type: Toast["type"], title: string, description?: string, duration?: number) => {
    const newToast: Toast = {
      id: generateId(),
      type,
      title,
      description,
      duration: duration || 4000
    };

    setState(prev => ({
      ...prev,
      toasts: [...prev.toasts, newToast]
    }));

    // Auto remove after duration
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        toasts: prev.toasts.filter(t => t.id !== newToast.id)
      }));
    }, newToast.duration);
  }, [generateId]);

  const showSuccess = useCallback((title: string, description?: string) => {
    showToast("success", title, description);
  }, [showToast]);

  const showError = useCallback((title: string, description?: string) => {
    showToast("error", title, description);
  }, [showToast]);

  const showInfo = useCallback((title: string, description?: string) => {
    showToast("info", title, description);
  }, [showToast]);

  const showWarning = useCallback((title: string, description?: string) => {
    showToast("warning", title, description);
  }, [showToast]);

  const triggerButtonFeedback = useCallback((buttonId: string, duration: number = 1000) => {
    setState(prev => ({
      ...prev,
      buttonStates: {
        ...prev.buttonStates,
        [buttonId]: true
      },
      feedbackCount: prev.feedbackCount + 1
    }));

    setTimeout(() => {
      setState(prev => ({
        ...prev,
        buttonStates: {
          ...prev.buttonStates,
          [buttonId]: false
        }
      }));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      toasts: prev.toasts.filter(t => t.id !== id)
    }));
  }, []);

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showToast,
    triggerButtonFeedback,
    removeToast,
    buttonStates: state.buttonStates,
    toasts: state.toasts,
    feedbackCount: state.feedbackCount
  };
}