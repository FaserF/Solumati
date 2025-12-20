import React from 'react';
import { cn } from '../../lib/utils';

export const Container = ({ children, className, size = 'xl', ...props }) => {
    const sizes = {
        sm: "max-w-screen-sm",
        md: "max-w-screen-md",
        lg: "max-w-screen-lg",
        xl: "max-w-screen-xl",
        '2xl': "max-w-screen-2xl",
        full: "max-w-full"
    };

    return (
        <div className={cn("mx-auto px-4 sm:px-6 lg:px-8 w-full", sizes[size], className)} {...props}>
            {children}
        </div>
    );
};
