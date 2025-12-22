import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Premium Input Component
 * Supports icons, labels, errors, and password visibility toggle.
 */
export const Input = React.forwardRef(({
    className,
    label,
    error,
    hint,
    icon: Icon,
    rightIcon: RightIcon,
    type = 'text',
    required,
    disabled,
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className="w-full space-y-2">
            {label && (
                <label className={cn(
                    "block text-sm font-medium",
                    "text-zinc-700 dark:text-zinc-300",
                    disabled && "opacity-50 cursor-not-allowed"
                )}>
                    {label}
                    {required && <span className="text-rose-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className={cn(
                        "absolute left-3.5 top-1/2 -translate-y-1/2",
                        "text-zinc-400 dark:text-zinc-500",
                        "group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400",
                        "transition-colors duration-200"
                    )}>
                        <Icon className="h-4 w-4" />
                    </div>
                )}
                <input
                    type={inputType}
                    disabled={disabled}
                    className={cn(
                        // Base
                        "flex h-11 w-full rounded-xl",
                        "px-4 py-3 text-sm",
                        // Colors
                        "bg-white dark:bg-zinc-950/50",
                        "text-zinc-900 dark:text-zinc-100",
                        "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                        // Border
                        "border border-zinc-200 dark:border-zinc-800",
                        // Focus
                        "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                        "focus:border-indigo-500 dark:focus:border-indigo-500",
                        // Hover
                        "hover:border-zinc-300 dark:hover:border-zinc-700",
                        // Transition
                        "transition-all duration-200",
                        // Disabled
                        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-900",
                        // Icon padding
                        Icon && "pl-11",
                        (RightIcon || isPassword) && "pr-11",
                        // Error state
                        error && "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500 text-rose-600 dark:border-rose-500",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn(
                            "absolute right-3.5 top-1/2 -translate-y-1/2",
                            "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
                            "transition-colors duration-200",
                            "focus:outline-none"
                        )}
                        tabIndex={-1}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                )}
                {RightIcon && !isPassword && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
                        <RightIcon className="h-4 w-4" />
                    </div>
                )}
            </div>
            {hint && !error && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {hint}
                </p>
            )}
            {error && (
                <p className="text-sm font-medium text-rose-500 dark:text-rose-400 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

/**
 * Textarea Component
 */
export const Textarea = React.forwardRef(({
    className,
    label,
    error,
    hint,
    required,
    disabled,
    rows = 4,
    ...props
}, ref) => {
    return (
        <div className="w-full space-y-2">
            {label && (
                <label className={cn(
                    "block text-sm font-medium",
                    "text-zinc-700 dark:text-zinc-300",
                    disabled && "opacity-50 cursor-not-allowed"
                )}>
                    {label}
                    {required && <span className="text-rose-500 ml-1">*</span>}
                </label>
            )}
            <textarea
                rows={rows}
                disabled={disabled}
                className={cn(
                    "flex min-h-[100px] w-full rounded-xl",
                    "px-4 py-3 text-sm",
                    "bg-white dark:bg-zinc-950/50",
                    "text-zinc-900 dark:text-zinc-100",
                    "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                    "border border-zinc-200 dark:border-zinc-800",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                    "focus:border-indigo-500 dark:focus:border-indigo-500",
                    "hover:border-zinc-300 dark:hover:border-zinc-700",
                    "transition-all duration-200",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "resize-none",
                    error && "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500",
                    className
                )}
                ref={ref}
                {...props}
            />
            {hint && !error && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
            )}
            {error && (
                <p className="text-sm font-medium text-rose-500 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    {error}
                </p>
            )}
        </div>
    );
});

Textarea.displayName = 'Textarea';

/**
 * Select Component
 */
export const Select = React.forwardRef(({
    className,
    label,
    error,
    hint,
    required,
    disabled,
    children,
    icon: Icon,
    ...props
}, ref) => {
    return (
        <div className="w-full space-y-2">
            {label && (
                <label className={cn(
                    "block text-sm font-medium",
                    "text-zinc-700 dark:text-zinc-300",
                    disabled && "opacity-50"
                )}>
                    {label}
                    {required && <span className="text-rose-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
                        <Icon className="h-4 w-4" />
                    </div>
                )}
                <select
                    disabled={disabled}
                    className={cn(
                        "flex h-11 w-full rounded-xl appearance-none",
                        "px-4 py-3 text-sm",
                        "bg-white dark:bg-zinc-950/50",
                        "text-zinc-900 dark:text-zinc-100",
                        "border border-zinc-200 dark:border-zinc-800",
                        "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
                        "hover:border-zinc-300 dark:hover:border-zinc-700",
                        "transition-all duration-200",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        "pr-10",
                        Icon && "pl-11",
                        error && "border-rose-500 focus:ring-rose-500/20",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {hint && !error && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
            )}
            {error && (
                <p className="text-sm font-medium text-rose-500 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    {error}
                </p>
            )}
        </div>
    );
});

Select.displayName = 'Select';

/**
 * Checkbox Component
 */
export const Checkbox = React.forwardRef(({ className, label, description, error, ...props }, ref) => (
    <div className="flex items-start gap-3">
        <input
            type="checkbox"
            className={cn(
                "mt-0.5 h-5 w-5 rounded-md",
                "border-2 border-zinc-300 dark:border-zinc-600",
                "text-indigo-600",
                "focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-0",
                "transition-all duration-200",
                "cursor-pointer",
                error && "border-rose-500",
                className
            )}
            ref={ref}
            {...props}
        />
        <div className="space-y-0.5">
            {label && (
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    {label}
                </label>
            )}
            {description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
            )}
            {error && (
                <p className="text-sm font-medium text-rose-500">{error}</p>
            )}
        </div>
    </div>
));

Checkbox.displayName = 'Checkbox';
