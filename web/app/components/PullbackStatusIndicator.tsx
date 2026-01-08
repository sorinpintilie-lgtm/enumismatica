import React from 'react';

interface PullbackStatusIndicatorProps {
  isPulledBack?: boolean;
  className?: string;
}

export function PullbackStatusIndicator({ isPulledBack, className = '' }: PullbackStatusIndicatorProps) {
  if (!isPulledBack) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-600 ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-green-500" />
      Returnat în colecție
    </div>
  );
}