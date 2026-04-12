import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {

    const variants = {
      primary: `text-primary-foreground bg-primary hover:bg-primary/90 shadow-lg`,
      secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80`,
      accent: `bg-accent text-accent-foreground hover:opacity-90 shadow-lg`,
      ghost: `hover:bg-accent hover:text-accent-foreground text-foreground`,
      outline: `border border-input text-foreground hover:bg-accent hover:text-accent-foreground bg-transparent`,
      danger: `bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md`,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-3 text-sm font-medium rounded-xl',
      lg: 'px-6 py-4 text-base font-semibold rounded-2xl',
      icon: 'p-3 rounded-full',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          variants[variant],
          sizes[size],
          className
        )}
        style={{
          // Some variants might need dynamic theme colors if not fully covered by Tailwind classes
          // However, assuming Tailwind classes map to theme variables is better.
        }}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
