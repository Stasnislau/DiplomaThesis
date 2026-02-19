import React, { Suspense } from 'react';

import LoadingSpinner from './LoadingSpinner';

export const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>
    {children}
  </Suspense>
);
