import React from 'react';
import { Shield } from 'lucide-react';

const AdminPanel = ({ adminData, onAction, onLogout, t }) => (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <Shield className="text-red-600" />
                    {t('admin.title')}
                </h1>
                <button onClick={onLogout} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium transition">
                    Logout
                </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Username</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">E-Mail</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminData.map(u => (
                                <tr key={u.id} className="border-b hover:bg-gray-50 transition">
                                    <td className="p-4 text-gray-600">#{u.id}</td>
                                    <td className="p-4 font-bold text-gray-800">{u.username}</td>
                                    <td className="p-4 text-gray-500">{u.email}</td>
                                    <td className="p-4">
                                        {u.is_active ?
                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{t('admin.status.active')}</span> :
                                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">{t('admin.status.inactive')}</span>
                                        }
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        {u.is_active ? (
                                            <button onClick={() => onAction(u.id, "deactivate")} className="text-orange-500 hover:text-orange-700 text-sm font-medium">
                                                {t('admin.btn.deactivate')}
                                            </button>
                                        ) : (
                                            <button onClick={() => onAction(u.id, "reactivate")} className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                                                {t('admin.btn.activate')}
                                            </button>
                                        )}
                                        <button onClick={() => onAction(u.id, "delete")} className="text-red-500 hover:text-red-700 text-sm font-medium ml-2">
                                            {t('admin.btn.delete')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
);

export default AdminPanel;