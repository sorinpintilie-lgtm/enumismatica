'use client';

import { memo } from 'react';

function FilterBarSkeleton() {
  return (
    <div className="bg-gradient-to-br from-navy-900 via-navy-950 to-black rounded-2xl border border-[#e7b73c]/40 shadow-[0_18px_55px_rgba(0,0,0,0.9)] p-6 mb-6 animate-pulse">
      {/* Category Selector Skeleton */}
      <div className="mb-4">
        <div className="h-4 bg-navy-700 rounded w-20 mb-2 animate-pulse"></div>
        <div className="h-12 bg-navy-700 rounded-xl w-full animate-pulse"></div>
      </div>

      {/* Search and Quick Filters Skeleton */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        {/* Search Bar Skeleton */}
        <div className="flex-1">
          <div className="h-12 bg-navy-700 rounded-xl w-full animate-pulse"></div>
        </div>

        {/* Sort By Skeleton */}
        <div className="lg:w-64">
          <div className="h-12 bg-navy-700 rounded-xl w-full animate-pulse"></div>
        </div>

        {/* Toggle Advanced Filters Button Skeleton */}
        <div className="lg:w-auto">
          <div className="h-12 bg-navy-700 rounded-xl w-40 animate-pulse"></div>
        </div>
      </div>

      {/* Advanced Filters Skeleton (expanded state) */}
      <div className="border-t border-[#e7b73c]/25 pt-6 space-y-6">
        {/* Country, Metal, Rarity Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div className="h-4 bg-navy-700 rounded w-12 mb-2 animate-pulse"></div>
            <div className="h-10 bg-navy-700 rounded-xl w-full animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 bg-navy-700 rounded w-12 mb-2 animate-pulse"></div>
            <div className="h-10 bg-navy-700 rounded-xl w-full animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 bg-navy-700 rounded w-12 mb-2 animate-pulse"></div>
            <div className="h-10 bg-navy-700 rounded-xl w-full animate-pulse"></div>
          </div>
        </div>

        {/* Grade Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div className="h-4 bg-navy-700 rounded w-12 mb-2 animate-pulse"></div>
            <div className="h-10 bg-navy-700 rounded-xl w-full animate-pulse"></div>
          </div>
        </div>

        {/* Romanian Coin Filters Section */}
        <div className="border-t border-[#e7b73c]/25 pt-6">
          <div className="h-6 bg-navy-700 rounded w-48 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 6 Romanian filter fields */}
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <div className="h-4 bg-navy-700 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-10 bg-navy-700 rounded-xl w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Range Section */}
        <div>
          <div className="h-4 bg-navy-700 rounded w-32 mb-2 animate-pulse"></div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="h-10 bg-navy-700 rounded-xl w-full animate-pulse"></div>
            <div className="h-10 bg-navy-700 rounded-xl w-full animate-pulse"></div>
          </div>
          <div className="h-2 bg-navy-700 rounded-full w-full animate-pulse"></div>
        </div>

        {/* Year Range Section */}
        <div>
          <div className="h-4 bg-navy-700 rounded w-24 mb-2 animate-pulse"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-navy-700 rounded-xl w-full animate-pulse"></div>
            <div className="h-10 bg-navy-700 rounded-xl w-full animate-pulse"></div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-end">
          <div className="h-10 bg-navy-700 rounded-xl w-36 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export default memo(FilterBarSkeleton);