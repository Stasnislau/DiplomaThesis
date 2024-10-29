import React, { InputHTMLAttributes, useState } from 'react';
import cn from 'classnames';
import { EyeIcon, EyeSlashIcon } from '../../assets/icons';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  label?: string;
  error?: string;
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, label, error, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm",
              "focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500",
              "transition-colors duration-200",
              {
                "pr-10": isPassword,
                "border-red-500 focus:ring-red-500 focus:border-red-500": error,
              }
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';

export default TextField;