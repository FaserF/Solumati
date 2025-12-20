import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ className, label, error, icon: Icon, ...props }, ref) => {
    return (
        <div className="w-full space-y-2">
            {label && (
                <label className="text-sm font-medium leading-none text-zinc-700 dark:text-zinc-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                        <Icon className="h-4 w-4" />
                    </div>
                )}
                <input
                    className={cn(
                        "flex h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-100 dark:focus:ring-indigo-500/20 transition-all duration-200",
                        Icon && "pl-10",
                        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500 text-red-600",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-sm font-medium text-red-500 animate-slide-up">
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
