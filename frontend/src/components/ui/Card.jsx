import { cn } from '../../lib/utils';

/**
 * Premium Card Component System
 * Supports glass, solid, outline, and flat variants with hover effects.
 */
export const Card = ({
    children,
    className,
    variant = 'glass',
    interactive = false,
    glow = false,
    ...props
}) => {
    const variants = {
        glass: "glass-card",
        outline: cn(
            "border-2 border-zinc-200 dark:border-zinc-800",
            "bg-white dark:bg-zinc-950",
            "hover:border-zinc-300 dark:hover:border-zinc-700"
        ),
        solid: cn(
            "bg-white dark:bg-zinc-900",
            "shadow-xl shadow-black/5 dark:shadow-black/30",
            "border border-zinc-100 dark:border-zinc-800"
        ),
        flat: cn(
            "bg-zinc-50 dark:bg-zinc-900/50",
            "border border-zinc-100 dark:border-zinc-800/50"
        ),
        gradient: cn(
            "bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950",
            "border border-zinc-200/50 dark:border-zinc-700/50",
            "shadow-xl"
        ),
        elevated: cn(
            "bg-white dark:bg-zinc-900",
            "shadow-2xl shadow-black/10 dark:shadow-black/40",
            "border border-white/50 dark:border-zinc-700/50"
        ),
    };

    return (
        <div
            className={cn(
                "rounded-2xl p-6 relative overflow-hidden",
                "transition-all duration-300 ease-out",
                variants[variant],
                interactive && "cursor-pointer interactive-lift",
                glow && "glow",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

/**
 * Card Header - Contains title and description
 */
export const CardHeader = ({ children, className, noBorder }) => (
    <div className={cn(
        "mb-4",
        !noBorder && "pb-4 border-b border-zinc-100 dark:border-zinc-800/50",
        className
    )}>
        {children}
    </div>
);

/**
 * Card Title - Main heading
 */
export const CardTitle = ({ children, className, as: Component = 'h3' }) => (
    <Component className={cn(
        "text-xl font-semibold text-zinc-900 dark:text-white leading-tight",
        className
    )}>
        {children}
    </Component>
);

/**
 * Card Description - Subtitle/description text
 */
export const CardDescription = ({ children, className }) => (
    <p className={cn(
        "text-sm text-zinc-500 dark:text-zinc-400 mt-1.5",
        className
    )}>
        {children}
    </p>
);

/**
 * Card Content - Main content area
 */
export const CardContent = ({ children, className }) => (
    <div className={cn("relative z-10", className)}>
        {children}
    </div>
);

/**
 * Card Footer - Actions/footer area
 */
export const CardFooter = ({ children, className, noBorder }) => (
    <div className={cn(
        "mt-6 flex items-center gap-3",
        !noBorder && "pt-4 border-t border-zinc-100 dark:border-zinc-800/50",
        className
    )}>
        {children}
    </div>
);

/**
 * Card Grid - Responsive grid for card layouts
 */
export const CardGrid = ({ children, className, cols = 3 }) => {
    const colsMap = {
        1: "grid-cols-1",
        2: "grid-cols-1 md:grid-cols-2",
        3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    };

    return (
        <div className={cn(
            "grid gap-6",
            colsMap[cols],
            className
        )}>
            {children}
        </div>
    );
};

/**
 * Feature Card - For highlighting features with icon
 */
export const FeatureCard = ({ icon: Icon, title, description, className }) => (
    <Card variant="flat" className={cn("group", className)}>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25 group-hover:shadow-xl group-hover:shadow-indigo-500/30 transition-all duration-300">
            <Icon className="w-6 h-6 text-white" />
        </div>
        <h4 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{title}</h4>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
    </Card>
);

/**
 * Stat Card - For displaying statistics
 */
export const StatCard = ({ label, value, change, changeType = 'neutral', icon: Icon }) => (
    <Card variant="solid" className="relative overflow-hidden">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
                {change && (
                    <p className={cn(
                        "mt-1 text-sm font-medium",
                        changeType === 'positive' && "text-emerald-600 dark:text-emerald-400",
                        changeType === 'negative' && "text-rose-600 dark:text-rose-400",
                        changeType === 'neutral' && "text-zinc-500 dark:text-zinc-400"
                    )}>
                        {change}
                    </p>
                )}
            </div>
            {Icon && (
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <Icon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                </div>
            )}
        </div>
    </Card>
);
