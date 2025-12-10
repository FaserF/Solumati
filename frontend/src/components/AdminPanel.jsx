import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import { Shield, Settings, Users, Save, RefreshCw, AlertTriangle, Check, UserX, XCircle, ArrowLeft, Crown, UserMinus, UserPlus, Edit2, Activity, Eye, EyeOff, Server, Globe, Database, HardDrive, FileText, Ban, Github, Info, Beaker, Zap, Mail, Unlock, MessageSquare, LifeBuoy, CheckCircle } from 'lucide-react';
import { API_URL, APP_VERSION, APP_NAME, APP_RELEASE_TYPE } from '../config';

const AdminPanel = ({ user, onLogout, onBack, t, testMode, maintenanceMode }) => {
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

    // Inbox State
    const [conversations, setConversations] = useState([]);

    // Chat State
    const [activeChatUser, setActiveChatUser] = useState(null);

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

    // Roles Modal State
    const [rolesModalOpen, setRolesModalOpen] = useState(false);
    const [systemRoles, setSystemRoles] = useState([]);

    // Test Mail
    const [testMailTarget, setTestMailTarget] = useState("");

    // Create User State
    const [createUserModal, setCreateUserModal] = useState(false);
    const [createUserForm, setCreateUserForm] = useState({ username: '', email: '', password: '', role: 'user' });

    const handleCreateUser = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/users`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(createUserForm)
            });
            if (res.ok) {
                setCreateUserModal(false);
                setCreateUserForm({ username: '', email: '', password: '', role: 'user' }); // Reset
                fetchUsers();
                alert("User created successfully.");
            } else {
                const err = await res.json();
                alert("Error: " + (err.detail || "Unknown"));
            }
        } catch (e) { alert("Connection Error"); }
    };

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
        if (activeTab === 'inbox') fetchConversations();
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
                setError(`Error loading users: Status ${res.status}`);
            }
        } catch (e) {
            setError("Connection error. Please check server logs.");
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
        } catch (e) { setError("Could not load settings."); }
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

    const fetchConversations = async () => {
        try {
            const res = await fetch(`${API_URL}/chat/conversations`, { headers: authHeaders });
            if (res.ok) {
                setConversations(await res.json());
            }
        } catch (e) { setError("Could not load conversations."); }
    };

    // --- Roles Logic ---
    const openRolesModal = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/roles`, { headers: authHeaders });
            if (res.ok) {
                setSystemRoles(await res.json());
                setRolesModalOpen(true);
            } else {
                alert("Could not load roles.");
            }
        } catch (e) { alert("Network Error"); }
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
                alert("Error: " + (err.detail || "Unknown"));
            }
        } catch (e) {
            alert("Network Error");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Permanently delete user?")) return;
        handleAction(id, 'delete');
    };

    const handleResetUser2FA = async (id) => {
        if (!confirm("Are you sure you want to reset 2FA for this user? They will need to set it up again.")) return;
        try {
            const res = await fetch(`${API_URL}/admin/users/${id}/reset-2fa`, {
                method: 'POST',
                headers: authHeaders
            });
            if (res.ok) {
                alert("2FA Reset Successfully.");
                fetchUsers();
            } else {
                const err = await res.json();
                alert("Error: " + (err.detail || "Unknown"));
            }
        } catch (e) { alert("Network Error"); }
    };

    const handleDeleteReport = async (reportId) => {
        if (!confirm("Are you sure you want to delete this report?")) return;
        try {
            const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
                method: 'DELETE',
                headers: authHeaders
            });
            if (res.ok) fetchReports();
            else alert("Failed to delete report.");
        } catch (e) { alert("Network Error"); }
    };

    const openEditModal = (user) => {
        setEditForm({
            username: user.username,
            email: user.email,
            password: '',
            is_visible_in_matches: user.is_visible_in_matches,
            role: user.role
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
            } else {
                const err = await res.json();
                alert("Error: " + err.detail);
            }
        } catch (e) { alert("Error saving user."); }
    };

    const saveSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/settings`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                alert(t('admin.settings.saved'));
                setUnsavedChanges(false);
                return true;
            }
            else {
                alert(t('admin.settings.save_error'));
                return false;
            }
        } catch (e) { alert("Network Error"); return false; }
    };

    const sendTestMail = async () => {
        if (unsavedChanges) {
            const success = await saveSettings();
            if (!success) return;
        }
        if (!testMailTarget) return alert("Please enter target address.");
        try {
            const res = await fetch(`${API_URL}/admin/settings/test-mail`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ target_email: testMailTarget })
            });
            if (res.ok) alert("Email sent!");
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

    const validateOAuth = (provider, id) => {
        if (!id) return true;
        if (provider === 'google') return id.endsWith('.apps.googleusercontent.com');
        if (provider === 'microsoft') return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (provider === 'github') return id.length > 5;
        return true;
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

    const isMailConfigured = () => {
        return settings.mail.smtp_host && settings.mail.smtp_host.length > 0;
    };

    // Helper to get Release Type Icon/Color
    const renderReleaseBadge = () => {
        if (!APP_RELEASE_TYPE || APP_RELEASE_TYPE === 'stable') return null;

        if (APP_RELEASE_TYPE === 'beta') {
            return (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider">
                    <Info size={14} /> Beta
                </div>
            );
        }

        // Nightly / Development
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold uppercase tracking-wider">
                <Beaker size={14} /> Nightly
            </div>
        );
    };

    return (
        <div className="w-full text-gray-900 dark:text-gray-100 font-sans">
            {/* Admin Header / Navbar - Glass Effect */}
            <div className="glass flex items-center justify-between p-4 md:p-6 mb-8 rounded-3xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg shadow-red-500/20">
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-2xl tracking-tight flex items-center gap-2">
                            {isModerator ? 'Moderator Panel' : 'Admin Console'}
                            {renderReleaseBadge()}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono tracking-wider uppercase">
                            System v{APP_VERSION} <span className="opacity-50">({APP_RELEASE_TYPE})</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all">
                        <ArrowLeft size={18} /> {t('btn.back')}
                    </button>
                </div>
            </div>

            {/* MAINTENANCE MODE BANNER */}
            {
                maintenanceMode && (
                    <div className="mb-6 bg-red-100/90 dark:bg-red-900/60 border border-red-500 text-red-800 dark:text-red-100 p-4 rounded-3xl backdrop-blur-sm flex items-start gap-4 animate-pulse">
                        <AlertTriangle className="flex-shrink-0 mt-1" />
                        <div>
                            <p className="font-bold text-lg">{t('alert.maintenance_mode_active', 'Maintenance Mode Active')}</p>
                            <p className="text-sm opacity-90">{t('alert.maintenance_mode_admin_info', 'The system is currently locked for non-admins.')}</p>
                        </div>
                    </div>
                )
            }

            {/* TEST MODE BANNER */}
            {
                testMode && (
                    <div className="mb-6 bg-yellow-100/80 dark:bg-yellow-900/40 border border-yellow-500/50 text-yellow-800 dark:text-yellow-200 p-4 rounded-3xl backdrop-blur-sm flex items-start gap-4">
                        <Activity className="flex-shrink-0 mt-1" />
                        <div>
                            <p className="font-bold text-lg">{t('alert.test_mode_active', 'Test Mode Active')}</p>
                            <p className="text-sm opacity-80">{t('alert.test_mode_admin_info', 'System is using generated dummy data.')}</p>
                        </div>
                    </div>
                )
            }

            {
                error && (
                    <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex items-start gap-3">
                        <XCircle className="flex-shrink-0" />
                        <div>
                            <p className="font-bold">An error occurred</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )
            }

            {/* Chat Window Overlay */}
            {activeChatUser && (
                <div className="fixed bottom-4 right-4 z-[100] w-full max-w-sm">
                    <ChatWindow
                        currentUser={user}
                        chatPartner={{
                            id: activeChatUser.id,
                            username: activeChatUser.username,
                            image_url: activeChatUser.image_url
                        }}
                        token={user.user_id || localStorage.getItem('token')}
                        onClose={() => setActiveChatUser(null)}
                    />
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                {canManageUsers && (
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition whitespace-nowrap ${activeTab === 'users' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                        <Users size={18} /> {t('admin.tab.users')}
                    </button>
                )}
                <button onClick={() => setActiveTab('inbox')} className={`px-4 py-2 rounded-lg font-bold flex gap-2 transition whitespace-nowrap ${activeTab === 'inbox' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>
                    <MessageSquare size={18} /> Inbox
                </button>
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

            {/* 0. INBOX TAB */}
            {
                activeTab === 'inbox' && (
                    <div className="bg-white rounded-xl shadow overflow-hidden min-h-[400px]">
                        <div className="p-4 border-b flex justify-between bg-gray-50">
                            <h3 className="font-bold flex items-center gap-2">
                                <MessageSquare className="text-blue-500" /> Inbox
                            </h3>
                            <button onClick={fetchConversations} className="text-sm text-gray-500 hover:text-black flex gap-2 font-medium items-center">
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>
                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                                <MessageSquare size={48} className="mb-4 opacity-50" />
                                <p>No conversations found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {conversations.map((c) => (
                                    <button
                                        key={c.partner_id}
                                        onClick={() => setActiveChatUser({ id: c.partner_id, username: c.partner_username, image_url: c.partner_image_url })}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition text-left"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                            {c.partner_image_url ?
                                                <img src={`${API_URL}${c.partner_image_url}`} className="w-full h-full object-cover" alt={c.partner_username} /> :
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold text-lg">
                                                    {c.partner_username[0]}
                                                </div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="font-bold text-gray-900 truncate">{c.partner_real_name || c.partner_username}</h4>
                                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                                    {new Date(c.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">
                                                {c.last_message}
                                            </p>
                                        </div>
                                        {c.unread_count > 0 && (
                                            <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                                                {c.unread_count}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            {/* 1. USERS TAB */}
            {
                activeTab === 'users' && canManageUsers && (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-4 border-b flex justify-between bg-gray-50">
                            <button onClick={openRolesModal} className="text-sm text-blue-600 hover:text-blue-800 flex gap-2 font-bold items-center border border-blue-200 px-3 py-1 rounded bg-blue-50">
                                <Info size={14} /> {t('admin.btn.roles', 'Role Info')}
                            </button>
                            <button onClick={() => setCreateUserModal(true)} className="text-sm text-green-600 hover:text-green-800 flex gap-2 font-bold items-center border border-green-200 px-3 py-1 rounded bg-green-50">
                                <UserPlus size={14} /> New User
                            </button>
                            <button onClick={fetchUsers} className="text-sm text-gray-500 hover:text-black flex gap-2 font-medium items-center">
                                <RefreshCw size={14} /> {t('admin.btn.refresh')}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-16">{t('admin.table.id')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.table.user')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.table.role')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">Registered</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">Last Login</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Visibility</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('admin.table.status')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">{t('admin.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr><td colSpan="7" className="p-8 text-center text-gray-400">{loading ? "Loading..." : t('admin.no_users')}</td></tr>
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
                                                            u.role === 'guest' ? <span className="text-orange-500 font-medium flex items-center gap-1"><UserMinus size={12} /> Guest</span> :
                                                                <span className="text-gray-600 flex items-center gap-1"><Users size={12} /> User</span>}
                                                </td>
                                                <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{formatDate(u.created_at)}</td>
                                                <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{formatDate(u.last_login)}</td>
                                                <td className="p-4 text-center">
                                                    {u.is_visible_in_matches ?
                                                        <span className="inline-flex items-center text-green-600 bg-green-100 px-2 py-1 rounded text-xs gap-1"><Eye size={12} /> Visible</span> :
                                                        <span className="inline-flex items-center text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs gap-1"><EyeOff size={12} /> Hidden</span>
                                                    }
                                                </td>
                                                <td className="p-4">
                                                    {u.is_active ?
                                                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold"><Check size={12} /> Active</span> :
                                                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold"><Ban size={12} /> Banned</span>
                                                    }
                                                    {!u.is_verified && <div className="mt-1 text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 w-fit">Unverified</div>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {u.id !== user?.user_id && (
                                                            <button onClick={() => setActiveChatUser(u)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Chat">
                                                                <MessageSquare size={16} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => openEditModal(u)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        {u.is_active ? (
                                                            (u.id !== 1) && (
                                                                <button onClick={() => setPunishModal({ show: true, userId: u.id })} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Ban/Punish">
                                                                    <Ban size={16} />
                                                                </button>
                                                            )
                                                        ) : (
                                                            (u.id !== 1) && (
                                                                <button onClick={() => handleAction(u.id, 'reactivate')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Reactivate">
                                                                    <Check size={16} />
                                                                </button>
                                                            )
                                                        )}
                                                        {![0, 1, 3].includes(u.id) && (
                                                            <button onClick={() => handleDelete(u.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                                <UserX size={16} />
                                                            </button>
                                                        )}
                                                        {u.has_totp || u.has_passkeys || u.two_factor_method !== 'none' ? (
                                                            <button onClick={() => handleResetUser2FA(u.id)} className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Reset 2FA">
                                                                <Unlock size={16} />
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* 2. REPORTS TAB */}
            {
                activeTab === 'reports' && canViewReports && (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-4 border-b flex justify-between bg-gray-50">
                            <h3 className="font-bold flex items-center gap-2">
                                <AlertTriangle className="text-red-500" /> User Reports
                            </h3>
                            <button onClick={fetchReports} className="text-sm text-gray-500 hover:text-black flex gap-2 font-medium items-center">
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Reporter</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Reported User</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Reason</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.length === 0 ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-400">No reports found.</td></tr>
                                    ) : (
                                        reports.map(r => (
                                            <tr key={r.id} className="border-b hover:bg-gray-50">
                                                <td className="p-4 text-sm font-medium">{r.reporter_username}</td>
                                                <td className="p-4 text-sm font-bold text-red-600">{r.reported_username}</td>
                                                <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                                                <td className="p-4 text-xs text-gray-500">{formatDate(r.created_at)}</td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => handleDeleteReport(r.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded">
                                                        <Check size={16} /> Resolve
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* 3. SETTINGS TAB */}
            {
                activeTab === 'settings' && canManageSettings && settings && (
                    <div className="grid gap-6">
                        {/* MAIL SETTINGS - REDESIGNED */}
                        <div className="bg-white rounded-xl shadow p-6">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                                    <Mail className="text-blue-500" />
                                    {t('admin.settings.mail', 'Mail Settings')}
                                </h2>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="toggle"
                                        checked={settings.mail.enabled}
                                        onChange={(e) => updateSetting('mail', 'enabled', e.target.checked)}
                                    />
                                    <span className={`font-bold text-sm px-2 py-1 rounded ${settings.mail.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {settings.mail.enabled ? 'ENABLED' : 'DISABLED'}
                                    </span>
                                </label>
                            </div>

                            <div className={`grid md:grid-cols-2 gap-6 transition-opacity ${!settings.mail.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.smtp_server')}</label>
                                        <input
                                            type="text"
                                            value={settings.mail.smtp_host || ''}
                                            onChange={(e) => updateSetting('mail', 'smtp_host', e.target.value)}
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            placeholder="smtp.example.com"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.smtp_port')}</label>
                                            <input
                                                type="number"
                                                value={settings.mail.smtp_port}
                                                onChange={(e) => updateSetting('mail', 'smtp_port', parseInt(e.target.value) || 0)}
                                                className="w-full p-2 border rounded-lg font-mono"
                                                placeholder="587"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Encryption</label>
                                            <select
                                                value={getEncryptionMode()}
                                                onChange={(e) => setEncryptionMode(e.target.value)}
                                                className="w-full p-2 border rounded-lg bg-gray-50"
                                            >
                                                <option value="none">None</option>
                                                <option value="ssl">SSL</option>
                                                <option value="tls">TLS (STARTTLS)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.smtp_user')}</label>
                                        <input
                                            type="text"
                                            value={settings.mail.smtp_user || ''}
                                            onChange={(e) => updateSetting('mail', 'smtp_user', e.target.value)}
                                            className="w-full p-2 border rounded-lg"
                                            placeholder="user@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.smtp_password')}</label>
                                        <input
                                            type="password"
                                            value={settings.mail.smtp_password}
                                            onChange={(e) => updateSetting('mail', 'smtp_password', e.target.value)}
                                            className="w-full p-2 border rounded-lg"
                                            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t flex flex-wrap gap-4 items-end">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.sender_address')}</label>
                                    <input
                                        type="email"
                                        value={settings.mail.from_email || ''}
                                        onChange={(e) => updateSetting('mail', 'from_email', e.target.value)}
                                        className="w-full p-2 border rounded-lg"
                                        placeholder="noreply@example.com"
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.sender_name')}</label>
                                    <input
                                        type="text"
                                        value={settings.mail.sender_name || ''}
                                        onChange={(e) => updateSetting('mail', 'sender_name', e.target.value)}
                                        className="w-full p-2 border rounded-lg"
                                        placeholder="Solumati"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <label className="text-sm font-bold text-gray-700">Test Configuration</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="target@email.com"
                                            value={testMailTarget}
                                            onChange={e => setTestMailTarget(e.target.value)}
                                            className="p-2 border rounded-lg text-sm w-full md:w-48"
                                        />
                                        <button onClick={sendTestMail} disabled={!isMailConfigured()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                                            Send Test
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* REGISTRATION SETTINGS */}
                        <div className="bg-white rounded-xl shadow p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800 border-b pb-4">
                                <UserPlus className="text-green-500" />
                                {t('admin.settings.registration', 'Registration')}
                            </h2>
                            <div className="flex flex-col gap-4">
                                <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition">
                                    <input
                                        type="checkbox"
                                        checked={settings.registration.enabled}
                                        onChange={(e) => updateSetting('registration', 'enabled', e.target.checked)}
                                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <span className="font-medium text-gray-700">{t('admin.settings.reg_enabled')}</span>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-lg border transition ${!isMailConfigured() ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={settings.registration.require_verification}
                                        onChange={(e) => updateSetting('registration', 'require_verification', e.target.checked)}
                                        disabled={!isMailConfigured()}
                                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500 disabled:opacity-50"
                                    />
                                    <div>
                                        <span className="font-medium text-gray-700 block">{t('admin.settings.reg_verify')}</span>
                                        {!isMailConfigured() && <span className="text-xs text-red-500 font-bold">Requires configured Mail Server</span>}
                                    </div>
                                </label>

                                <div className="mt-2 grid md:grid-cols-2 gap-4">
                                    <div className="col-span-full">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.server_domain')}</label>
                                        <div className="flex gap-2">
                                            <span className="bg-gray-100 border p-2 rounded-l-lg text-gray-500 flex items-center"><Globe size={16} /></span>
                                            <input
                                                type="text"
                                                value={settings.registration.server_domain || ''}
                                                onChange={(e) => updateSetting('registration', 'server_domain', e.target.value)}
                                                className="w-full p-2 border-y border-r rounded-r-lg"
                                                placeholder="https://solumati.com"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Used for generating verification links.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.domains')} <span className="text-gray-400 font-normal">({t('admin.settings.domains_hint')})</span></label>
                                        <textarea
                                            value={settings.registration.allowed_domains || ''}
                                            onChange={(e) => updateSetting('registration', 'allowed_domains', e.target.value)}
                                            className="w-full p-2 border rounded-lg h-24 text-sm font-mono"
                                            placeholder="example.com, gmail.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.blocked_domains')} <span className="text-gray-400 font-normal">({t('admin.settings.domains_hint')})</span></label>
                                        <textarea
                                            value={settings.registration.blocked_domains || ''}
                                            onChange={(e) => updateSetting('registration', 'blocked_domains', e.target.value)}
                                            className="w-full p-2 border rounded-lg h-24 text-sm font-mono"
                                            placeholder="spam.com, trash-mail.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* OAUTH SETTINGS */}
                        <div className="bg-white rounded-xl shadow p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800 border-b pb-4">
                                <Github className="text-purple-500" />
                                {t('admin.settings.oauth_title', 'OAuth Providers')}
                            </h2>

                            <div className="grid md:grid-cols-3 gap-6">
                                {/* Github */}
                                <div className="border rounded-xl p-4 bg-gray-50">
                                    <h3 className="font-bold mb-4 flex items-center gap-2"><Github size={18} /> GitHub</h3>
                                    <div className="space-y-3">

                                        <label className="flex items-center gap-2 text-sm font-medium">
                                            <input
                                                type="checkbox"
                                                checked={settings.oauth.github.enabled}
                                                onChange={e => updateSetting('oauth', 'github', { ...settings.oauth.github, enabled: e.target.checked })}
                                                className="rounded text-purple-600"
                                            />
                                            {t('admin.settings.enable', 'Enable')}
                                        </label>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('admin.settings.client_id', 'Client ID')}</label>
                                            <input
                                                type="text"
                                                value={settings.oauth.github.client_id}
                                                onChange={e => updateSetting('oauth', 'github', { ...settings.oauth.github, client_id: e.target.value })}
                                                className={`w-full p-2 text-sm border rounded ${validateOAuth('github', settings.oauth.github.client_id) ? '' : 'border-red-500 bg-red-50'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('admin.settings.client_secret', 'Client Secret')}</label>
                                            <input
                                                type="password"
                                                value={settings.oauth.github.client_secret}
                                                onChange={e => updateSetting('oauth', 'github', { ...settings.oauth.github, client_secret: e.target.value })}
                                                className="w-full p-2 text-sm border rounded"
                                                placeholder="******"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Google */}
                                <div className="border rounded-xl p-4 bg-gray-50">
                                    <h3 className="font-bold mb-4 flex items-center gap-2"><Globe size={18} /> Google</h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-medium">
                                            <input
                                                type="checkbox"
                                                checked={settings.oauth.google.enabled}
                                                onChange={e => updateSetting('oauth', 'google', { ...settings.oauth.google, enabled: e.target.checked })}
                                                className="rounded text-blue-600"
                                            />
                                            {t('admin.settings.enable', 'Enable')}
                                        </label>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('admin.settings.client_id', 'Client ID')}</label>
                                            <input
                                                type="text"
                                                value={settings.oauth.google.client_id}
                                                onChange={e => updateSetting('oauth', 'google', { ...settings.oauth.google, client_id: e.target.value })}
                                                className={`w-full p-2 text-sm border rounded ${validateOAuth('google', settings.oauth.google.client_id) ? '' : 'border-red-500 bg-red-50'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('admin.settings.client_secret', 'Client Secret')}</label>
                                            <input
                                                type="password"
                                                value={settings.oauth.google.client_secret}
                                                onChange={e => updateSetting('oauth', 'google', { ...settings.oauth.google, client_secret: e.target.value })}
                                                className="w-full p-2 text-sm border rounded"
                                                placeholder="******"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Microsoft */}
                                <div className="border rounded-xl p-4 bg-gray-50">
                                    <h3 className="font-bold mb-4 flex items-center gap-2"><Server size={18} /> Microsoft</h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-medium">
                                            <input
                                                type="checkbox"
                                                checked={settings.oauth.microsoft.enabled}
                                                onChange={e => updateSetting('oauth', 'microsoft', { ...settings.oauth.microsoft, enabled: e.target.checked })}
                                                className="rounded text-blue-800"
                                            />
                                            {t('admin.settings.enable', 'Enable')}
                                        </label>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('admin.settings.client_id', 'Client ID')}</label>
                                            <input
                                                type="text"
                                                value={settings.oauth.microsoft.client_id}
                                                onChange={e => updateSetting('oauth', 'microsoft', { ...settings.oauth.microsoft, client_id: e.target.value })}
                                                className={`w-full p-2 text-sm border rounded ${validateOAuth('microsoft', settings.oauth.microsoft.client_id) ? '' : 'border-red-500 bg-red-50'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('admin.settings.client_secret', 'Client Secret')}</label>
                                            <input
                                                type="password"
                                                value={settings.oauth.microsoft.client_secret}
                                                onChange={e => updateSetting('oauth', 'microsoft', { ...settings.oauth.microsoft, client_secret: e.target.value })}
                                                className="w-full p-2 text-sm border rounded"
                                                placeholder="******"
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* SUPPORT CHAT SETTINGS */}
                        <div className="bg-white rounded-xl shadow p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800 border-b pb-4">
                                <LifeBuoy className="text-blue-500" />
                                {t('admin.settings.support_title', 'Support Chat')}
                            </h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.support_permissions', 'Chat Permissions')}</label>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition">
                                            <input
                                                type="checkbox"
                                                checked={settings.support_chat?.enabled || false}
                                                onChange={(e) => updateSetting('support_chat', 'enabled', e.target.checked)}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <span className="font-medium text-gray-700">{t('admin.settings.support_writable', 'Allow users to write messages')}</span>
                                        </label>
                                        <p className="text-xs text-gray-400 mt-1">{t('admin.settings.support_readonly_hint', 'If disabled, the chat will be read-only for users.')}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {isMailConfigured() && (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('admin.settings.support_email', 'Forwarding Email')}</label>
                                            <input
                                                type="email"
                                                value={settings.support_chat?.email_target || ''}
                                                onChange={(e) => updateSetting('support_chat', 'email_target', e.target.value)}
                                                className="w-full p-2 border rounded-lg"
                                                placeholder="support@solumati.com"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">{t('admin.settings.support_email_hint', 'Messages sent to Support will be forwarded here.')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="sticky bottom-6 flex justify-end">
                            <button
                                onClick={saveSettings}
                                disabled={!unsavedChanges}
                                className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold shadow-xl transition-all ${unsavedChanges ? 'bg-black text-white hover:scale-105' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                            >
                                <Save size={20} /> {t('btn.save')} {unsavedChanges && '*'}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* 4. DIAGNOSTICS TAB */}
            {
                activeTab === 'diagnostics' && canViewDiagnostics && diagnostics && (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="text-gray-500 text-sm font-bold uppercase mb-2">System Status</div>
                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    Operational
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="text-gray-500 text-sm font-bold uppercase mb-2">Version</div>
                                <div className="font-mono text-xl">{diagnostics.current_version}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="text-gray-500 text-sm font-bold uppercase mb-2">Disk Usage</div>
                                <div className="font-mono text-xl">{diagnostics.disk_percent}%</div>
                                <div className="text-xs text-gray-400 mt-1">{diagnostics.disk_free_gb} GB free</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="text-gray-500 text-sm font-bold uppercase mb-2">Database</div>
                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                    <Database size={16} /> Connected
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Changelog */}
                            <div className="bg-white rounded-xl shadow p-6 max-h-[500px] overflow-y-auto">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-blue-500" /> Changelog</h3>
                                <div className="space-y-6">
                                    {changelog.map((rel, i) => (
                                        <div key={i} className="border-b pb-4 last:border-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-800">{rel.name}</h4>
                                                <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{rel.tag_name}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                                {rel.body}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Updates */}
                            <div className="bg-white rounded-xl shadow p-6">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Zap className="text-yellow-500" /> Updates</h3>

                                {diagnostics.update_available || diagnostics.beta_update_available ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <div className="font-bold text-blue-800 mb-2">New Version Available!</div>
                                        <div className="text-sm text-blue-600 mb-4">
                                            A new version of Solumati is available.
                                            {diagnostics.beta_update_available && <span className="block mt-1 font-bold">New Beta also available!</span>}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <a href="https://github.com/FaserF/Solumati/releases" target="_blank" rel="noreferrer" className="bg-blue-600 text-white text-center px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                                                Download {diagnostics.latest_version}
                                            </a>
                                            {diagnostics.beta_update_available && (
                                                <a href="https://github.com/FaserF/Solumati/releases" target="_blank" rel="noreferrer" className="bg-white border border-blue-300 text-blue-600 text-center px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition">
                                                    Check Beta ({diagnostics.latest_beta_version})
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <CheckCircle className="mx-auto w-12 h-12 text-green-500 mb-2" />
                                        <p>You are using the latest version.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modals */}
            {punishModal.show && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                            <Ban /> Punish User
                        </h3>
                        <div className="space-y-3 mb-6">
                            <label className="block">
                                <span className="text-sm font-bold text-gray-700">Type</span>
                                <select
                                    className="w-full p-2 border rounded mt-1"
                                    value={punishReason}
                                    onChange={e => setPunishReason(e.target.value)}
                                >
                                    <option value="AdminDeactivation">Permanent Deactivation</option>
                                    <option value="TempBan">Temporary Ban</option>
                                </select>
                            </label>

                            {punishReason === 'TempBan' && (
                                <label className="block">
                                    <span className="text-sm font-bold text-gray-700">Duration (Hours)</span>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded mt-1"
                                        value={banHours}
                                        onChange={e => setBanHours(e.target.value)}
                                    />
                                </label>
                            )}

                            <label className="block">
                                <span className="text-sm font-bold text-gray-700">Reason (Show to user)</span>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded mt-1"
                                    placeholder="Violating Terms..."
                                    value={customReason}
                                    onChange={e => setCustomReason(e.target.value)}
                                />
                            </label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setPunishModal({ show: false, userId: null })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button
                                onClick={() => {
                                    handleAction(punishModal.userId, 'deactivate');
                                    setPunishModal({ show: false, userId: null });
                                }}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
                            >
                                Execute
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {createUserModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">Create New User</h3>
                        <div className="space-y-3 mb-4">
                            <input
                                className="w-full p-2 border rounded"
                                placeholder="Username"
                                value={createUserForm.username}
                                onChange={e => setCreateUserForm({ ...createUserForm, username: e.target.value })}
                            />
                            <input
                                className="w-full p-2 border rounded"
                                placeholder="Email"
                                value={createUserForm.email}
                                onChange={e => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                            />
                            <input
                                className="w-full p-2 border rounded"
                                placeholder="Password"
                                type="password"
                                value={createUserForm.password}
                                onChange={e => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                            />
                            <select
                                className="w-full p-2 border rounded"
                                value={createUserForm.role}
                                onChange={e => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                            >
                                <option value="user">User</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                                <option value="test">{t('role.test', 'Test')}</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setCreateUserModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={handleCreateUser} className="px-4 py-2 bg-black text-white font-bold rounded-lg">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {editModal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">Edit User</h3>
                        <div className="space-y-3 mb-4">
                            <label className="block text-sm font-bold">Username</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={editForm.username}
                                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                            />
                            <label className="block text-sm font-bold">Email</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={editForm.email}
                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            />
                            <input
                                className="w-full p-2 border rounded"
                                type="password"
                                value={editForm.password}
                                onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                            />

                            <label className="block text-sm font-bold">Role</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={editForm.role}
                                onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                disabled={[0, 1, 3].includes(editModal.user.id)}
                            >
                                <option value="user">User</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                                <option value="guest">Guest</option>
                                <option value="test">{t('role.test', 'Test')}</option>
                            </select>
                            {[0, 1, 3].includes(editModal.user.id) && <p className="text-xs text-red-500">System roles cannot be changed.</p>}
                            <label className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    checked={editForm.is_visible_in_matches}
                                    onChange={e => setEditForm({ ...editForm, is_visible_in_matches: e.target.checked })}
                                    disabled={[0, 1, 3].includes(editModal.user.id)}
                                />
                                Is Visible in Matches
                            </label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditModal({ show: false, user: null })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={saveUserEdit} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Roles Info Modal */}
            {rolesModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Info size={20} className="text-blue-600" /> System Roles
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">These are the defined roles in the system and their capabilities.</p>

                        <div className="space-y-4">
                            {systemRoles.length === 0 ? <p>No roles loaded.</p> : systemRoles.map((role, idx) => (
                                <div key={idx} className="border p-4 rounded-xl bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold text-lg text-gray-800 capitalize flex items-center gap-2">
                                            {role.name === 'admin' && <Shield size={18} className="text-red-500" />}
                                            {role.name === 'moderator' && <Shield size={18} className="text-blue-500" />}
                                            {role.name === 'guest' && <UserX size={18} className="text-gray-500" />}
                                            {role.name}
                                        </h4>
                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Rank: {role.rank || idx}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2 font-medium">{role.description}</div>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions && role.permissions.map(p => (
                                            <span key={p} className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end mt-6">
                            <button onClick={() => setRolesModalOpen(false)} className="px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-black">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;