'use client';

import { memo } from 'react';

interface ProductCardSkeletonProps {
  variant?: 'grid' | 'list';
}

function ProductCardSkeleton({ variant = 'grid' }: ProductCardSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className="relative group flex gap-4 p-4 rounded-xl border border-[#e7b73c]/40 bg-gradient-to-r from-navy-600 to-navy-800 shadow-[0_8px_25px_rgba(231,183,60,0.2)] animate-pulse">
        {/* Image skeleton */}
        <div className="relative w-32 h-24 flex-shrink-0">
          <div className="block w-full h-full bg-navy-700 rounded-lg animate-pulse"></div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 min-w-0 relative">
          <div className="flex justify-between items-start mb-2">
            <div className="min-w-0 pr-4 space-y-2">
              {/* Title skeleton */}
              <div className="h-5 bg-navy-700 rounded w-3/4 animate-pulse"></div>
              {/* Seller info skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-3 bg-navy-700 rounded w-24 animate-pulse"></div>
                <div className="h-3 bg-navy-700 rounded w-16 animate-pulse"></div>
              </div>
            </div>
            {/* Price skeleton */}
            <div className="h-6 bg-navy-700 rounded w-20 animate-pulse"></div>
          </div>

          {/* Description skeleton */}
          <div className="space-y-1 mb-3">
            <div className="h-3 bg-navy-700 rounded w-full animate-pulse"></div>
            <div className="h-3 bg-navy-700 rounded w-2/3 animate-pulse"></div>
          </div>

          <div className="flex justify-between items-center">
            {/* Metadata skeleton */}
            <div className="flex items-center gap-4">
              <div className="h-3 bg-navy-700 rounded w-12 animate-pulse"></div>
              <div className="h-3 bg-navy-700 rounded w-10 animate-pulse"></div>
            </div>
            {/* Button skeleton */}
            <div className="h-8 bg-navy-700 rounded-full w-20 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className="relative group h-full flex flex-col overflow-hidden animate-pulse rounded-2xl border border-[#e7b73c]/70 bg-gradient-to-br from-navy-500 to-navy-600 shadow-[0_10px_35px_rgba(231,183,60,0.3)]">
      {/* Image skeleton */}
      <div className="relative aspect-[4/3] bg-navy-700 rounded-t-2xl animate-pulse"></div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-2">
          {/* Title skeleton */}
          <div className="h-5 bg-navy-700 rounded w-4/5 animate-pulse"></div>
          {/* Seller info skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-3 bg-navy-700 rounded w-20 animate-pulse"></div>
            <div className="h-3 bg-navy-700 rounded w-12 animate-pulse"></div>
          </div>
          {/* Description skeleton */}
          <div className="space-y-1">
            <div className="h-3 bg-navy-700 rounded w-full animate-pulse"></div>
            <div className="h-3 bg-navy-700 rounded w-3/4 animate-pulse"></div>
          </div>
        </div>

        <div className="mt-auto space-y-3">
          {/* Price skeleton */}
          <div className="h-6 bg-navy-700 rounded w-16 animate-pulse"></div>
          {/* Button skeleton */}
          <div className="h-9 bg-navy-700 rounded-full w-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCardSkeleton);