import React from 'react';
import { cn } from '../../lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {

    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          className={cn(
            'w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-ring focus:border-transparent outline-none bg-background text-foreground border-input appearance-none',
            error && 'border-destructive focus:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
