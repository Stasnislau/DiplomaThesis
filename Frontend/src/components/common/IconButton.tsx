import React, { ButtonHTMLAttributes } from 'react';

import cn from '@/utils/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'xs' | 'small' | 'medium' | 'large';
  transparent?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'secondary', size = 'medium', transparent = false, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'rounded-icon font-medium items-center flex justify-center focus:outline-none',
          'transition-colors duration-200',
          {
            'h-6 w-6': size === 'xs',
            'h-8 w-8': size === 'small',
            'h-12 w-12': size === 'medium',
            'h-16 w-16': size === 'large',
            'bg-blue-600 hover:bg-blue-900 text-white': variant === 'primary' && !transparent,
            'bg-gradient-to-r from-green-500 to-emerald-500 text-white': variant === 'secondary' && !transparent,
            'bg-yellow-100 text-yellow-800 hover:bg-yellow-200': variant === 'tertiary' && !transparent,
            'bg-red-500 hover:bg-red-600 text-white': variant === 'danger' && !transparent,
            'bg-transparent hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700':
              transparent,
            'opacity-50 cursor-not-allowed': props.disabled,
          },
          className
        )}
        disabled={props.disabled}
        {...props}
      >
        {props.children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
export default IconButton;
