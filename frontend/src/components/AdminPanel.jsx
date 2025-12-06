import React, { useState, useEffect } from 'react';
import { Shield, Settings, Users, Save, RefreshCw, AlertTriangle, Check, UserX, ExternalLink, XCircle, Mail, FileText, CheckCircle } from 'lucide-react';
import { API_URL, APP_VERSION } from '../config';

const AdminPanel = ({ onLogout, t }) => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [testEmail, setTestEmail] = useState("");

    // Punishment Modal State
    const [punishModal, setPunishModal] = useState({ show: false, userId: null, reportId: null });
    const [punishReason, setPunishReason] = useState("AdminDeactivation");
    const [banHours, setBanHours] = useState(24);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = () => {
        setError(null);
        setLoading(true);
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'reports') fetchReports();
        if (activeTab === 'settings' || activeTab === 'legal') fetchSettings();
        setLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/users`);
            if (res.ok) setUsers(await res.json());
            else setError(`Error ${res.status}`);
        } catch (e) { setError("Connection Error"); }
    };

    const fetchReports = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/reports`);
            if (res.ok) setReports(await res.json());
        } catch (e) { setError("Load error"); }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/settings`);
            if (res.ok) setSettings(await res.json());
        } catch (e) { setError("Load error"); }
    };

    const handleUserAction = async (id, action) => {
        if (action === 'delete' && !confirm("Irreversible action. Sure?")) return;

        await fetch(`${API_URL}/admin/users/${id}/punish`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
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

    const saveSettings = async () => {
        const res = await fetch(`${API_URL}/admin/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        if (res.ok) alert(t('admin.settings.saved'));
        else alert(t('admin.settings.save_error'));
    };

    const sendTestEmail = async () => {
        if (!testEmail) return alert("Email address required");
        try {
            const res = await fetch(`${API_URL}/admin/test-mail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_email: testEmail })
            });
            if (res.ok) alert("Email Sent!");
            else {
                const err = await res.json();
                alert("Error: " + err.detail);
            }
        } catch (e) { alert("Network Error"); }
    };

    const updateSetting = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: { ...prev[section], [key]: value }
        }));
    };

    const handleEncryptionChange = (mode) => {
        setSettings(prev => ({
            ...prev,
            mail: {
                ...prev.mail,
                smtp_ssl: mode === 'ssl',
                smtp_tls: mode === 'tls'
            }
        }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString('de-DE');
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
                        </div>
                    </div>
                    <button onClick={onLogout} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium">{t('btn.logout')}</button>
                </div>

                {error && (
                    <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex items-start gap-3">
                        <XCircle /> <div><p className="font-bold">Error</p><p className="text-sm">{error}</p></div>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition ${activeTab === 'users' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                        <Users size={18} /> {t('admin.tab.users')}
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition ${activeTab === 'reports' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                        <AlertTriangle size={18} /> {t('admin.tab.reports')} ({reports.length})
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition ${activeTab === 'settings' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                        <Settings size={18} /> {t('admin.tab.settings')}
                    </button>
                    <button onClick={() => setActiveTab('legal')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition ${activeTab === 'legal' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                        <FileText size={18} /> {t('admin.tab.legal')}
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
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">{t('admin.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4 text-gray-500">#{u.id}</td>
                                            <td className="p-4 font-medium">
                                                <div className="font-bold text-gray-800">{u.username}</div>
                                                <div className="text-xs text-gray-400">{u.email}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    {u.is_guest && <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">{t('admin.status.guest')}</span>}
                                                    {!u.is_active ?
                                                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold">{t('admin.status.inactive')}</span> :
                                                        (!u.is_verified ?
                                                            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">{t('admin.status.pending')}</span> :
                                                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">{t('admin.status.active')}</span>
                                                        )
                                                    }
                                                </div>
                                            </td>
                                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                                {!u.is_verified && !u.is_guest && (
                                                    <button onClick={() => handleUserAction(u.id, 'verify')} className="text-blue-600 text-xs border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 font-bold">{t('admin.btn.verify')}</button>
                                                )}
                                                {u.is_active ?
                                                    <button onClick={() => openPunishModal(u.id)} className="text-orange-600 text-xs border border-orange-200 px-3 py-1 rounded hover:bg-orange-50 font-bold">{t('admin.btn.deactivate')}</button> :
                                                    <button onClick={() => handleUserAction(u.id, 'reactivate')} className="text-green-600 text-xs border border-green-200 px-3 py-1 rounded hover:bg-green-50 font-bold">{t('admin.btn.activate')}</button>
                                                }
                                                <button onClick={() => handleUserAction(u.id, 'delete')} className="text-red-600 text-xs border border-red-200 px-3 py-1 rounded hover:bg-red-50 font-bold">{t('admin.btn.delete')}</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="bg-white rounded-xl shadow p-4">
                        {reports.length === 0 ? <p className="text-center text-gray-400">{t('admin.no_reports')}</p> : (
                            reports.map(r => (
                                <div key={r.id} className="border-b py-4 flex justify-between">
                                    <div>
                                        <p className="font-bold text-red-600">{r.reported_name}</p>
                                        <p className="text-sm">{r.reason}</p>
                                        <p className="text-xs text-gray-400">Reporter: {r.reporter_name}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUserAction(r.id, 'no_violation')} className="text-gray-500 border px-2 rounded">{t('admin.btn.no_violation')}</button>
                                        <button onClick={() => openPunishModal(r.reported_user_id, r.id)} className="bg-red-100 text-red-600 px-2 rounded">{t('admin.btn.punish')}</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'settings' && settings && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow h-fit">
                            <h2 className="text-xl font-bold mb-4">{t('admin.settings.registration_title')}</h2>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer">
                                    <span className="font-medium">{t('admin.settings.allow_reg')}</span>
                                    <input type="checkbox" className="w-5 h-5 accent-pink-600"
                                        checked={settings.registration.enabled}
                                        onChange={e => updateSetting('registration', 'enabled', e.target.checked)}
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer">
                                    <span className="font-medium">{t('admin.settings.require_verify')}</span>
                                    <input type="checkbox" className="w-5 h-5 accent-pink-600"
                                        checked={settings.registration.require_verification}
                                        onChange={e => updateSetting('registration', 'require_verification', e.target.checked)}
                                    />
                                </label>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">{t('admin.settings.server_domain')}</label>
                                    <input className="w-full p-2 border rounded" placeholder="dating.example.com"
                                        value={settings.registration.server_domain}
                                        onChange={e => updateSetting('registration', 'server_domain', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">{t('admin.settings.domains')}</label>
                                    <input className="w-full p-2 border rounded" placeholder="gmail.com, firma.de"
                                        value={settings.registration.allowed_domains}
                                        onChange={e => updateSetting('registration', 'allowed_domains', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow h-fit">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Mail size={20} /> {t('admin.settings.mail_title')}
                            </h2>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer">
                                    <span className="font-medium">{t('admin.settings.mail_active')}</span>
                                    <input type="checkbox" className="w-5 h-5 accent-pink-600"
                                        checked={settings.mail.enabled}
                                        onChange={e => updateSetting('mail', 'enabled', e.target.checked)}
                                    />
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.host')}</label>
                                        <input className="w-full p-2 border rounded" value={settings.mail.smtp_host} onChange={e => updateSetting('mail', 'smtp_host', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.port')}</label>
                                        <input className="w-full p-2 border rounded" type="number" value={settings.mail.smtp_port} onChange={e => updateSetting('mail', 'smtp_port', parseInt(e.target.value))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.user')}</label>
                                        <input className="w-full p-2 border rounded" value={settings.mail.smtp_user} onChange={e => updateSetting('mail', 'smtp_user', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.pass')}</label>
                                        <input className="w-full p-2 border rounded" type="password" value={settings.mail.smtp_password} onChange={e => updateSetting('mail', 'smtp_password', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.sender_name')}</label>
                                        <input className="w-full p-2 border rounded" value={settings.mail.sender_name} onChange={e => updateSetting('mail', 'sender_name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.from')}</label>
                                        <input className="w-full p-2 border rounded" value={settings.mail.from_email} onChange={e => updateSetting('mail', 'from_email', e.target.value)} />
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded">
                                    <label className="text-xs font-bold text-gray-500 mb-2 block">Encryption</label>
                                    <div className="flex gap-4 text-sm">
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" name="enc" checked={!settings.mail.smtp_ssl && !settings.mail.smtp_tls} onChange={() => handleEncryptionChange('none')} />
                                            {t('admin.settings.enc_none')}
                                        </label>
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" name="enc" checked={settings.mail.smtp_tls} onChange={() => handleEncryptionChange('tls')} />
                                            {t('admin.settings.enc_tls')}
                                        </label>
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" name="enc" checked={settings.mail.smtp_ssl} onChange={() => handleEncryptionChange('ssl')} />
                                            {t('admin.settings.enc_ssl')}
                                        </label>
                                    </div>
                                </div>

                                <div className="border-t pt-4 mt-4">
                                    <div className="flex gap-2">
                                        <input className="flex-grow p-2 border rounded text-sm" placeholder="test@email.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                                        <button onClick={sendTestEmail} className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold whitespace-nowrap">{t('admin.settings.test_mail_btn')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 flex justify-end">
                            <button onClick={saveSettings} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg">
                                <Save size={20} /> {t('btn.save')}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'legal' && settings && (
                    <div className="bg-white p-6 rounded-xl shadow h-fit">
                        <h2 className="text-xl font-bold mb-4">{t('admin.settings.legal_title')}</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block font-bold text-gray-700 mb-2">{t('admin.settings.imprint')}</label>
                                <textarea
                                    className="w-full h-48 p-4 border rounded font-mono text-sm bg-gray-50"
                                    value={settings.legal.imprint}
                                    onChange={e => updateSetting('legal', 'imprint', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-2">{t('admin.settings.privacy')}</label>
                                <textarea
                                    className="w-full h-48 p-4 border rounded font-mono text-sm bg-gray-50"
                                    value={settings.legal.privacy}
                                    onChange={e => updateSetting('legal', 'privacy', e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end">
                                <button onClick={saveSettings} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg">
                                    <Save size={20} /> {t('btn.save')}
                                </button>
                            </div>
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
                        {/* Modal Content same as before */}
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
                            </select>
                        </div>
                        {punishReason === 'TempBan' && (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-500 mb-2">{t('admin.modal.duration')}</label>
                                <input type="number" min="1" className="w-full p-3 border rounded-lg bg-gray-50" value={banHours} onChange={e => setBanHours(e.target.value)} />
                            </div>
                        )}
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button onClick={() => setPunishModal({ show: false })} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">{t('btn.cancel')}</button>
                            <button onClick={executePunishment} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">{t('admin.btn.execute_ban')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;