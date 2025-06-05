import React, { ReactNode } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import cn from '@/utils/cn';
import { InfoCircle, CloseCircle, Warning2, Check, CloseSquare } from 'iconsax-react';
import IconButton from '../common/IconButton';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  content: string | ReactNode;
  severity?: 'success' | 'info' | 'error' | 'warning';
  duration?: number;
}

const severityIcons = {
  success: Check,
  info: InfoCircle,
  error: CloseCircle,
  warning: Warning2,
};

const Toast: React.FC<ToastProps> = ({
  open,
  onOpenChange,
  title,
  content: description,
  severity = 'info',
  duration = 5000,
}) => {
  const Icon = severityIcons[severity];

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <AnimatePresence>
        {open && (
          <ToastPrimitive.Root
            asChild
            forceMount
            open={open}
            onOpenChange={onOpenChange}
            duration={duration}
          >
            <motion.div
              className={cn(
                'fixed top-4 right-4 z-50 w-full max-w-sm rounded-lg shadow-lg',
                'bg-white dark:bg-black-secondary p-4'
              )}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <div className="flex items-start">
                <div
                  className={cn('flex-shrink-0 mr-3', {
                    'text-green-500': severity === 'success',
                    'text-blue-500': severity === 'info',
                    'text-red-500': severity === 'error',
                    'text-yellow-500': severity === 'warning',
                  })}
                >
                  <Icon size={24} />
                </div>
                <div className="flex-grow">
                  {title && (
                    <ToastPrimitive.Title className="font-bold text-gray-900 dark:text-white mb-1">
                      {title}
                    </ToastPrimitive.Title>
                  )}
                  <ToastPrimitive.Description className="text-sm text-gray-700 dark:text-gray-300">
                    {description}
                  </ToastPrimitive.Description>
                </div>
                <ToastPrimitive.Close asChild>
                  <IconButton className="flex-shrink-0 ml-3 -mt-1 -mr-1 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <CloseSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </IconButton>
                </ToastPrimitive.Close>
              </div>
            </motion.div>
          </ToastPrimitive.Root>
        )}
      </AnimatePresence>
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  );
};
export default Toast;
