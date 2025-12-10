
import { Shield } from 'lucide-react';

const AdminLogin = ({ adminPass, setAdminPass, onLogin, onBack, t }) => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 w-full max-w-sm text-white shadow-2xl">
            <div className="flex justify-center mb-6">
                <div className="bg-red-500/20 p-4 rounded-full">
                    <Shield size={48} className="text-red-500" />
                </div>
            </div>
            <h2 className="text-center text-2xl font-bold mb-6">{t('admin.access_title')}</h2>
            <input
                className="w-full mb-4 p-3 rounded bg-gray-900 border border-gray-600 text-white focus:border-red-500 focus:outline-none"
                type="password"
                placeholder="Master Password"
                value={adminPass}
                onChange={e => setAdminPass(e.target.value)}
            />
            <button onClick={onLogin} className="w-full bg-red-600 hover:bg-red-700 py-3 rounded font-bold transition">
                Entsperren
            </button>
            <button onClick={onBack} className="w-full mt-4 text-gray-500 text-sm hover:text-white transition">
                {t('btn.cancel')}
            </button>
        </div>
    </div>
);

export default AdminLogin;