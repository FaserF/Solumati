import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Premium Avatar Component
 * Supports images, initials, and status indicators.
 */
export const Avatar = ({
    src,
    alt,
    name,
    size = 'md',
    status,
    className,
    ...props
}) => {
    const sizes = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
        '2xl': 'w-20 h-20 text-xl',
    };

    const statusSizes = {
        xs: 'w-1.5 h-1.5 border',
        sm: 'w-2 h-2 border',
        md: 'w-2.5 h-2.5 border-2',
        lg: 'w-3 h-3 border-2',
        xl: 'w-4 h-4 border-2',
        '2xl': 'w-5 h-5 border-2',
    };

    const statusColors = {
        online: 'bg-emerald-500',
        offline: 'bg-zinc-400',
        busy: 'bg-amber-500',
        away: 'bg-orange-500',
    };

    const getInitials = (name) => {
        if (!name) return '';
        const parts = name.split(' ');
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    return (
        <div className={cn("relative inline-flex shrink-0", className)} {...props}>
            {src ? (
                <img
                    src={src}
                    alt={alt || name || 'Avatar'}
                    className={cn(
                        "rounded-full object-cover",
                        "ring-2 ring-white dark:ring-zinc-900",
                        "bg-zinc-100 dark:bg-zinc-800",
                        sizes[size]
                    )}
                />
            ) : name ? (
                <div className={cn(
                    "rounded-full flex items-center justify-center font-semibold",
                    "bg-gradient-to-br from-indigo-500 to-violet-600",
                    "text-white",
                    "ring-2 ring-white dark:ring-zinc-900",
                    sizes[size]
                )}>
                    {getInitials(name)}
                </div>
            ) : (
                <div className={cn(
                    "rounded-full flex items-center justify-center",
                    "bg-zinc-200 dark:bg-zinc-700",
                    "text-zinc-400 dark:text-zinc-500",
                    "ring-2 ring-white dark:ring-zinc-900",
                    sizes[size]
                )}>
                    <User className="w-1/2 h-1/2" />
                </div>
            )}

            {/* Status Indicator */}
            {status && (
                <span className={cn(
                    "absolute bottom-0 right-0 rounded-full",
                    "border-white dark:border-zinc-900",
                    statusSizes[size],
                    statusColors[status] || statusColors.offline
                )} />
            )}
        </div>
    );
};

/**
 * Avatar Group - For showing multiple avatars
 */
export const AvatarGroup = ({
    avatars,
    max = 4,
    size = 'md',
    className,
}) => {
    const visible = avatars.slice(0, max);
    const remaining = avatars.length - max;

    const overlapSizes = {
        xs: '-ml-2',
        sm: '-ml-2',
        md: '-ml-3',
        lg: '-ml-4',
        xl: '-ml-5',
        '2xl': '-ml-6',
    };

    const sizeClasses = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
        '2xl': 'w-20 h-20 text-xl',
    };

    return (
        <div className={cn("flex items-center", className)}>
            {visible.map((avatar, index) => (
                <Avatar
                    key={index}
                    {...avatar}
                    size={size}
                    className={index > 0 ? overlapSizes[size] : ''}
                />
            ))}
            {remaining > 0 && (
                <div className={cn(
                    "rounded-full flex items-center justify-center font-medium",
                    "bg-zinc-200 dark:bg-zinc-700",
                    "text-zinc-600 dark:text-zinc-300",
                    "ring-2 ring-white dark:ring-zinc-900",
                    sizeClasses[size],
                    overlapSizes[size]
                )}>
                    +{remaining}
                </div>
            )}
        </div>
    );
};

/**
 * Avatar with Name - Common pattern
 */
export const AvatarWithName = ({
    src,
    name,
    subtitle,
    size = 'md',
    status,
    className,
}) => (
    <div className={cn("flex items-center gap-3", className)}>
        <Avatar src={src} name={name} size={size} status={status} />
        <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                {name}
            </p>
            {subtitle && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {subtitle}
                </p>
            )}
        </div>
    </div>
);
