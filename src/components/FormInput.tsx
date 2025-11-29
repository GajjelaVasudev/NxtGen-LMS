import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

export function cn(...args: any[]) {
  return clsx(...args);
}

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, type = "text", className, ...props }, ref) => {
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = useState(false);
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full">
        {label && (
          <label className="block mb-2 text-sm text-[#313131] font-poppins">
            {label}
          </label>
        )}

        <div
          className={cn(
            "relative flex flex-col rounded bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-200 transition",
            className
          )}
        >
          <div className="flex items-center px-4 py-2 h-14">
            <div className="flex-1 flex items-center h-10">
              <input
                ref={ref}
                type={inputType}
                className="w-full bg-transparent outline-none text-[#1C1B1F] font-poppins text-base"
                {...props}
              />
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

export default FormInput;
