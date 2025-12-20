import { useState, useEffect, useRef } from 'react';
import { Wifi, Activity, Users } from 'lucide-react';
import { API_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

const DemoBanner = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState(null); // 'local', 'persistent', or null
    const [isConnected, setIsConnected] = useState(false);
    const [memberCount, setMemberCount] = useState(10000);
    const [lastEvent, setLastEvent] = useState(null);
    const ws = useRef(null);

    const WS_URL = API_URL.replace("http", "ws");

    // Check status on mount and periodically
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/demo/status`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.is_running && data.active_mode) {
                        setStatus(data.active_mode);
                    } else {
                        setStatus(null);
                        setLastEvent(null);
                    }
                }
            } catch { }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    // Connect WS if status is active
    useEffect(() => {
        if (!status || !user) {
            if (ws.current) ws.current.close();
            return;
        }

        const connect = () => {
            // Prevent multiple connections
            if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

            // Using user token (ID)
            const token = user.user_id || localStorage.getItem('token');
            ws.current = new WebSocket(`${WS_URL}/ws/chat?token=${token}`);

            ws.current.onopen = () => setIsConnected(true);
            ws.current.onclose = () => setIsConnected(false);

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle Demo Events
                    if (data.type === 'demo_message') {
                        setLastEvent({
                            type: 'msg',
                            text: `${data.username}: ${data.content}`,
                            time: new Date()
                        });
                        if (data.fake_member_count) setMemberCount(data.fake_member_count);
                    } else if (data.type === 'demo_notification') {
                        setLastEvent({
                            type: 'notif',
                            text: `${data.title} ${data.message}`,
                            time: new Date()
                        });
                    } else if (data.type === 'system_event' || data.type === 'admin_spy') {
                        // For Persistent Mode
                        setLastEvent({
                            type: 'sys',
                            text: data.event === 'message_sent' ? data.info : `System: ${data.event}`,
                            time: new Date()
                        });
                    }
                } catch { }
            };
        };

        connect();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [status, user, WS_URL]);

    if (!status) return null;

    return (
        <div className="bg-indigo-600 text-white px-4 py-2 shadow-md flex items-center justify-between text-xs md:text-sm animate-in slide-in-from-top">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 font-bold px-2 py-1 bg-white/20 rounded-lg">
                    <Activity size={14} className="animate-pulse" />
                    <span>DEMO MODE: {status.toUpperCase()}</span>
                </div>

                <div className="flex items-center gap-2">
                    <Users size={14} />
                    <span>{memberCount.toLocaleString()} Live Members</span>
                </div>
            </div>

            <div className="flex items-center gap-4 flex-1 justify-end overflow-hidden">
                {lastEvent && (
                    <div className="flex items-center gap-2 opacity-90 truncate animate-in fade-in slide-in-from-right duration-300">
                        <span className="font-bold opacity-70">
                            [{lastEvent.time.toLocaleTimeString()}]
                        </span>
                        <span className="truncate max-w-[300px] md:max-w-md">
                            {lastEvent.text}
                        </span>
                    </div>
                )}
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} shadow-lg`}></div>
            </div>
        </div>
    );
};

export default DemoBanner;
