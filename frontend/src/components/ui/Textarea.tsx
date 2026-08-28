import React from "react";

import { cn } from "../../lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-ring focus:border-transparent outline-none bg-background text-foreground border-input placeholder:text-muted-foreground min-h-[100px] resize-y",
            error && "border-destructive focus:ring-destructive",
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
