
import { Loader2, Server } from 'lucide-react';

const MaintenancePage = ({ type = 'startup', onAdminLogin }) => {
    const isStartup = type === 'startup';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 relative">
                    <Server size={40} />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white animate-pulse ${isStartup ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {isStartup ? "System Starting" : "Maintenance Mode"}
                </h1>
                <p className="text-gray-500 mb-8">
                    {isStartup
                        ? "The backend is initializing. Please wait a moment..."
                        : "We are currently improving the system. Registration and login are temporarily disabled."}
                </p>

                <div className="flex flex-col gap-4 items-center">
                    <div className="flex items-center justify-center gap-3 text-blue-600 font-bold bg-blue-50 py-3 px-6 rounded-xl w-full">
                        <Loader2 size={20} className="animate-spin" />
                        <span>{isStartup ? "Connecting..." : "Checking Status..."}</span>
                    </div>

                    {!isStartup && onAdminLogin && (
                        <button onClick={onAdminLogin} className="text-sm text-gray-400 hover:text-gray-600 underline mt-2">
                            Login as Administrator
                        </button>
                    )}
                </div>

                <p className="text-xs text-gray-400 mt-6 font-mono">
                    Status: {isStartup ? "503 Booting" : "503 Maintenance"}
                </p>
            </div>
        </div>
    );
};

export default MaintenancePage;
