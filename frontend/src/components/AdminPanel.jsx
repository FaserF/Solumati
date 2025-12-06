import React, { useState, useEffect } from 'react';
import { Shield, Settings, Users, Save, RefreshCw, AlertTriangle, Check, UserX, ExternalLink } from 'lucide-react';
import { API_URL, APP_VERSION } from '../config';

const AdminPanel = ({ onLogout, t }) => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);

    // Punishment Modal State
    const [punishModal, setPunishModal] = useState({ show: false, userId: null, reportId: null });
    const [punishReason, setPunishReason] = useState("AdminDeactivation");
    const [banHours, setBanHours] = useState(24);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = () => {
        setLoading(true);
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'reports') fetchReports();
        if (activeTab === 'settings') fetchSettings();
        setLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/users`);
            if (res.ok) setUsers(await res.json());
            else console.error("Failed to fetch users");
        } catch (e) { console.error(e); }
    };

    const fetchReports = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/reports`);
            if (res.ok) setReports(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/settings`);
            if (res.ok) setSettings(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleReactivate = async (id) => {
        await fetch(`${API_URL}/admin/users/${id}/punish`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reactivate' })
        });
        fetchUsers();
    };

    const handleDelete = async (id) => {
        if (!confirm("User unwiderruflich löschen?")) return;
        await fetch(`${API_URL}/admin/users/${id}/punish`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete' })
        });
        fetchUsers();
    };

    const openPunishModal = (userId, reportId = null) => {
        setPunishModal({ show: true, userId, reportId });
        setPunishReason("AdminDeactivation");
    };

    const executePunishment = async () => {
        const payload = {
            action: 'deactivate',
            reason_type: punishReason,
            duration_hours: punishReason === 'TempBan' ? parseInt(banHours) : null
        };

        await fetch(`${API_URL}/admin/users/${punishModal.userId}/punish`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (punishModal.reportId) {
            await fetch(`${API_URL}/admin/reports/${punishModal.reportId}`, { method: 'DELETE' });
            fetchReports();
        } else {
            fetchUsers();
        }
        setPunishModal({ show: false, userId: null, reportId: null });
    };

    const handleNoViolation = async (reportId) => {
        await fetch(`${API_URL}/admin/reports/${reportId}`, { method: 'DELETE' });
        fetchReports();
    };

    const saveSettings = async () => {
        const res = await fetch(`${API_URL}/admin/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        if (res.ok) alert(t('admin.settings.saved'));
        else alert(t('admin.settings.save_error'));
    };

    const updateSetting = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: { ...prev[section], [key]: value }
        }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <Shield className="text-red-600" /> {t('admin.title')}
                        </h1>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 ml-1">
                            <span>v{APP_VERSION}</span>
                            <a href="https://github.com/FaserF/Solumati/releases" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600">
                                Changelog <ExternalLink size={10} />
                            </a>
                        </div>
                    </div>
                    <button onClick={onLogout} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium">{t('btn.logout')}</button>
                </div>

                <div className="flex gap-4 mb-6">
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition ${activeTab === 'users' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                        <Users size={18} /> {t('admin.tab.users')}
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition ${activeTab === 'reports' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                        <AlertTriangle size={18} /> {t('admin.tab.reports')} ({reports.length})
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition ${activeTab === 'settings' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                        <Settings size={18} /> {t('admin.tab.settings')}
                    </button>
                </div>

                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-4 border-b flex justify-end bg-gray-50">
                            <button onClick={fetchUsers} className="text-sm text-gray-500 hover:text-black flex gap-2 font-medium"><RefreshCw size={14} /> {t('admin.btn.refresh')}</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-16">{t('admin.table.id')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.table.user')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.table.status')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.table.registered')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.table.last_login')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">{t('admin.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-400">{t('admin.no_users')}</td>
                                        </tr>
                                    ) : (
                                        users.map(u => (
                                            <tr key={u.id} className="border-b hover:bg-gray-50">
                                                <td className="p-4 text-gray-500">#{u.id}</td>
                                                <td className="p-4 font-medium">
                                                    <div className="font-bold text-gray-800">{u.username}</div>
                                                    <div className="text-xs text-gray-400">{u.email}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        {u.is_guest && <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-bold border border-gray-300">{t('admin.status.guest')}</span>}
                                                        {!u.is_active ?
                                                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold border border-red-200">{t('admin.status.inactive')} ({u.deactivation_reason || '?'})</span> :
                                                            (!u.is_verified ?
                                                                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold border border-yellow-200">{t('admin.status.pending')}</span> :
                                                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold border border-green-200">{t('admin.status.active')}</span>
                                                            )
                                                        }
                                                        {u.banned_until && <div className="text-xs text-red-500 mt-1 font-mono">Bis: {formatDate(u.banned_until)}</div>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">{formatDate(u.created_at)}</td>
                                                <td className="p-4 text-sm text-gray-600">{formatDate(u.last_login)}</td>
                                                <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                                    {u.is_active ?
                                                        <button onClick={() => openPunishModal(u.id)} className="text-orange-600 text-xs border border-orange-200 px-3 py-1 rounded hover:bg-orange-50 font-bold transition">{t('admin.btn.deactivate')}</button> :
                                                        <button onClick={() => handleReactivate(u.id)} className="text-green-600 text-xs border border-green-200 px-3 py-1 rounded hover:bg-green-50 font-bold transition">{t('admin.btn.activate')}</button>
                                                    }
                                                    <button onClick={() => handleDelete(u.id)} className="text-red-600 text-xs border border-red-200 px-3 py-1 rounded hover:bg-red-50 font-bold ml-2 transition">{t('admin.btn.delete')}</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-4 border-b flex justify-end bg-gray-50">
                            <button onClick={fetchReports} className="text-sm text-gray-500 hover:text-black flex gap-2 font-medium"><RefreshCw size={14} /> {t('admin.btn.refresh')}</button>
                        </div>
                        {reports.length === 0 ? <div className="p-12 text-center text-gray-400">{t('admin.no_reports')}</div> : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.reports.reporter')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.reports.reported')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.reports.reason')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">{t('admin.reports.decision')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map(r => (
                                        <tr key={r.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4 text-sm">{r.reporter_name}</td>
                                            <td className="p-4 text-sm font-bold text-red-600">{r.reported_name}</td>
                                            <td className="p-4">
                                                <div className="text-sm font-medium">{r.reason}</div>
                                                <div className="text-xs text-gray-400 mt-1">{formatDate(r.timestamp)}</div>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button onClick={() => handleNoViolation(r.id)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm flex items-center gap-1 inline-flex transition">
                                                    <Check size={14} /> {t('admin.btn.no_violation')}
                                                </button>
                                                <button onClick={() => openPunishModal(r.reported_user_id, r.id)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm flex items-center gap-1 inline-flex transition">
                                                    <UserX size={14} /> {t('admin.btn.punish')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && settings && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow h-fit">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{t('admin.settings.registration_title')}</h2>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition">
                                    <span className="font-medium">{t('admin.settings.allow_reg')}</span>
                                    <input type="checkbox" className="w-5 h-5 accent-pink-600"
                                        checked={settings.registration.enabled}
                                        onChange={e => updateSetting('registration', 'enabled', e.target.checked)}
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition">
                                    <span className="font-medium">{t('admin.settings.require_verify')}</span>
                                    <input type="checkbox" className="w-5 h-5 accent-pink-600"
                                        checked={settings.registration.require_verification}
                                        onChange={e => updateSetting('registration', 'require_verification', e.target.checked)}
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition">
                                    <span className="font-medium">{t('admin.settings.allow_guest')}</span>
                                    <input type="checkbox" className="w-5 h-5 accent-pink-600"
                                        checked={settings.registration.guest_mode_enabled}
                                        onChange={e => updateSetting('registration', 'guest_mode_enabled', e.target.checked)}
                                    />
                                </label>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">{t('admin.settings.domains')}</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none" placeholder="gmail.com, firma.de"
                                        value={settings.registration.allowed_domains}
                                        onChange={e => updateSetting('registration', 'allowed_domains', e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">{t('admin.settings.domains_hint')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow h-fit">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{t('admin.settings.mail_title')}</h2>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition">
                                    <span className="font-medium">{t('admin.settings.mail_active')}</span>
                                    <input type="checkbox" className="w-5 h-5 accent-pink-600"
                                        checked={settings.mail.enabled}
                                        onChange={e => updateSetting('mail', 'enabled', e.target.checked)}
                                    />
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.host')}</label>
                                        <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none" placeholder="smtp.office365.com"
                                            value={settings.mail.smtp_host}
                                            onChange={e => updateSetting('mail', 'smtp_host', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.port')}</label>
                                        <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none" type="number"
                                            value={settings.mail.smtp_port}
                                            onChange={e => updateSetting('mail', 'smtp_port', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.user')}</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none"
                                        value={settings.mail.smtp_user}
                                        onChange={e => updateSetting('mail', 'smtp_user', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.pass')}</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none" type="password" placeholder="***"
                                        value={settings.mail.smtp_password}
                                        onChange={e => updateSetting('mail', 'smtp_password', e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="checkbox" checked={settings.mail.smtp_tls} onChange={e => updateSetting('mail', 'smtp_tls', e.target.checked)} /> Use TLS
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="checkbox" checked={settings.mail.smtp_ssl} onChange={e => updateSetting('mail', 'smtp_ssl', e.target.checked)} /> Use SSL
                                    </label>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.from')}</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none"
                                        value={settings.mail.from_email}
                                        onChange={e => updateSetting('mail', 'from_email', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 flex justify-end">
                            <button onClick={saveSettings} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition transform active:scale-95">
                                <Save size={20} /> {t('btn.save')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {punishModal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <UserX size={20} className="text-red-600" /> {t('admin.modal.punish_title')}
                        </h3>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-500 mb-2">{t('admin.modal.reason')}</label>
                            <select
                                className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={punishReason}
                                onChange={e => setPunishReason(e.target.value)}
                            >
                                <option value="Reported">{t('admin.reason.reported')}</option>
                                <option value="AdminDeactivation">{t('admin.reason.manual')}</option>
                                <option value="TempBan">{t('admin.reason.tempban')}</option>
                                <option value="Unknown">{t('admin.reason.unknown')}</option>
                            </select>
                        </div>

                        {punishReason === 'TempBan' && (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-500 mb-2">{t('admin.modal.duration')}</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    value={banHours}
                                    onChange={e => setBanHours(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1">{t('admin.modal.duration_hint')}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button onClick={() => setPunishModal({ show: false, userId: null })} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition">{t('btn.cancel')}</button>
                            <button onClick={executePunishment} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 shadow-md transition transform active:scale-95">
                                {t('admin.btn.execute_ban')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;