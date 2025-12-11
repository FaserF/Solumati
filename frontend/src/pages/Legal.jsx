import React from 'react';
import { ChevronLeft, Mail, Phone, Scale, Shield, Building2, User, FileText, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import { useI18n } from '../context/I18nContext';

const Legal = ({ type }) => {
    const { globalConfig } = useConfig();
    const config = globalConfig?.legal;
    const { t } = useI18n();
    const navigate = useNavigate();
    const onBack = () => navigate(-1);

    const {
        enabled_imprint = true,
        enabled_privacy = true,
        company_name = "Solumati Inc.",
        address_street = "Musterstraße 1",
        address_zip_city = "12345 Musterstadt",
        contact_email = "contact@solumati.local",
        contact_phone = "+49 123 456789",
        ceo_name = "Max Mustermann",
        register_court = "Amtsgericht Musterstadt",
        register_number = "HRB 12345",
        vat_id = "DE123456789"
    } = config || {};

    // Determine initial tab based on type and availability
    const getInitialTab = () => {
        if (type === 'imprint' && enabled_imprint) return 'imprint';
        if (type === 'privacy' && enabled_privacy) return 'privacy';
        if (enabled_imprint) return 'imprint';
        if (enabled_privacy) return 'privacy';
        return null;
    };

    const [activeTab, setActiveTab] = React.useState(getInitialTab());
    const isImprint = activeTab === 'imprint';

    if (!activeTab) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">
                Legal pages are currently disabled.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
                    >
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">{t('btn.back', 'Back')}</span>
                    </button>

                    {/* Tab Switcher */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
                        {enabled_privacy && (
                            <button
                                onClick={() => setActiveTab('privacy')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!isImprint ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                <Shield size={16} className="inline mr-1.5 -mt-0.5" />
                                {t('legal.privacy', 'Datenschutz')}
                            </button>
                        )}
                        {enabled_imprint && (
                            <button
                                onClick={() => setActiveTab('imprint')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isImprint ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                <Scale size={16} className="inline mr-1.5 -mt-0.5" />
                                {t('legal.imprint', 'Impressum')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Title Section */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-pink-500 to-indigo-600 rounded-xl text-white">
                            {isImprint ? <Scale size={24} /> : <Shield size={24} />}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                            {isImprint ? t('legal.imprint_title', 'Impressum') : t('legal.privacy_title', 'Datenschutzerklärung')}
                        </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isImprint ? t('legal.imprint_subtitle', 'Anbieterkennzeichnung gemäß § 5 TMG') : t('legal.privacy_subtitle', 'Wie wir mit deinen Daten umgehen')}
                    </p>
                </div>

                {/* Main Content */}
                <div className="space-y-4">
                    {isImprint ? (
                        <>
                            {/* Company Info Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-400 mb-3">
                                    <Building2 size={18} />
                                    <span className="text-xs font-medium uppercase tracking-wider">{t('legal.company', 'Unternehmen')}</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">{company_name}</p>
                                <p className="text-gray-600 dark:text-gray-300">{address_street}</p>
                                <p className="text-gray-600 dark:text-gray-300">{address_zip_city}</p>
                            </div>

                            {/* Representative Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-400 mb-3">
                                    <User size={18} />
                                    <span className="text-xs font-medium uppercase tracking-wider">{t('legal.represented_by', 'Vertreten durch')}</span>
                                </div>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{ceo_name}</p>
                            </div>

                            {/* Contact Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-400 mb-3">
                                    <Mail size={18} />
                                    <span className="text-xs font-medium uppercase tracking-wider">{t('legal.contact', 'Kontakt')}</span>
                                </div>
                                <div className="space-y-3">
                                    <a href={`tel:${contact_phone}`} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                                        <Phone size={18} className="text-gray-400" />
                                        <span>{contact_phone}</span>
                                    </a>
                                    <a href={`mailto:${contact_email}`} className="flex items-center gap-3 text-pink-600 dark:text-pink-400 hover:underline">
                                        <Mail size={18} className="text-gray-400" />
                                        <span>{contact_email}</span>
                                    </a>
                                </div>
                            </div>

                            {/* Register & VAT Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-400 mb-3">
                                    <FileText size={18} />
                                    <span className="text-xs font-medium uppercase tracking-wider">{t('legal.register_entry', 'Registereintrag')}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase mb-1">{t('legal.register_court_label', 'Registergericht')}</p>
                                        <p className="text-gray-900 dark:text-white font-medium">{register_court}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase mb-1">{t('legal.register_number_label', 'Registernummer')}</p>
                                        <p className="text-gray-900 dark:text-white font-medium font-mono">{register_number}</p>
                                    </div>
                                </div>
                            </div>

                            {/* VAT ID Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-400 mb-3">
                                    <Hash size={18} />
                                    <span className="text-xs font-medium uppercase tracking-wider">{t('legal.vat_id', 'USt-IdNr.')}</span>
                                </div>
                                <p className="text-gray-900 dark:text-white font-mono text-lg">{vat_id}</p>
                                <p className="text-xs text-gray-400 mt-1">{t('legal.vat_note', 'gemäß §27a UStG')}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Privacy Intro */}
                            <div className="bg-gradient-to-br from-indigo-50 to-pink-50 dark:from-indigo-900/20 dark:to-pink-900/20 rounded-2xl p-5">
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {t('legal.privacy_full.intro')}
                                </p>
                            </div>

                            {/* Privacy Sections */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('legal.privacy_full.controller')}</h3>
                                <p className="text-gray-600 dark:text-gray-300">{t('legal.privacy_full.controller_text')}</p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('legal.privacy_full.collection')}</h3>
                                <p className="text-gray-600 dark:text-gray-300">{t('legal.privacy_full.collection_text')}</p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('legal.privacy_full.registration')}</h3>
                                <p className="text-gray-600 dark:text-gray-300">{t('legal.privacy_full.registration_text')}</p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('legal.privacy_full.cookies')}</h3>
                                <p className="text-gray-600 dark:text-gray-300">{t('legal.privacy_full.cookies_text')}</p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('legal.privacy_full.rights')}</h3>
                                <p className="text-gray-600 dark:text-gray-300">{t('legal.privacy_full.rights_text')}</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>© {new Date().getFullYear()} {company_name}. {t('footer.all_rights', 'Alle Rechte vorbehalten.')}</p>
                </div>
            </div>
        </div>
    );
};

export default Legal;