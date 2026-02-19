import React, { ButtonHTMLAttributes } from "react";

import Spinner from "./Spinner";
import cn from "classnames";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "destructive";
  /** Accessible label for screen readers when button content is not descriptive */
  ariaLabel?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, isLoading, variant = "primary", ariaLabel, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex justify-center h-12 w-full px-4 py-2 items-center rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 relative font-medium",
          { "bg-blue-600 hover:bg-blue-900 text-white focus:ring-blue-500": variant === "primary" },
          {
            "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 focus:ring-green-500":
              variant === "secondary",
          },
          {
            "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500":
              variant === "tertiary",
          },
          { "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500": variant === "danger" },
          {
            "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500": variant === "destructive",
          },
          { "opacity-50 cursor-not-allowed": isLoading || props.disabled },
          className
        )}
        disabled={isLoading || props.disabled}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        aria-disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Spinner size={8} />
          </div>
        ) : null}
        <span className={cn({ "opacity-0": isLoading })}>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
