import { cn } from '@/lib/utils';

export function Badge({ children, className, variant = 'default' }: {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline';
}) {
  const variants = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    destructive: 'bg-red-100 text-red-700',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  );
}
