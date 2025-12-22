import { cn } from '../../lib/utils';

/**
 * Premium Badge Component
 * For status indicators, tags, and labels.
 */
export const Badge = ({
    children,
    className,
    variant = 'default',
    size = 'md',
    dot = false,
    icon: Icon,
    ...props
}) => {
    const variants = {
        default: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        primary: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
        success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        danger: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
        info: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
        outline: "bg-transparent border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300",
        "outline-primary": "bg-transparent border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400",
        gradient: "bg-gradient-to-r from-indigo-500 to-violet-500 text-white",
    };

    const sizes = {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
    };

    const dotColors = {
        default: "bg-zinc-500",
        primary: "bg-indigo-500",
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        danger: "bg-rose-500",
        info: "bg-sky-500",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 font-medium rounded-full",
                "transition-all duration-200",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {dot && (
                <span className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    dotColors[variant] || dotColors.default
                )} />
            )}
            {Icon && <Icon className="w-3 h-3" />}
            {children}
        </span>
    );
};

/**
 * Status Badge - For online/offline/busy states
 */
export const StatusBadge = ({ status = 'offline', showLabel = true, className }) => {
    const statusConfig = {
        online: { color: 'bg-emerald-500', label: 'Online', ring: 'ring-emerald-500/20' },
        offline: { color: 'bg-zinc-400', label: 'Offline', ring: 'ring-zinc-400/20' },
        busy: { color: 'bg-amber-500', label: 'Busy', ring: 'ring-amber-500/20' },
        away: { color: 'bg-orange-500', label: 'Away', ring: 'ring-orange-500/20' },
    };

    const config = statusConfig[status] || statusConfig.offline;

    return (
        <span className={cn("inline-flex items-center gap-2", className)}>
            <span className={cn(
                "w-2.5 h-2.5 rounded-full ring-2",
                config.color,
                config.ring,
                status === 'online' && 'animate-pulse'
            )} />
            {showLabel && (
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {config.label}
                </span>
            )}
        </span>
    );
};

/**
 * Count Badge - For notification counts
 */
export const CountBadge = ({ count, max = 99, className }) => {
    const displayCount = count > max ? `${max}+` : count;

    if (!count || count <= 0) return null;

    return (
        <span className={cn(
            "inline-flex items-center justify-center",
            "min-w-[1.25rem] h-5 px-1.5",
            "text-xs font-bold text-white",
            "bg-rose-500 rounded-full",
            "shadow-lg shadow-rose-500/30",
            className
        )}>
            {displayCount}
        </span>
    );
};
