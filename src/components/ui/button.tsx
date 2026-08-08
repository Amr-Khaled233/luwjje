import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-navy text-background border border-navy hover:bg-[#060f1c] disabled:bg-outline-variant disabled:border-outline-variant disabled:text-secondary',
  secondary:
    'bg-transparent text-navy border border-navy hover:bg-navy hover:text-background disabled:border-outline-variant disabled:text-outline-variant disabled:hover:bg-transparent disabled:hover:text-outline-variant',
  ghost:
    'bg-transparent text-navy border border-transparent underline-offset-4 hover:underline px-0 disabled:text-outline-variant disabled:hover:no-underline',
  danger:
    'bg-transparent text-error border border-error hover:bg-error hover:text-background',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-label-sm',
  md: 'h-11 px-6 text-label-md',
  lg: 'h-14 px-8 text-label-md',
};

const base =
  'inline-flex items-center justify-center gap-2 uppercase tracking-[0.1em] font-semibold text-[12px] leading-4 transition-colors duration-200 ease-scandi disabled:cursor-not-allowed select-none';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], variant !== 'ghost' && sizes[size], className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(base, variants[variant], variant !== 'ghost' && sizes[size], className)}
      {...props}
    />
  );
}
