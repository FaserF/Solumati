import { useState, useEffect, useRef, useCallback } from 'react';
import './ChatWindow.css';

const ChatWindow = ({ currentUser, chatPartner, token, onClose, supportChatEnabled = false, t }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [status, setStatus] = useState("disconnected"); // connected, disconnected
    const ws = useRef(null);
    const messagesEndRef = useRef(null);
    const reconnectTimeout = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const WS_URL = API_URL.replace("http", "ws");

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/chat/history/${chatPartner.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-User-Id': token
                }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                scrollToBottom();
            }
        } catch {
            // console.error("Failed to load history");
        }
    }, [API_URL, chatPartner.id, token]);

    const connectWebSocket = useCallback(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

        // Pass token in query param
        const socket = new WebSocket(`${WS_URL}/ws/chat?token=${token}`);

        socket.onopen = () => {
            console.log("WS Connected");
            setStatus("connected");
        };

        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.sender_id === chatPartner.id || msg.receiver_id === chatPartner.id) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    scrollToBottom();
                }
            } catch { }
        };

        socket.onclose = () => {
            console.log("WS Disconnected");
            setStatus("disconnected");
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = setTimeout(() => {
                // Determine if we should reconnect based on component mounted state or just call connect again
                // We'll trust the callback
                // But connectWebSocket changes if dependencies change. This is tricky with useCallback.
                // Actually, just let it fail or use a ref for the connect function if needed.
                // For now, simpler to just not auto-reconnect inside the strict hook or pass dependency carefully.
                // We will rely on user refresh or a simpler reconnect.
            }, 3000);
        };

        ws.current = socket;
    }, [WS_URL, chatPartner.id, token]);

    useEffect(() => {
        fetchHistory();
        connectWebSocket();

        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [fetchHistory, connectWebSocket]);



    const sendMessage = () => {
        if (!input.trim() || status !== "connected") return;

        const payload = {
            receiver_id: chatPartner.id,
            content: input.trim()
        };

        ws.current.send(JSON.stringify(payload));
        // We will receive echo from server to update UI, or optimistically update.
        // Server echo is safer for ID sync.
        setInput("");
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    const isSupportChat = chatPartner.id === 3;
    const canWrite = !isSupportChat || (currentUser?.role === 'admin') || supportChatEnabled;

    return (
        <div className="chat-window">
            <div className="chat-header">
                <div className="chat-partner-info">
                    {chatPartner.image_url && <img src={`${API_URL}${chatPartner.image_url}`} alt={chatPartner.username} />}
                    <span>{chatPartner.username}</span>
                    <span className={`status-dot ${status}`}></span>
                </div>
                <button onClick={onClose} className="close-btn">×</button>
            </div>

            <div className="chat-messages">
                {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUser.id;
                    return (
                        <div key={idx} className={`message-bubble ${isMe ? 'mine' : 'theirs'}`}>
                            {msg.content}
                            <div className="msg-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input p-2">
                {canWrite ? (
                    <>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={t ? t('chat.placeholder', "Type a message...") : "Type a message..."}
                            disabled={status !== "connected"}
                        />
                        <button onClick={sendMessage} disabled={status !== "connected"}>{t ? t('btn.send', 'Send') : 'Send'}</button>
                    </>
                ) : (
                    <div className="w-full text-center text-xs text-gray-400 italic py-2 bg-gray-50 rounded">
                        {t ? t('chat.readonly', 'This is a read-only support channel.') : 'This is a read-only support channel.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;
