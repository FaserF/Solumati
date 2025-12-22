import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, WifiOff } from 'lucide-react';
import { API_URL } from '../../config';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

const ChatWindow = ({ currentUser, chatPartner, token, onClose, supportChatEnabled = false, t }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [status, setStatus] = useState("disconnected");
    const [errorMessage, setErrorMessage] = useState(null);
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
            // Silently handle network errors
        }
    }, [chatPartner.id, token]);

    useEffect(() => {
        const t = setTimeout(() => fetchHistory(), 0);

        const connectWebSocket = () => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

            const socket = new WebSocket(`${WS_URL}/ws/chat?token=${token}`);

            socket.onopen = () => {
                setStatus("connected");
            };

            socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.error) {
                        setErrorMessage(msg.error);
                        setStatus("error");
                        return;
                    }

                    if (msg.sender_id === chatPartner.id || msg.receiver_id === chatPartner.id) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, msg];
                        });
                        scrollToBottom();
                    }
                } catch {
                    // Silently handle malformed messages
                }
            };

            socket.onclose = () => {
                setStatus("disconnected");
                if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = setTimeout(() => {
                    connectWebSocket();
                }, 3000);
            };

            ws.current = socket;
        };

        connectWebSocket();

        return () => {
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            clearTimeout(t);
        };
    }, [fetchHistory, WS_URL, chatPartner.id, token]);


    const sendMessage = (msgContent = null) => {
        const text = msgContent || input;
        if (!text.trim() || status !== "connected") return;

        const payload = {
            receiver_id: chatPartner.id,
            content: text.trim()
        };

        ws.current.send(JSON.stringify(payload));
        if (!msgContent) setInput("");
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    const isSupportChat = chatPartner.id === 3;
    const canWrite = !isSupportChat || (currentUser?.role === 'admin') || supportChatEnabled;

    const ICEBREAKERS_USER = [
        t ? t('chat.icebreaker.1', "Hi! How is your day?") : "Hi! How is your day?",
        t ? t('chat.icebreaker.2', "Software development is cool, right?") : "Software development is cool, right?",
        t ? t('chat.icebreaker.3', "Do you like coffee?") : "Do you like coffee?",
        t ? t('chat.icebreaker.4', "What are your hobbies?") : "What are your hobbies?"
    ];

    const ICEBREAKERS_SUPPORT = [
        t ? t('chat.support.1', "I found a bug 🐛") : "I found a bug 🐛",
        t ? t('chat.support.2', "I have a feature request 💡") : "I have a feature request 💡",
        t ? t('chat.support.3', "Account help needed 🆘") : "Account help needed 🆘",
        t ? t('chat.support.4', "General feedback 📣") : "General feedback 📣"
    ];

    const ICEBREAKERS = isSupportChat ? ICEBREAKERS_SUPPORT : ICEBREAKERS_USER;

    return (
        <Card variant="solid" className="flex flex-col h-[500px] w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            {chatPartner.image_url ?
                                <img src={`${API_URL}${chatPartner.image_url}`} alt={chatPartner.username} className="w-full h-full object-cover" /> :
                                <div className="w-full h-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">{chatPartner.username[0]}</div>
                            }
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white leading-none">{chatPartner.username}</h4>
                        <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide flex items-center gap-1">
                            {status === 'connected' ? 'Online' : 'Offline'}
                            {status !== 'connected' && <WifiOff size={10} />}
                        </span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                    <X size={18} />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-black/20">
                {messages.length === 0 && canWrite && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-4">
                        <p className="text-sm italic">{t ? t('chat.start_convo', 'Start the conversation!') : 'Start the conversation!'}</p>
                        <div className="flex flex-wrap justify-center gap-2 max-w-[250px]">
                            {ICEBREAKERS.map((cur, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(cur)}
                                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 rounded-full text-xs hover:scale-105 transition shadow-sm border border-indigo-100 dark:border-indigo-900/30"
                                >
                                    {cur}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUser.id; // Warning: Checking ID types (int vs str) might be needed
                    return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm relative group ${isMe
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-none border border-zinc-100 dark:border-zinc-700'
                                    }`}
                            >
                                {msg.content}
                                <div className={`text-[9px] opacity-70 mt-1 flex justify-end gap-1 ${isMe ? 'text-indigo-100' : 'text-zinc-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                {status === 'error' ? (
                    <div className="w-full text-center text-xs text-red-500 font-medium py-3 bg-red-50 dark:bg-red-900/10 rounded-xl flex items-center justify-center gap-2">
                        <WifiOff size={14} />
                        {errorMessage || "Connection Error"}
                    </div>
                ) : canWrite ? (
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={status === 'connected' ? (t ? t('chat.placeholder', "Type a message...") : "Type a message...") : "Connecting..."}
                            disabled={status !== "connected"}
                            className="flex-1 rounded-full border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950"
                        />
                        <Button
                            onClick={() => sendMessage()}
                            disabled={status !== "connected" || !input.trim()}
                            size="icon"
                            variant="primary"
                            className="rounded-full w-11 h-11 shrink-0 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Send size={18} className="translate-x-0.5 translate-y-0.5" />
                        </Button>
                    </div>
                ) : (
                    <div className="w-full text-center text-xs text-zinc-400 italic py-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl">
                        {t ? t('chat.readonly', 'This is a read-only support channel.') : 'This is a read-only support channel.'}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ChatWindow;
