import { WifiOff, ServerCrash, RefreshCw } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';

const ServerOffline = ({ status = 'offline', onContinue }) => {
    const { globalConfig } = useConfig();
    const supportEmail = globalConfig?.support_email;
    const supportEnabled = globalConfig?.support_chat_enabled && supportEmail;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
                <div className="flex justify-center mb-6">
                    <div className="bg-red-50 p-6 rounded-full">
                        {status === 'maintenance' ? (
                            <ServerCrash size={48} className="text-orange-500" />
                        ) : (
                            <WifiOff size={48} className="text-red-500" />
                        )}
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {status === 'maintenance' ? 'Under Maintenance' : 'Connection Lost'}
                </h1>

                <p className="text-gray-500 mb-8 leading-relaxed">
                    {status === 'maintenance'
                        ? "We are currently updating our servers to make things better. Please check back shortly."
                        : "We cannot reach the Solumati servers. This might be due to a server restart, update, or technical issue."
                    }
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={20} /> Try Again
                    </button>

                    {onContinue && status !== 'maintenance' && (
                        <button
                            onClick={onContinue}
                            className="w-full bg-white border-2 border-gray-200 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                        >
                            Continue Offline
                        </button>
                    )}
                </div>

                <p className="mt-6 text-xs text-gray-400">
                    If this persists, please{' '}
                    {supportEnabled ? (
                        <a
                            href={`mailto:${supportEmail}`}
                            className="text-pink-500 hover:text-pink-600 underline"
                        >
                            contact support
                        </a>
                    ) : (
                        'contact support'
                    )}.
                </p>
            </div>
        </div>
    );
};

export default ServerOffline;
