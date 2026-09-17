import React from 'react';

/**
 * Reusable Skeleton Loader Component
 * Renders pulsing placeholder shapes for loading data states.
 */
export function Skeleton({ className = '', height, width, rounded = 'rounded-2xl' }) {
  return (
    <div 
      className={`bg-[#1E1E1E]/80 border border-[#474747]/30 animate-pulse ${rounded} ${className}`}
      style={{
        height: height || undefined,
        width: width || undefined
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[#1E1E1E] border border-[#474747]/40 p-5 rounded-3xl space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-10 w-36" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
