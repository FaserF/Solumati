import { useState, useEffect, useRef } from 'react';
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

    useEffect(() => {
        // Fetch History
        fetchHistory();

        // Connect WS
        connectWebSocket();

        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [chatPartner.id]);

    const fetchHistory = async () => {
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
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };

    const connectWebSocket = () => {
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
                // Check if this message belongs to current conversation
                if (msg.sender_id === chatPartner.id || msg.receiver_id === chatPartner.id) {
                    setMessages(prev => {
                        // Avoid duplicates if we echoed
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    scrollToBottom();
                }
            } catch (e) {
                console.error("WS Parse Error", e);
            }
        };

        socket.onclose = () => {
            console.log("WS Disconnected");
            setStatus("disconnected");
            // Reconnect logic
            reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
        };

        ws.current = socket;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

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
