import { ReactNode, CSSProperties } from 'react';

interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
    className?: string;
    style?: CSSProperties;
}

export function Badge({ children, variant = 'default', className = '', style }: BadgeProps) {
    const baseClasses = 'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full';

    const variantClasses = {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-red-500 text-white',
        outline: 'border border-border text-foreground',
        secondary: 'bg-secondary text-secondary-foreground'
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

    return (
        <span className={classes} style={style}>
            {children}
        </span>
    );
} 