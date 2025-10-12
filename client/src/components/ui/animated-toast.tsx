import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    iconColor: "text-green-600",
    textColor: "text-green-800 dark:text-green-200"
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    iconColor: "text-red-600",
    textColor: "text-red-800 dark:text-red-200"
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    iconColor: "text-yellow-600",
    textColor: "text-yellow-800 dark:text-yellow-200"
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600",
    textColor: "text-blue-800 dark:text-blue-200"
  }
};

function AnimatedToast({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const config = toastConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 10);

    // Auto dismiss
    const timer = setTimeout(() => {
      handleExit();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.duration]);

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={cn(
        "transform transition-all duration-300 ease-out",
        "pointer-events-auto w-full max-w-sm",
        "rounded-lg border p-4 shadow-lg",
        config.bgColor,
        config.borderColor,
        isVisible && !isExiting
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-full opacity-0 scale-95"
      )}
    >
      <div className="flex items-start space-x-3">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />
        <div className="flex-1 min-w-0">
          <h4 className={cn("text-sm font-medium", config.textColor)}>
            {toast.title}
          </h4>
          {toast.description && (
            <p className={cn("text-sm mt-1 opacity-80", config.textColor)}>
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={handleExit}
          className={cn(
            "flex-shrink-0 p-1 rounded-md transition-colors",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            config.textColor
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove?: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const [localToasts, setLocalToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setLocalToasts(toasts);
  }, [toasts]);

  const handleRemove = (id: string) => {
    setLocalToasts(prev => prev.filter(t => t.id !== id));
    onRemove?.(id);
  };

  if (localToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {localToasts.map((toast) => (
        <AnimatedToast
          key={toast.id}
          toast={toast}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}