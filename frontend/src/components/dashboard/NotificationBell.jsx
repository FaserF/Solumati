import { useState, useEffect, useCallback } from 'react';
import { Bell, Trash2, Smartphone } from 'lucide-react';
import { API_URL } from '../../config';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const NotificationBell = ({ user }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    // const [permission, setPermission] = useState(Notification.permission); // Unused in render
    const [isSubscribed, setIsSubscribed] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}`, 'X-User-Id': token }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch (e) { console.error("Notif fetch failed", e); }
    }, []);

    // --- PUSH LOGIC ---
    const checkSubscription = async () => {
        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
    };

    useEffect(() => {
        if (!user) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        checkSubscription();

        return () => clearInterval(interval);
    }, [user, fetchNotifications]);

    const markRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'X-User-Id': token }
            });
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {
            // Optimistic update, ignore error
        }
    };

    const clearAll = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/notifications/clear`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'X-User-Id': token }
            });
            setNotifications([]);
            setUnreadCount(0);
        } catch {
            // Error clearing
        }
    };



    const subscribeToPush = async () => {
        if (!('serviceWorker' in navigator)) return;

        try {
            // 1. Get Key
            const token = localStorage.getItem('token');
            const keyRes = await fetch(`${API_URL}/notifications/vapid-public-key`, {
                headers: { 'Authorization': `Bearer ${token}`, 'X-User-Id': token }
            });
            const keyData = await keyRes.json();

            if (!keyData.publicKey) {
                alert("Push Notifications are not configured on the server yet.");
                return;
            }

            // 2. Request Permission
            const perm = await Notification.requestPermission();
            // setPermission(perm); // Removed unused state
            if (perm !== 'granted') return;

            // 3. Subscribe via SW
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
            });

            // 4. Send to Backend
            await fetch(`${API_URL}/notifications/subscribe`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, 'X-User-Id': token
                },
                body: JSON.stringify(sub)
            });

            setIsSubscribed(true);
            alert("Subscribed to Push Notifications!");

        } catch (e) {
            console.error("Push subscribe failed", e);
            alert("Failed to subscribe: " + e.message);
        }
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-200"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-3 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950">
                        <span className="font-bold text-sm">Notifications</span>
                        <div className="flex gap-2">
                            {!isSubscribed && (
                                <button onClick={subscribeToPush} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200" title="Enable Push">
                                    <Smartphone size={14} /> Enable Push
                                </button>
                            )}
                            <button onClick={clearAll} className="text-gray-400 hover:text-red-500" title="Clear All">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No new notifications</div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`p-3 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition relative group ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                >
                                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 pr-6">{n.title}</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{n.message}</p>
                                    <span className="text-[10px] text-gray-400 mt-2 block">{new Date(n.created_at).toLocaleString()}</span>

                                    {!n.is_read && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                                            className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
