import { ReactNode } from "react";
import Spinner from "./Spinner";
import cn from "classnames";

interface FormFieldProps extends React.HTMLProps<HTMLDivElement> {
  label?: string;
  isLoading?: boolean;
  required?: boolean;
  children: ReactNode;
  error?: string;
  withValidation?: boolean;
}

export default function FormField({
  label,
  required = false,
  children,
  isLoading,
  error,
  withValidation = true,
  className,
  ...rest
}: FormFieldProps) {
  return (
    <div
      {...rest}
      className={cn(className, {
        "mb-4": !withValidation,
      })}
    >
      {label && (
        <label className="block mb-1 text-gray-600 dark:text-white">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {isLoading ? <Spinner /> : children}
      {withValidation && (
        <div className="h-5 mt-1" aria-live="assertive" aria-relevant="all">
          {error && (
            <p className="text-red-500 text-sm" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
