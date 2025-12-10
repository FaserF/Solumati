import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { API_URL } from '../../config';

const ReportModal = ({ user, onClose, t }) => {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) return alert("Please provide a reason.");
        if (!window.confirm(`Report ${user.username}? This cannot be undone.`)) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/users/${user.id || user.user_id}/report`, { // Handle user object inconsistencies
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });

            if (res.ok) {
                alert("Report submitted. An admin will review it shortly.");
                onClose();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail || 'Failed to submit report'}`);
            }
        } catch (e) {
            console.error(e);
            alert("Network error.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                        <AlertTriangle size={24} /> {t ? t('btn.report_user', 'Report User') : 'Report User'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {t ? t('report.modal_title', 'Reporting {name}').replace('{name}', user.username || 'User') : `Reporting ${user.username}`}
                    . {t ? t('report.description', 'Please describe the issue (spam, harassment, fake profile, etc.).') : 'Please describe the issue.'}
                </p>

                <textarea
                    className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[100px] mb-4"
                    placeholder={t ? t('report.reason_placeholder', "Reason for reporting...") : "Reason..."}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                />

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-bold"
                    >
                        {t ? t('btn.cancel', 'Cancel') : 'Cancel'}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                    >
                        {loading ? (t ? t('btn.sending', 'Sending...') : "Sending...") : (t ? t('report.submit', "Submit Report") : "Submit Report")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
