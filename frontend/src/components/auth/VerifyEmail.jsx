import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const VerifyEmail = ({ t }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    const id = searchParams.get('id');
    const code = searchParams.get('code');

    useEffect(() => {
        if (!id || !code) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        const verify = async () => {
            try {
                // Backend expects POST /verify?id=...&code=...
                const res = await fetch(`${API_URL}/verify?id=${id}&code=${code}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await res.json();

                if (res.ok) {
                    setStatus('success');
                    setMessage(data.message || 'Email verified successfully!');
                } else {
                    setStatus('error');
                    setMessage(data.detail || 'Verification failed.');
                }
            } catch (err) {
                console.error(err);
                setStatus('error');
                setMessage('Connection failed.');
            }
        };

        verify();
    }, [id, code]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="mb-6 flex justify-center">
                    {status === 'verifying' && <Loader className="animate-spin text-blue-500" size={48} />}
                    {status === 'success' && <CheckCircle className="text-green-500" size={48} />}
                    {status === 'error' && <XCircle className="text-red-500" size={48} />}
                </div>

                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                    {status === 'verifying' && 'Verifying...'}
                    {status === 'success' && 'Success!'}
                    {status === 'error' && 'Error'}
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    {status === 'verifying' && 'Please wait while we verify your email address.'}
                    {message}
                </p>

                {status !== 'verifying' && (
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                        {t ? t('btn.back_login', 'Back to Login') : 'Back to Login'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
