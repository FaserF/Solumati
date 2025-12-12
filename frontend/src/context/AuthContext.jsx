import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import { useI18n } from './I18nContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const { changeLanguage } = useI18n();

    // Initialize user from LocalStorage (Cache)
    const [user, setUser] = useState(() => {
        try {
            const cached = localStorage.getItem('user_cache');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });

    const [isGuest, setIsGuest] = useState(false);
    const [theme, setThemeState] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'system');

    // Server Status State
    const [serverStatus, setServerStatus] = useState('online'); // online, offline, maintenance

    // 2FA Intermediate State
    const [tempAuth, setTempAuth] = useState(null);

    // Apply Theme Helper
    const applyTheme = useCallback((themeName) => {
        setThemeState(themeName);
        const root = window.document.documentElement;
        if (themeName === 'dark' || (themeName === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, []);

    const finalizeLogin = useCallback((data) => {
        // Normalize: backend returns 'id', frontend uses 'user_id'
        const normalizedData = { ...data, user_id: data.user_id || data.id };

        setUser(normalizedData);
        localStorage.setItem('token', normalizedData.user_id);
        localStorage.setItem('user_cache', JSON.stringify(normalizedData)); // Update Cache
        setIsGuest(normalizedData.role === 'guest' || normalizedData.is_guest);
        setTempAuth(null);
        setServerStatus('online');

        // Apply Theme & Language
        if (normalizedData.app_settings) {
            try {
                const s = typeof normalizedData.app_settings === 'string' ? JSON.parse(normalizedData.app_settings) : normalizedData.app_settings;
                if (s.theme) applyTheme(s.theme);
                if (s.language) changeLanguage(s.language);
            } catch (e) { console.error("Settings apply error", e); }
        }
    }, [applyTheme, changeLanguage]);

    // Initial Session Restore & Background Sync
    useEffect(() => {
        let storedToken = localStorage.getItem('token');
        if (storedToken === 'undefined' || storedToken === 'null') storedToken = null;

        if (storedToken) {
            console.log("[Auth] Syncing session from server...");
            fetch(`${API_URL}/users/${storedToken}`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`,
                    'X-User-Id': storedToken
                }
            })
                .then(res => {
                    if (res.ok) return res.json();
                    if (res.status === 503) {
                        setServerStatus('maintenance');
                        throw new Error("Maintenance Mode");
                    }
                    if (res.status >= 500) {
                        setServerStatus('offline'); // Server Error
                        throw new Error("Server Error");
                    }
                    throw new Error("Session invalid");
                })
                .then(userData => {
                    console.log("[Auth] Session synced:", userData);
                    finalizeLogin(userData); // Updates cache
                })
                .catch(e => {
                    console.warn("[Auth] Sync failed:", e);
                    if (e.message === "Session invalid") {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user_cache');
                        setUser(null);
                    } else if (e.message === "Failed to fetch" || e.name === 'TypeError') {
                        // Network Error (Server likely down or unreachable)
                        setServerStatus('offline');
                    }
                });
        }
    }, [finalizeLogin]); // Removed 'user' dependency to prevent loop, sync runs once on mount due to storedToken check logic needs refinement?
    // Actually, storedToken is constant on mount.

    const updateUser = (updates) => {
        setUser(prev => {
            const newState = { ...prev, ...updates };
            localStorage.setItem('user_cache', JSON.stringify(newState));
            return newState;
        });
    };

    const login = async (loginIdentifier, password) => {
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginIdentifier, password })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.require_2fa) {
                    setTempAuth({ ...data, username: loginIdentifier });
                    return { status: '2fa', data };
                }
                finalizeLogin(data);
                return { status: 'success', data };
            } else {
                const err = await res.json();
                return { status: 'error', error: err };
            }
        } catch {
            setServerStatus('offline');
            return { status: 'error', error: { detail: "Network error" } };
        }
    };

    const logout = () => {
        setUser(null);
        setIsGuest(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user_cache');
    };

    const guestLogin = async () => {
        try {
            const res = await fetch(`${API_URL}/matches/0`);
            if (res.ok) {
                // We actually don't receive user object here from matches endpoint usually?
                // Wait, App.jsx logic:
                // const data = await res.json(); // matches
                // setUser({ user_id: 0, username: "Guest", role: 'guest' });
                // We need to simulate user object
                const guestUser = { user_id: 0, username: "Guest", role: 'guest' };
                setUser(guestUser);
                setIsGuest(true);
                localStorage.setItem('token', '0');
                return { status: 'success', data: guestUser };
            } else {
                const err = await res.json();
                return { status: 'error', error: err, statusCode: res.status };
            }
        } catch (e) {
            return { status: 'error', error: e };
        }
    };

    const register = async (payload) => {
        try {
            const res = await fetch(`${API_URL}/users/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                if (data.is_verified) {
                    finalizeLogin({ ...data, user_id: data.id });
                    return { status: 'success', data };
                } else {
                    return { status: 'pending_verification', data };
                }
            } else {
                const err = await res.json();
                return { status: 'error', error: err };
            }
        } catch (e) {
            return { status: 'error', error: e };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isGuest,
            theme,
            tempAuth,
            login,
            logout,
            register,
            guestLogin,
            finalizeLogin, // exposed for Oauth/Passkey calls
            updateUser,
            applyTheme,
            serverStatus
        }}>
            {children}
        </AuthContext.Provider>
    );
};
