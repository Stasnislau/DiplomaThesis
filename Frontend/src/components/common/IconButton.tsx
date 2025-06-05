import cn from '@/utils/cn';
import React, { ButtonHTMLAttributes } from 'react';

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
            // Sizes
            'h-6 w-6': size === 'xs',
            'h-8 w-8': size === 'small',
            'h-12 w-12': size === 'medium',
            'h-16 w-16': size === 'large',
            // Primary variant
            'bg-blue-600 hover:bg-blue-900 text-white': variant === 'primary' && !transparent,
            // Secondary variant
            'bg-gradient-to-r from-green-500 to-emerald-500 text-white': variant === 'secondary' && !transparent,
            // Tertiary variant
            'bg-yellow-100 text-yellow-800 hover:bg-yellow-200': variant === 'tertiary' && !transparent,
            // Danger variant
            'bg-red-500 hover:bg-red-600 text-white': variant === 'danger' && !transparent,
            // Transparent variant
            'bg-transparent hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700':
              transparent,
            // Disabled states
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
