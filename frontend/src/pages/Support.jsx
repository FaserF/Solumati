import { ChevronLeft, Github, Heart, MessageCircle, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import { useI18n } from '../context/I18nContext';

const Support = () => {
    const { globalConfig } = useConfig();
    const { t } = useI18n();
    const navigate = useNavigate();

    const supportConfig = globalConfig?.support_page || {};
    const legalConfig = globalConfig?.legal || {};
    const contactEmail = legalConfig.contact_email;

    // Optional: Redirect if disabled?
    // React Router might still render it, but we can show a nice message instead.
    if (supportConfig.enabled === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">
                Support page is currently disabled.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="container mx-auto px-4 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
                >
                    <ChevronLeft size={20} />
                    <span>{t('btn.back', 'Back')}</span>
                </button>

                <div className="text-center max-w-2xl mx-auto mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-2xl mb-4">
                        <Heart size={32} className="fill-current" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Support & Community
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        We are an open source project. Your support and feedback help us grow!
                    </p>
                </div>

                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
                    {/* GitHub Card */}
                    <a
                        href="https://github.com/FaserF/Solumati"
                        target="_blank"
                        rel="noreferrer"
                        className="group bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center"
                    >
                        <div className="w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Github size={36} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            GitHub Project
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Check out our source code, report bugs, or request new features. Give us a star if you like it!
                        </p>
                        <span className="text-blue-600 font-bold group-hover:underline">
                            View on GitHub &rarr;
                        </span>
                    </a>

                    {/* Contact Card */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                                <MessageCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Get in Touch</h3>
                                <p className="text-sm text-gray-500">We love to hear from you.</p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            {supportConfig.contact_info ? (
                                <div className="prose dark:prose-invert text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">
                                    {supportConfig.contact_info}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No specific support instructions configured.</p>
                            )}
                        </div>

                        {contactEmail && (
                            <div className="mt-8 pt-6 border-t dark:border-gray-700">
                                <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-blue-600 transition-colors">
                                    <Mail size={18} />
                                    <span className="font-medium">{contactEmail}</span>
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Support;
