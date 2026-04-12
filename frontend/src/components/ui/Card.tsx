import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'ghost';
  noPadding?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', noPadding = false, ...props }, ref) => {

    const variants = {
      default: 'bg-card text-card-foreground border-border shadow-sm hover:shadow-md',
      outline: 'bg-transparent border-border border-2',
      ghost: 'bg-transparent border-transparent shadow-none',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'border rounded-xl transition-all',
          variants[variant],
          !noPadding && 'p-4',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
