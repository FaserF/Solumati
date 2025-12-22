import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Premium Button Component
 * Supports multiple variants, sizes, and states with micro-animations.
 */
export const Button = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled,
    as: Component = 'button',
    type = 'button',
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    ...props
}) => {
    const baseStyles = cn(
        // Layout
        "inline-flex items-center justify-center gap-2",
        // Typography
        "font-medium",
        // Transitions
        "transition-all duration-200 ease-out",
        // Focus
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950",
        // Disabled
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        // Active
        "active:scale-[0.97]"
    );

    const variants = {
        primary: cn(
            "bg-gradient-to-r from-indigo-600 to-violet-600",
            "hover:from-indigo-500 hover:to-violet-500",
            "text-white",
            "shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30",
            "border border-transparent",
            "focus-visible:ring-indigo-500"
        ),
        secondary: cn(
            "bg-white dark:bg-zinc-800/80",
            "text-zinc-900 dark:text-white",
            "border border-zinc-200 dark:border-zinc-700",
            "hover:bg-zinc-50 dark:hover:bg-zinc-700/80",
            "hover:border-zinc-300 dark:hover:border-zinc-600",
            "shadow-sm hover:shadow-md",
            "focus-visible:ring-zinc-500"
        ),
        outline: cn(
            "bg-transparent",
            "border-2 border-indigo-500 dark:border-indigo-400",
            "text-indigo-600 dark:text-indigo-400",
            "hover:bg-indigo-50 dark:hover:bg-indigo-950/30",
            "hover:border-indigo-600 dark:hover:border-indigo-300",
            "focus-visible:ring-indigo-500"
        ),
        ghost: cn(
            "bg-transparent",
            "text-zinc-600 dark:text-zinc-400",
            "hover:bg-zinc-100 dark:hover:bg-zinc-800",
            "hover:text-zinc-900 dark:hover:text-white",
            "focus-visible:ring-zinc-500"
        ),
        danger: cn(
            "bg-gradient-to-r from-rose-500 to-red-600",
            "hover:from-rose-400 hover:to-red-500",
            "text-white",
            "shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30",
            "focus-visible:ring-rose-500"
        ),
        success: cn(
            "bg-gradient-to-r from-emerald-500 to-green-600",
            "hover:from-emerald-400 hover:to-green-500",
            "text-white",
            "shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30",
            "focus-visible:ring-emerald-500"
        ),
        glass: cn(
            "backdrop-blur-xl bg-white/10 dark:bg-white/5",
            "border border-white/20 dark:border-white/10",
            "text-white",
            "hover:bg-white/20 dark:hover:bg-white/10",
            "shadow-lg"
        ),
        link: cn(
            "bg-transparent",
            "text-indigo-600 dark:text-indigo-400",
            "hover:text-indigo-700 dark:hover:text-indigo-300",
            "underline-offset-4 hover:underline",
            "p-0 h-auto"
        ),
    };

    const sizes = {
        xs: "h-7 px-2.5 text-xs rounded-lg",
        sm: "h-8 px-3 text-sm rounded-lg",
        md: "h-10 px-4 text-sm rounded-xl",
        lg: "h-12 px-6 text-base rounded-xl",
        xl: "h-14 px-8 text-lg rounded-2xl",
        icon: "h-10 w-10 p-0 rounded-xl",
        "icon-sm": "h-8 w-8 p-0 rounded-lg",
        "icon-lg": "h-12 w-12 p-0 rounded-xl",
    };

    return (
        <Component
            type={Component === 'button' ? type : undefined}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : LeftIcon ? (
                <LeftIcon className="w-4 h-4" />
            ) : null}
            {children}
            {!isLoading && RightIcon && <RightIcon className="w-4 h-4" />}
        </Component>
    );
};

/**
 * Button Group - For grouping related buttons
 */
export const ButtonGroup = ({ children, className }) => (
    <div className={cn("inline-flex items-center divide-x divide-white/20 rounded-xl overflow-hidden", className)}>
        {React.Children.map(children, (child) =>
            React.cloneElement(child, {
                className: cn(child.props.className, "rounded-none first:rounded-l-xl last:rounded-r-xl"),
            })
        )}
    </div>
);

/**
 * Icon Button - Optimized for icon-only buttons
 */
export const IconButton = ({ icon: Icon, className, variant = 'ghost', size = 'icon', ...props }) => (
    <Button variant={variant} size={size} className={className} {...props}>
        <Icon className="w-5 h-5" />
    </Button>
);
