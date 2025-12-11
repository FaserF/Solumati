import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    const [theme, setThemeState] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'system');

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
        setUser(data);
        localStorage.setItem('token', data.user_id);
        setIsGuest(data.role === 'guest' || data.is_guest);
        setTempAuth(null);

        // Apply Theme
        if (data.app_settings) {
            try {
                const s = typeof data.app_settings === 'string' ? JSON.parse(data.app_settings) : data.app_settings;
                applyTheme(s.theme);
            } catch (e) { console.error("Theme apply error", e); }
        }
    }, [applyTheme]);

    // Initial Session Restore
    useEffect(() => {
        // Theme init is handled by initial state or separate effect if needed, but here we just leave it for now or move logic.
        // Actually, let's just properly initialize state.
        const storedToken = localStorage.getItem('token');
        if (storedToken && !user) {
            console.log("[Auth] Attempting to restore session for:", storedToken);
            fetch(`${API_URL}/users/${storedToken}`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`,
                    'X-User-Id': storedToken
                }
            })
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Session invalid");
                })
                .then(userData => {
                    console.log("[Auth] Session restored:", userData);
                    finalizeLogin(userData);
                })
                .catch(e => {
                    console.warn("[Auth] Session restore failed:", e);
                    localStorage.removeItem('token');
                });
        }
    }, [finalizeLogin, user]);

    const updateUser = (updates) => {
        setUser(prev => ({ ...prev, ...updates }));
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
            return { status: 'error', error: { detail: "Network error" } };
        }
    };

    const logout = () => {
        setUser(null);
        setIsGuest(false);
        localStorage.removeItem('token');
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
            applyTheme
        }}>
            {children}
        </AuthContext.Provider>
    );
};
