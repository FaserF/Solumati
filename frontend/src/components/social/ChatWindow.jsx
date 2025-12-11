import { useState, useEffect, useRef, useCallback } from 'react';
import './ChatWindow.css';

import { API_URL } from '../../config';

const ChatWindow = ({ currentUser, chatPartner, token, onClose, supportChatEnabled = false, t }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [status, setStatus] = useState("disconnected"); // connected, disconnected
    const ws = useRef(null);
    const messagesEndRef = useRef(null);
    const reconnectTimeout = useRef(null);

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
    }, [chatPartner.id, token]);

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
            } catch { /* ignore */ }
        };

        socket.onclose = () => {
            console.log("WS Disconnected");
            setStatus("disconnected");
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = setTimeout(() => {
                console.log("Attempting Reconnect...");
                connectWebSocket();
            }, 3000);
        };

        ws.current = socket;
    }, [WS_URL, chatPartner.id, token]);

    useEffect(() => {
        const t = setTimeout(() => fetchHistory(), 0);
        connectWebSocket();

        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            clearTimeout(t);
        };
    }, [fetchHistory, connectWebSocket]);


    const sendMessage = (msgContent = null) => {
        const text = msgContent || input;
        if (!text.trim() || status !== "connected") return;

        const payload = {
            receiver_id: chatPartner.id,
            content: text.trim()
        };

        ws.current.send(JSON.stringify(payload));
        // We will receive echo from server to update UI, or optimistically update.
        // Server echo is safer for ID sync.
        if (!msgContent) setInput("");
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    const isSupportChat = chatPartner.id === 3;
    const canWrite = !isSupportChat || (currentUser?.role === 'admin') || supportChatEnabled;

    const ICEBREAKERS = [
        t ? t('chat.icebreaker.1', "Hi! How is your day?") : "Hi! How is your day?",
        t ? t('chat.icebreaker.2', "Software development is cool, right?") : "Software development is cool, right?",
        t ? t('chat.icebreaker.3', "Do you like coffee?") : "Do you like coffee?",
        t ? t('chat.icebreaker.4', "What are your hobbies?") : "What are your hobbies?"
    ];

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
                {messages.length === 0 && canWrite && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2 p-4">
                        <p className="text-sm italic mb-2">{t ? t('chat.start_convo', 'Start the conversation!') : 'Start the conversation!'}</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {ICEBREAKERS.map((cur, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(cur)}
                                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs hover:bg-blue-100 transition border border-blue-200"
                                >
                                    {cur}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
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
                            placeholder={status === 'connected' ? (t ? t('chat.placeholder', "Type a message...") : "Type a message...") : "Connecting..."}
                            disabled={status !== "connected"}
                        />
                        <button onClick={() => sendMessage()} disabled={status !== "connected"}>{t ? t('btn.send', 'Send') : 'Send'}</button>
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
