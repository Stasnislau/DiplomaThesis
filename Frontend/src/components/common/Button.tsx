import React, { ButtonHTMLAttributes } from "react";
import cn from "classnames";
import Spinner from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "tertiary";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, isLoading, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "h-12 w-full px-4 py-2 items-center  rounded-lg focus:outline-none transition-colors duration-200 relative",
          { "bg-blue-600 hover:bg-blue-900 text-white": variant === "primary" },
          {
            "bg-gradient-to-r from-green-500 to-emerald-500 text-white":
              variant === "secondary",
          },
          {
            "bg-yellow-100 text-yellow-800 hover:bg-yellow-200":
              variant === "tertiary",
          },
          { "opacity-50 cursor-not-allowed": isLoading || props.disabled },
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size={8} />
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
