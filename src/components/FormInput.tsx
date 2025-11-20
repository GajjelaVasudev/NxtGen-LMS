import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="relative w-full">
        <div className={cn(
          "relative flex flex-col border border-[#79747E] rounded bg-white",
          className
        )}>
          <div className="flex items-center px-4 py-2 h-14">
            <div className="flex-1 flex flex-col justify-center h-10">
              <input
                type={inputType}
                className="w-full bg-transparent outline-none text-[#1C1B1F] font-poppins text-base"
                ref={ref}
                {...props}
              />
              <label className="absolute -top-2 left-3 px-1 bg-white text-[#313131] font-poppins text-sm">
                {label}
              </label>
            </div>
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center justify-center w-12 h-12 -mr-3"
              >
                {showPassword ? (
                  <Eye className="w-6 h-6 text-[#313131]" />
                ) : (
                  <EyeOff className="w-6 h-6 text-[#313131]" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

import clsx from "clsx";

/**
 * Small helper to merge class names (used across components).
 * Exported as `cn` so imports like `import { cn } from "@/lib/utils"` work.
 */
export function cn(...args: any[]) {
  return clsx(...args);
}
