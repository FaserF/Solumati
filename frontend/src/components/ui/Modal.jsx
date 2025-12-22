import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

/**
 * Premium Modal Component
 * Animated, accessible modal with backdrop blur.
 */
export const Modal = ({
    isOpen,
    onClose,
    children,
    className,
    size = 'md',
    showCloseButton = true,
    closeOnBackdrop = true,
    title,
    description,
}) => {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[90vw] max-h-[90vh]',
    };

    const handleBackdropClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose?.();
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
                onClick={handleBackdropClick}
            />

            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className={cn(
                        "relative w-full",
                        sizes[size],
                        "bg-white dark:bg-zinc-900",
                        "rounded-2xl shadow-2xl",
                        "border border-zinc-200/50 dark:border-zinc-700/50",
                        "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300",
                        className
                    )}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Close Button */}
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className={cn(
                                "absolute right-4 top-4 z-10",
                                "p-2 rounded-xl",
                                "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
                                "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                                "transition-all duration-200"
                            )}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}

                    {/* Header */}
                    {(title || description) && (
                        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                            {title && (
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white pr-8">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                                    {description}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Modal Footer - Actions area
 */
export const ModalFooter = ({ children, className }) => (
    <div className={cn(
        "flex items-center justify-end gap-3 pt-4",
        "border-t border-zinc-100 dark:border-zinc-800",
        className
    )}>
        {children}
    </div>
);

/**
 * Confirmation Modal - Pre-built confirmation dialog
 */
export const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false,
}) => {

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            title={title}
            description={description}
        >
            <ModalFooter>
                <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                    {cancelText}
                </Button>
                <Button
                    variant={variant}
                    onClick={onConfirm}
                    isLoading={isLoading}
                >
                    {confirmText}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
