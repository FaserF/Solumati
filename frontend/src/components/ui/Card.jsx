import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className, variant = 'glass', ...props }) => {
    const variants = {
        glass: "glass-card",
        outline: "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950",
        solid: "bg-white dark:bg-zinc-900 shadow-xl border border-transparent",
        flat: "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50"
    };

    return (
        <div className={cn("rounded-2xl p-6 relative overflow-hidden", variants[variant], className)} {...props}>
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className }) => (
    <div className={cn("mb-4", className)}>
        {children}
    </div>
);

export const CardTitle = ({ children, className }) => (
    <h3 className={cn("text-xl font-semibold text-zinc-900 dark:text-white leading-tight", className)}>
        {children}
    </h3>
);

export const CardDescription = ({ children, className }) => (
    <p className={cn("text-sm text-zinc-500 dark:text-zinc-400 mt-1", className)}>
        {children}
    </p>
);

export const CardContent = ({ children, className }) => (
    <div className={cn("relative z-10", className)}>
        {children}
    </div>
);

export const CardFooter = ({ children, className }) => (
    <div className={cn("mt-6 flex items-center pt-4 border-t border-zinc-100 dark:border-white/10", className)}>
        {children}
    </div>
);
