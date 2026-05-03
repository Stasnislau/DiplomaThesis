import React from 'react';
import Spinner from './Spinner';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  className?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className, fullScreen = false }) => {
  const { t } = useTranslation();
  if (fullScreen) {
    return (
      <div
        className={cn(
          "fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50 backdrop-blur-sm",
          className
        )}
        aria-busy="true"
        aria-label={t("a11y.loading")}
        role="alert"
      >
        <Spinner size={12} />
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-center p-4", className)}
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <Spinner size={8} />
    </div>
  );
};

export default LoadingSpinner;