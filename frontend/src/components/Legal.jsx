import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { ChevronLeft } from 'lucide-react';

const Legal = ({ onBack, t }) => {
    const [content, setContent] = useState({ imprint: '', privacy: '' });

    useEffect(() => {
        fetch(`${API_URL}/public/legal`)
            .then(res => res.json())
            .then(data => setContent(data))
            .catch(console.error);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-3xl mx-auto">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-black mb-8">
                    <ChevronLeft size={20} /> {t('btn.back')}
                </button>

                <div className="bg-white p-8 rounded-2xl shadow-sm mb-8">
                    <h2 className="text-2xl font-bold mb-4">{t('admin.settings.imprint')}</h2>
                    <div className="prose max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: content.imprint }} />
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm">
                    <h2 className="text-2xl font-bold mb-4">{t('admin.settings.privacy')}</h2>
                    <div className="prose max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: content.privacy }} />
                </div>
            </div>
        </div>
    );
};

export default Legal;