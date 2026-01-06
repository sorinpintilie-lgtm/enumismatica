'use client';

import { memo } from 'react';

interface AuctionCardSkeletonProps {
  variant?: 'grid' | 'list';
}

function AuctionCardSkeleton({ variant = 'grid' }: AuctionCardSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className="group relative flex gap-4 p-4 rounded-xl border border-[#e7b73c]/40 bg-gradient-to-r from-navy-700 via-navy-800 to-navy-950 shadow-[0_8px_25px_rgba(231,183,60,0.2)] animate-pulse w-full">
        {/* Image skeleton */}
        <div className="relative w-32 h-24 flex-shrink-0">
          <div className="block w-full h-full bg-navy-700 rounded-lg animate-pulse"></div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 min-w-0 relative">
          <div className="flex justify-between items-start mb-2">
            <div className="space-y-2">
              {/* Title skeleton */}
              <div className="h-5 bg-navy-700 rounded w-3/4 animate-pulse"></div>
              {/* Auction ID and seller info skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-3 bg-navy-700 rounded w-20 animate-pulse"></div>
                <div className="h-3 bg-navy-700 rounded w-24 animate-pulse"></div>
              </div>
            </div>
            {/* Current bid skeleton */}
            <div className="text-right space-y-1">
              <div className="h-3 bg-navy-700 rounded w-16 animate-pulse"></div>
              <div className="h-6 bg-navy-700 rounded w-20 animate-pulse"></div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            {/* Time and buy now skeleton */}
            <div className="flex items-center gap-4">
              <div className="h-3 bg-navy-700 rounded w-12 animate-pulse"></div>
              <div className="h-3 bg-navy-700 rounded w-16 animate-pulse"></div>
            </div>
            {/* Button skeleton */}
            <div className="h-7 bg-navy-700 rounded-full w-16 animate-pulse"></div>
          </div>

          {/* Status message skeleton */}
          <div className="h-3 bg-navy-700 rounded w-2/3 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className="group relative h-full flex flex-col bg-gradient-to-br from-navy-600 via-navy-800 to-navy-950 rounded-2xl border border-[#e7b73c]/40 shadow-[0_18px_55px_rgba(0,0,0,0.9)] overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-[4/3] bg-navy-700 animate-pulse"></div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start mb-1">
          {/* Title skeleton */}
          <div className="h-5 bg-navy-700 rounded w-3/4 animate-pulse"></div>
          {/* Status badge skeleton */}
          <div className="h-5 bg-navy-700 rounded-full w-16 animate-pulse"></div>
        </div>

        {/* Seller info skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-3 bg-navy-700 rounded w-20 animate-pulse"></div>
          <div className="h-3 bg-navy-700 rounded w-12 animate-pulse"></div>
        </div>

        {/* Current bid section skeleton */}
        <div className="mb-1 space-y-1">
          <div className="h-3 bg-navy-700 rounded w-24 animate-pulse"></div>
          <div className="h-7 bg-navy-700 rounded w-20 animate-pulse"></div>
          <div className="h-3 bg-navy-700 rounded w-3/4 animate-pulse"></div>
        </div>

        {/* Time remaining skeleton */}
        <div className="mb-2 space-y-1">
          <div className="h-3 bg-navy-700 rounded w-16 animate-pulse"></div>
          <div className="h-4 bg-navy-700 rounded w-20 animate-pulse"></div>
        </div>

        {/* Buy now section skeleton (optional) */}
        <div className="mb-2 space-y-1">
          <div className="h-3 bg-navy-700 rounded w-20 animate-pulse"></div>
          <div className="h-4 bg-navy-700 rounded w-16 animate-pulse"></div>
        </div>

        {/* Bid form skeleton */}
        <div className="mb-2 space-y-2">
          <div className="h-9 bg-navy-700 rounded w-full animate-pulse"></div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex gap-2 mt-1">
          <div className="flex-1 h-9 bg-navy-700 rounded w-full animate-pulse"></div>
          <div className="flex-1 h-9 bg-navy-700 rounded w-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export default memo(AuctionCardSkeleton);