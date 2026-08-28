import { ChevronDown } from "lucide-react";
import React from "react";

import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative group">
          <select
            className={cn(
              "w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-ring focus:border-transparent outline-none bg-background text-foreground border-input appearance-none cursor-pointer group-hover:border-primary/50",
              error && "border-destructive focus:ring-destructive",
              className,
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1 font-medium">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export { Select };
