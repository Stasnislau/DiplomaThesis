import React, { ButtonHTMLAttributes } from "react";
import cn from "classnames";
import Spinner from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, isLoading, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "h-12 w-full px-4 py-2 items-center text-white bg-blue-600 rounded-lg hover:bg-blue-900 font-medium focus:outline-none transition-colors duration-200 relative",
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
