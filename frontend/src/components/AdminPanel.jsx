import React, { useState, useEffect } from 'react';
import { Shield, Settings, Users, Save, RefreshCw, AlertTriangle, Check, UserX, XCircle, ArrowLeft, Crown, UserMinus, Edit2, Activity, Eye, EyeOff, Server, Globe, Database, HardDrive, FileText, Ban } from 'lucide-react';
import { API_URL, APP_VERSION } from '../config';

const AdminPanel = ({ user, onLogout, onBack, t, testMode }) => {
    // Role Checks
    const isModerator = user?.role === 'moderator';
    const isAdmin = user?.role === 'admin';
    const canManageUsers = isAdmin;
    const canViewReports = isAdmin || isModerator;
    const canManageSettings = isAdmin;
    const canViewDiagnostics = isAdmin;

    const [activeTab, setActiveTab] = useState(isModerator ? 'reports' : 'users');
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [settings, setSettings] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    const [changelog, setChangelog] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Track unsaved changes for settings
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    // Punishment Modal State
    const [punishModal, setPunishModal] = useState({ show: false, userId: null, reportId: null });
    const [punishReason, setPunishReason] = useState("AdminDeactivation");
    const [customReason, setCustomReason] = useState("");
    const [banHours, setBanHours] = useState(24);

    // Edit User Modal State
    const [editModal, setEditModal] = useState({ show: false, user: null });
    const [editForm, setEditForm] = useState({ username: '', email: '', password: '', is_visible_in_matches: true });

    // Test Mail
    const [testMailTarget, setTestMailTarget] = useState("");

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = () => {
        setError(null);
        setLoading(true);
        if (activeTab === 'users' && canManageUsers) fetchUsers();
        if (activeTab === 'reports' && canViewReports) fetchReports();
        if (activeTab === 'settings' && canManageSettings) fetchSettings();
        if (activeTab === 'diagnostics' && canViewDiagnostics) fetchDiagnostics();
        setLoading(false);
    };

    const authHeaders = {
        'Content-Type': 'application/json',
        'X-User-ID': user.user_id.toString()
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/users`, { headers: authHeaders });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                setError(`Fehler beim Laden der Benutzer: Status ${res.status}`);
            }
        } catch (e) {
            setError("Verbindungsfehler. Bitte prüfe die Server-Logs.");
        }
    };

    const fetchReports = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/reports`, { headers: authHeaders });
            if (res.ok) setReports(await res.json());
        } catch (e) { setError("Konnte Berichte nicht laden."); }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/settings`, { headers: authHeaders });
            if (res.ok) {
                setSettings(await res.json());
                setUnsavedChanges(false);
            }
        } catch (e) { setError("Konnte Einstellungen nicht laden."); }
    };

    const fetchDiagnostics = async () => {
        setLoading(true);
        try {
            const diagRes = await fetch(`${API_URL}/admin/diagnostics`, { headers: authHeaders });
            if (diagRes.ok) setDiagnostics(await diagRes.json());

            const changeRes = await fetch(`${API_URL}/admin/changelog`, { headers: authHeaders });
            if (changeRes.ok) setChangelog(await changeRes.json());
        } catch (e) { setError("Diagnostics failed."); }
        setLoading(false);
    };

    const handleAction = async (id, action) => {
        try {
            const res = await fetch(`${API_URL}/admin/users/${id}/punish`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ action: action })
            });

            if (res.ok) {
                fetchUsers();
            } else {
                const err = await res.json();
                alert("Fehler: " + (err.detail || "Unbekannt"));
            }
        } catch (e) {
            alert("Netzwerkfehler");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("User unwiderruflich löschen?")) return;
        handleAction(id, 'delete');
    };

    const openEditModal = (user) => {
        setEditForm({
            username: user.username,
            email: user.email,
            password: '',
            is_visible_in_matches: user.is_visible_in_matches
        });
        setEditModal({ show: true, user });
    };

    const saveUserEdit = async () => {
        if (!editModal.user) return;
        try {
            const res = await fetch(`${API_URL}/admin/users/${editModal.user.id}`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                setEditModal({ show: false, user: null });
                fetchUsers();
                alert("Benutzer erfolgreich aktualisiert.");
            } else {
                const err = await res.json();
                alert("Fehler: " + (err.detail || "Unbekannt"));
            }
        } catch (e) { alert("Verbindungsfehler"); }
    };

    const openPunishModal = (userId, reportId = null) => {
        setPunishModal({ show: true, userId, reportId });
        setPunishReason("AdminDeactivation");
        setCustomReason("");
    };

    const executePunishment = async () => {
        const payload = {
            action: 'deactivate',
            reason_type: punishReason,
            custom_reason: customReason,
            duration_hours: punishReason === 'TempBan' ? parseInt(banHours) : null
        };

        await fetch(`${API_URL}/admin/users/${punishModal.userId}/punish`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });

        if (punishModal.reportId) {
            await fetch(`${API_URL}/admin/reports/${punishModal.reportId}`, { method: 'DELETE', headers: authHeaders });
            fetchReports();
        } else {
            fetchUsers();
        }
        setPunishModal({ show: false, userId: null, reportId: null });
    };

    const handleNoViolation = async (reportId) => {
        await fetch(`${API_URL}/admin/reports/${reportId}`, { method: 'DELETE', headers: authHeaders });
        fetchReports();
    };

    const saveSettings = async () => {
        const res = await fetch(`${API_URL}/admin/settings`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(settings)
        });
        if (res.ok) {
            alert(t('admin.settings.saved'));
            setUnsavedChanges(false);
        }
        else alert(t('admin.settings.save_error'));
    };

    const sendTestMail = async () => {
        if (unsavedChanges) {
            alert(t('admin.settings.unsaved_warning', "Bitte speichere erst die Änderungen!"));
            return;
        }
        if (!testMailTarget) return alert("Bitte Zieladresse eingeben.");
        try {
            const res = await fetch(`${API_URL}/admin/settings/test-mail`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ target_email: testMailTarget })
            });
            if (res.ok) alert("Email gesendet!");
            else {
                const err = await res.json();
                alert("Fehler: " + err.detail);
            }
        } catch (e) { alert("Netzwerkfehler"); }
    };

    const updateSetting = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: { ...prev[section], [key]: value }
        }));
        setUnsavedChanges(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getEncryptionMode = () => {
        if (!settings?.mail) return 'none';
        if (settings.mail.smtp_ssl) return 'ssl';
        if (settings.mail.smtp_tls) return 'tls';
        return 'none';
    };

    const setEncryptionMode = (mode) => {
        setSettings(prev => ({
            ...prev,
            mail: {
                ...prev.mail,
                smtp_ssl: mode === 'ssl',
                smtp_tls: mode === 'tls'
            }
        }));
        setUnsavedChanges(true);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <Shield className="text-red-600" /> {t('admin.title')}
                        </h1>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 ml-1">
                            <span>v{APP_VERSION}</span>
                            <span className="font-mono bg-gray-100 px-2 rounded">Role: {user.role}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onBack} className="bg-white border hover:bg-gray-50 text-gray-800 px-4 py-2 rounded font-medium flex items-center gap-2">
                            <ArrowLeft size={16} /> {t('btn.back')}
                        </button>
                        <button onClick={onLogout} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium">{t('btn.logout')}</button>
                    </div>
                </div>

                {/* TEST MODE BANNER */}
                {testMode && (
                    <div className="mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded shadow-sm flex items-start gap-3">
                        <Activity className="flex-shrink-0" />
                        <div>
                            <p className="font-bold">{t('alert.test_mode_active', 'WARNING: Test Mode Active')}</p>
                            <p className="text-sm">{t('alert.test_mode_admin_info', 'Dummy users generated.')}</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex items-start gap-3">
                        <XCircle className="flex-shrink-0" />
                        <div>
                            <p className="font-bold">Ein Fehler ist aufgetreten</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                    {canManageUsers && (
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition whitespace-nowrap ${activeTab === 'users' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                            <Users size={18} /> {t('admin.tab.users')}
                        </button>
                    )}
                    {canViewReports && (
                        <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition whitespace-nowrap ${activeTab === 'reports' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                            <AlertTriangle size={18} /> {t('admin.tab.reports')} ({reports.length})
                        </button>
                    )}
                    {canManageSettings && (
                        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition whitespace-nowrap ${activeTab === 'settings' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                            <Settings size={18} /> {t('admin.tab.settings')}
                        </button>
                    )}
                    {canViewDiagnostics && (
                        <button onClick={() => setActiveTab('diagnostics')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition whitespace-nowrap ${activeTab === 'diagnostics' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                            <Activity size={18} /> {t('admin.tab.diagnostics')}
                        </button>
                    )}
                </div>

                {/* Content Area */}

                {/* 1. USERS TAB */}
                {activeTab === 'users' && canManageUsers && (
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
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.table.role')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Visibility</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.table.status')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">{t('admin.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr><td colSpan="7" className="p-8 text-center text-gray-400">{loading ? "Lade..." : t('admin.no_users')}</td></tr>
                                    ) : (
                                        users.map(u => (
                                            <tr key={u.id} className="border-b hover:bg-gray-50">
                                                <td className="p-4 text-gray-500">#{u.id}</td>
                                                <td className="p-4 font-medium">
                                                    <div className="font-bold text-gray-800">{u.username}</div>
                                                    <div className="text-xs text-gray-400">{u.email}</div>
                                                </td>
                                                <td className="p-4">
                                                    {u.role === 'admin' ? <span className="text-red-600 font-bold flex items-center gap-1"><Shield size={12} /> Admin</span> :
                                                        u.role === 'moderator' ? <span className="text-blue-600 font-bold flex items-center gap-1"><Shield size={12} /> Mod</span> :
                                                            u.role === 'guest' ? <span className="text-gray-500 font-bold flex items-center gap-1"><UserX size={12} /> Guest</span> :
                                                                <span className="text-gray-500">User</span>}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {u.is_visible_in_matches ?
                                                        <Eye size={18} className="text-green-500 mx-auto" title={t('admin.tooltip.visible')} /> :
                                                        <EyeOff size={18} className="text-gray-300 mx-auto" title={t('admin.tooltip.hidden')} />
                                                    }
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        {u.is_guest && <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-bold border border-gray-300">{t('admin.status.guest')}</span>}
                                                        {!u.is_active ?
                                                            <div className="flex flex-col">
                                                                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold border border-red-200">{t('admin.status.inactive')}</span>
                                                                {u.deactivation_reason && <span className="text-[10px] text-red-500">{u.deactivation_reason}</span>}
                                                            </div> :
                                                            (!u.is_verified ?
                                                                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold border border-yellow-200">{t('admin.status.pending')}</span> :
                                                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold border border-green-200">{t('admin.status.active')}</span>
                                                            )
                                                        }
                                                        {u.banned_until && <div className="text-xs text-red-500 mt-1 font-mono">{t('admin.ban_until')}: {formatDate(u.banned_until)}</div>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                                    {/* Action Buttons */}
                                                    <button title={t('admin.btn.edit')} onClick={() => openEditModal(u)} className="text-gray-600 hover:bg-gray-100 p-1 rounded"><Edit2 size={16} /></button>
                                                    {u.is_active && !u.is_verified && (
                                                        <button title={t('admin.btn.verify')} onClick={() => handleAction(u.id, 'verify')} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16} /></button>
                                                    )}

                                                    {/* Role Management */}
                                                    {u.role !== 'admin' && u.id !== 0 && (
                                                        <>
                                                            {/* Promotion Logic: Guest cannot be promoted */}
                                                            {u.role !== 'moderator' && u.role !== 'guest' && (
                                                                <button title={t('admin.btn.promote')} onClick={() => handleAction(u.id, 'promote_moderator')} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Crown size={16} /></button>
                                                            )}
                                                            {/* Demotion Logic */}
                                                            {u.role === 'moderator' && (
                                                                <button title={t('admin.btn.demote')} onClick={() => handleAction(u.id, 'demote_user')} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><UserMinus size={16} /></button>
                                                            )}
                                                            {/* Make Guest Logic */}
                                                            {u.role !== 'guest' && (
                                                                <button title={t('admin.btn.make_guest')} onClick={() => handleAction(u.id, 'demote_guest')} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><Ban size={16} /></button>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* Block / Delete Actions - Protected for Admin and Guest(0) */}
                                                    {u.role !== 'admin' && (
                                                        <>
                                                            {u.is_active ?
                                                                <button onClick={() => openPunishModal(u.id)} className="text-orange-600 text-xs border border-orange-200 px-3 py-1 rounded hover:bg-orange-50 font-bold transition">{t('admin.btn.deactivate')}</button> :
                                                                <button onClick={() => handleAction(u.id, 'reactivate')} className="text-green-600 text-xs border border-green-200 px-3 py-1 rounded hover:bg-green-50 font-bold transition">{t('admin.btn.activate')}</button>
                                                            }
                                                            {u.id !== 0 && (
                                                                <button onClick={() => handleDelete(u.id)} className="text-red-600 text-xs border border-red-200 px-3 py-1 rounded hover:bg-red-50 font-bold ml-2 transition">{t('admin.btn.delete')}</button>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 2. REPORTS TAB */}
                {activeTab === 'reports' && canViewReports && (
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

                {/* 3. SETTINGS TAB */}
                {activeTab === 'settings' && canManageSettings && settings && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* GENERAL SETTINGS */}
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

                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">{t('admin.settings.server_domain')}</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none"
                                        placeholder="http://localhost:3000"
                                        value={settings.registration.server_domain || ""}
                                        onChange={e => updateSetting('registration', 'server_domain', e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Domain for email links.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">{t('admin.settings.domains')}</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none" placeholder="gmail.com, firma.de"
                                        value={settings.registration.allowed_domains}
                                        onChange={e => updateSetting('registration', 'allowed_domains', e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">{t('admin.settings.domains_hint')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1 text-red-600">{t('admin.settings.blocked_domains')}</label>
                                    <input className="w-full p-2 border rounded border-red-200 focus:ring-2 focus:ring-red-500 focus:outline-none" placeholder="spam.com, bad.net"
                                        value={settings.registration.blocked_domains}
                                        onChange={e => updateSetting('registration', 'blocked_domains', e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">{t('admin.settings.domains_hint')}</p>
                                </div>
                            </div>
                        </div>

                        {/* LEGAL SETTINGS - TEMPLATE FIELDS */}
                        <div className="bg-white p-6 rounded-xl shadow h-fit">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">{t('admin.settings.legal_title')}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.company_name')}</label>
                                    <input className="w-full p-2 border rounded" value={settings.legal.company_name} onChange={e => updateSetting('legal', 'company_name', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.ceo_name')}</label>
                                    <input className="w-full p-2 border rounded" value={settings.legal.ceo_name} onChange={e => updateSetting('legal', 'ceo_name', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.address_street')}</label>
                                    <input className="w-full p-2 border rounded" value={settings.legal.address_street} onChange={e => updateSetting('legal', 'address_street', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.address_zip_city')}</label>
                                    <input className="w-full p-2 border rounded" value={settings.legal.address_zip_city} onChange={e => updateSetting('legal', 'address_zip_city', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.contact_email')}</label>
                                        <input className="w-full p-2 border rounded" value={settings.legal.contact_email} onChange={e => updateSetting('legal', 'contact_email', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">{t('admin.settings.contact_phone')}</label>
                                        <input className="w-full p-2 border rounded" value={settings.legal.contact_phone} onChange={e => updateSetting('legal', 'contact_phone', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.register_court')}</label>
                                    <input className="w-full p-2 border rounded" value={settings.legal.register_court} onChange={e => updateSetting('legal', 'register_court', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.register_number')}</label>
                                    <input className="w-full p-2 border rounded" value={settings.legal.register_number} onChange={e => updateSetting('legal', 'register_number', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.vat_id')}</label>
                                    <input className="w-full p-2 border rounded" value={settings.legal.vat_id} onChange={e => updateSetting('legal', 'vat_id', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* MAIL SETTINGS */}
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
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">{t('admin.settings.encryption')}</label>
                                    <select
                                        className="w-full p-2 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        value={getEncryptionMode()}
                                        onChange={(e) => setEncryptionMode(e.target.value)}
                                    >
                                        <option value="none">{t('admin.settings.enc_none', 'Keine')}</option>
                                        <option value="tls">{t('admin.settings.enc_tls', 'STARTTLS')} ({t('admin.settings.enc_recommended', 'Empfohlen')})</option>
                                        <option value="ssl">{t('admin.settings.enc_ssl', 'SSL')} (Port 465)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.sender_name')}</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none"
                                        value={settings.mail.sender_name || "Solumati"}
                                        onChange={e => updateSetting('mail', 'sender_name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">{t('admin.settings.from')}</label>
                                    <input className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none"
                                        value={settings.mail.from_email}
                                        onChange={e => updateSetting('mail', 'from_email', e.target.value)}
                                    />
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex gap-2">
                                        <input
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-pink-500 focus:outline-none text-sm"
                                            placeholder="test@example.com"
                                            value={testMailTarget}
                                            onChange={e => setTestMailTarget(e.target.value)}
                                        />
                                        <button onClick={sendTestMail} className="bg-gray-200 text-gray-800 px-3 py-2 rounded font-bold text-xs whitespace-nowrap hover:bg-gray-300">
                                            {t('admin.settings.test_mail_btn')}
                                        </button>
                                    </div>
                                    {unsavedChanges && <p className="text-xs text-orange-500 mt-1 font-bold">⚠️ {t('admin.settings.unsaved_warning', "Ungespeicherte Änderungen!")}</p>}
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

                {/* 4. DIAGNOSTICS TAB */}
                {activeTab === 'diagnostics' && canViewDiagnostics && diagnostics && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Version Card */}
                            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-gray-500 uppercase text-xs">{t('admin.diag.version')}</h3>
                                    <Server size={20} className="text-blue-500" />
                                </div>
                                <div className="text-2xl font-bold">{diagnostics.current_version}</div>
                                <div className="text-sm mt-1">
                                    {diagnostics.update_available ? (
                                        <span className="text-red-500 font-bold flex items-center gap-1">
                                            <AlertTriangle size={12} /> {t('admin.diag.update_available')} (v{diagnostics.latest_version})
                                        </span>
                                    ) : (
                                        <span className="text-green-500 flex items-center gap-1">
                                            <Check size={12} /> {t('admin.diag.up_to_date')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Internet Card */}
                            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-gray-500 uppercase text-xs">{t('admin.diag.internet')}</h3>
                                    <Globe size={20} className="text-purple-500" />
                                </div>
                                <div className="text-xl font-bold">
                                    {diagnostics.internet_connected ?
                                        <span className="text-green-600">{t('admin.diag.online')}</span> :
                                        <span className="text-red-600">{t('admin.diag.offline')}</span>
                                    }
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Ping Check (Google DNS)</div>
                            </div>

                            {/* Database Card */}
                            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-gray-500 uppercase text-xs">{t('admin.diag.database')}</h3>
                                    <Database size={20} className="text-green-500" />
                                </div>
                                <div className="text-xl font-bold">
                                    {diagnostics.database_connected ?
                                        <span className="text-green-600">{t('admin.diag.connected')}</span> :
                                        <span className="text-red-600">{t('admin.diag.disconnected')}</span>
                                    }
                                </div>
                                <div className="text-xs text-gray-400 mt-1">PostgreSQL Latency Check</div>
                            </div>

                            {/* Storage Card */}
                            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-orange-500">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-gray-500 uppercase text-xs">{t('admin.diag.disk')}</h3>
                                    <HardDrive size={20} className="text-orange-500" />
                                </div>
                                <div className="text-xl font-bold">{diagnostics.disk_free_gb} GB {t('admin.diag.free')}</div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${diagnostics.disk_percent}%` }}></div>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{diagnostics.disk_percent}% Used</div>
                            </div>
                        </div>

                        {/* Changelog Section */}
                        <div className="bg-white p-6 rounded-xl shadow">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-gray-600" /> {t('admin.diag.changelog')}
                            </h2>
                            {changelog.length === 0 ? (
                                <p className="text-gray-400 italic">Keine Release-Informationen gefunden.</p>
                            ) : (
                                <div className="space-y-6">
                                    {changelog.map((release, i) => (
                                        <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-gray-800">
                                                    {release.name || release.tag_name}
                                                </h3>
                                                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                                                    {new Date(release.published_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-gray-600">
                                                <pre className="whitespace-pre-wrap font-sans text-sm">{release.body}</pre>
                                            </div>
                                            {release.html_url && (
                                                <a href={release.html_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs mt-2 inline-block">
                                                    Auf GitHub ansehen
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Github Link */}
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-gray-800 flex flex-col justify-between">
                            <h3 className="font-bold text-gray-500 text-xs">PROJECT</h3>
                            <a href="https://github.com/FaserF/Solumati" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 font-bold hover:underline">
                                <Github size={20} /> GitHub Repo
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Punish Modal */}
            {punishModal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <UserX size={20} className="text-red-600" /> {t('admin.modal.punish_title')}
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-500 mb-2">{t('admin.modal.reason')}</label>
                            <select className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500" value={punishReason} onChange={e => setPunishReason(e.target.value)}>
                                <option value="Reported">{t('admin.reason.reported')}</option>
                                <option value="AdminDeactivation">{t('admin.reason.manual')}</option>
                                <option value="TempBan">{t('admin.reason.tempban')}</option>
                                <option value="Unknown">{t('admin.reason.unknown')}</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-500 mb-2">{t('admin.modal.custom_reason')}</label>
                            <textarea className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Details regarding the ban..." value={customReason} onChange={e => setCustomReason(e.target.value)} />
                        </div>
                        {punishReason === 'TempBan' && (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-500 mb-2">{t('admin.modal.duration')}</label>
                                <input type="number" min="1" className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500" value={banHours} onChange={e => setBanHours(e.target.value)} />
                                <p className="text-xs text-gray-400 mt-1">{t('admin.modal.duration_hint')}</p>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button onClick={() => setPunishModal({ show: false, userId: null })} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition">{t('btn.cancel')}</button>
                            <button onClick={executePunishment} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 shadow-md transition transform active:scale-95">{t('admin.btn.execute_ban')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editModal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <Edit2 size={20} className="text-blue-600" /> {t('admin.modal.edit_title')}
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-500 mb-2">{t('label.realname')}</label>
                            <input className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-500 mb-2">{t('label.email')}</label>
                            <input className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                        </div>

                        {/* Match Visibility Toggle */}
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 accent-pink-600"
                                    checked={editForm.is_visible_in_matches}
                                    onChange={e => setEditForm({ ...editForm, is_visible_in_matches: e.target.checked })}
                                />
                                <div>
                                    <span className="font-bold text-sm block">{t('admin.user.visible', 'Sichtbar in Matches')}</span>
                                    <span className="text-xs text-gray-500">
                                        {t('admin.user.visible_hint', 'Deaktivieren, wenn dieser Account ein reiner Admin-Account sein soll.')}
                                    </span>
                                </div>
                            </label>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-500 mb-2">{t('admin.user.pw_reset', 'Passwort (Reset)')}</label>
                            <input className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('admin.user.pw_new', 'Neues Passwort (leer lassen für keine Änderung)')} value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button onClick={() => setEditModal({ show: false, user: null })} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition">{t('btn.cancel')}</button>
                            <button onClick={saveUserEdit} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md transition transform active:scale-95">{t('btn.save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;