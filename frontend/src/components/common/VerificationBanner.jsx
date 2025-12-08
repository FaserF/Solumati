import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const VerificationBanner = ({ status, message, onClose }) => {
    if (!status) return null;
    const isSuccess = status === 'success';
    // Material You / iOS Toast Style
    const bgColor = isSuccess ? 'bg-green-100/90 dark:bg-green-900/90 text-green-800 dark:text-green-100' : 'bg-red-100/90 dark:bg-red-900/90 text-red-800 dark:text-red-100';
    const Icon = isSuccess ? CheckCircle : XCircle;

    return (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full ${bgColor} backdrop-blur-md flex items-center gap-3 z-50 shadow-xl border border-white/20 animate-in fade-in slide-in-from-top-4`}>
            <Icon size={20} />
            <span className="font-medium text-sm">{message}</span>
            <button onClick={onClose} className="ml-2 bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors">
                <XCircle size={16} className="opacity-50 hover:opacity-100" />
            </button>
        </div>
    );
};

export default VerificationBanner;
