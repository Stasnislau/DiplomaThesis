import React from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

interface SkeletonProps {
  className?: string;
  /** Width of the skeleton. Can be a Tailwind class or CSS value */
  width?: string;
  /** Height of the skeleton. Can be a Tailwind class or CSS value */
  height?: string;
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton loading placeholder component.
 * Provides visual feedback while content is loading.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  variant = 'text',
  animation = 'pulse',
}) => {
  const { t } = useTranslation();
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]',
    none: '',
  };

  const defaultHeight = variant === 'text' ? 'h-4' : 'h-12';
  const defaultWidth = 'w-full';

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        height || defaultHeight,
        width || defaultWidth,
        className
      )}
      role="status"
      aria-label={t("common.loading")}
      aria-busy="true"
    />
  );
};

/**
 * Skeleton for text content with multiple lines
 */
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className }) => {
  const { t } = useTranslation();
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label={t("a11y.loadingText")}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton for card content
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700',
        className
      )}
      role="status"
      aria-label={t("a11y.loadingCard")}
    >
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton variant="circular" width="w-12" height="h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="w-1/2" />
          <Skeleton variant="text" width="w-1/4" height="h-3" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
};

/**
 * Skeleton for task/quiz content
 */
export const SkeletonTask: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn('space-y-6', className)}
      role="status"
      aria-label={t("a11y.loadingTask")}
    >
      {/* Question */}
      <Skeleton variant="rounded" height="h-16" />
      
      {/* Options */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height="h-12" />
        ))}
      </div>
      
      {/* Button */}
      <Skeleton variant="rounded" height="h-12" width="w-32" />
    </div>
  );
};

export default Skeleton;
