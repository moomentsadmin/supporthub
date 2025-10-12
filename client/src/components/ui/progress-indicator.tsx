import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  value: number;
  max?: number;
  className?: string;
  variant?: "default" | "success" | "warning" | "error";
  showValue?: boolean;
}

const variants = {
  default: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500"
};

export function ProgressIndicator({ 
  value, 
  max = 100, 
  className, 
  variant = "default",
  showValue = false 
}: ProgressIndicatorProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={cn("w-full bg-gray-200 dark:bg-gray-700 rounded-full", className)}>
      <div
        className={cn("h-2 rounded-full transition-all duration-300", variants[variant])}
        style={{ width: `${percentage}%` }}
      />
      {showValue && (
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
}

export function CircularProgress({ 
  value, 
  max = 100, 
  size = 40, 
  strokeWidth = 4,
  className,
  showValue = false 
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-blue-500 transition-all duration-300"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}