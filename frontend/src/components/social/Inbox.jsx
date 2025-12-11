import { useState, useEffect } from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { API_URL } from '../../config';

const Inbox = ({ user, onSelectChat, t }) => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/chat/conversations`, {
                headers: { 'Authorization': `Bearer ${token}`, 'X-User-Id': token }
            });
            if (res.ok) {
                setConversations(await res.json());
            }
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center">Loading Inbox...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="text-pink-500" />
                Inbox
            </h2>

            {conversations.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
                    <p className="text-gray-500">No conversations yet. Start swiping!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {conversations.map(conv => (
                        <div
                            key={conv.partner_id}
                            onClick={() => onSelectChat({
                                id: conv.partner_id,
                                username: conv.partner_username,
                                image_url: conv.partner_image_url
                            })}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center gap-4 hover:scale-[1.02] transition cursor-pointer"
                        >
                            <div className="relative">
                                <img
                                    src={conv.partner_image_url ? `${API_URL}${conv.partner_image_url}` : `${API_URL}/static/default_avatar.png`}
                                    alt={conv.partner_username}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-pink-500"
                                />
                                {conv.unread_count > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ring-2 ring-white">
                                        {conv.unread_count}
                                    </span>
                                )}
                            </div>

                            <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg dark:text-gray-100">{conv.partner_username}</h3>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock size={12} />
                                        {new Date(conv.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-1">
                                    {conv.last_message || "Active conversation"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Inbox;
