import React from 'react';
import { ChevronLeft, Mail, Phone, Scale, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import { useI18n } from '../context/I18nContext';

const Legal = ({ type }) => {
    const { globalConfig } = useConfig();
    const config = globalConfig?.legal;
    const { t } = useI18n();
    const navigate = useNavigate();
    const onBack = () => navigate(-1);
    // Default to empty strings if config is missing to avoid crashes
    const {
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

    const [activeTab, setActiveTab] = React.useState(type === 'imprint' ? 'imprint' : 'privacy');
    const isImprint = activeTab === 'imprint';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center py-12 px-4 transition-colors">
            <div className="w-full max-w-3xl bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-lg p-8 md:p-12 relative overflow-hidden ring-1 ring-black/5">
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-indigo-600"></div>

                <div className="flex justify-between items-start mb-8">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2c2c2c]"
                    >
                        <ChevronLeft size={20} /> {t('btn.back', 'Back')}
                    </button>

                    {/* Tab Switcher */}
                    <div className="flex bg-gray-100 dark:bg-[#2c2c2c] p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!isImprint ? 'bg-white dark:bg-[#383838] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            {t('legal.privacy', 'Datenschutz')}
                        </button>
                        <button
                            onClick={() => setActiveTab('imprint')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isImprint ? 'bg-white dark:bg-[#383838] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            {t('legal.imprint', 'Impressum')}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gray-100 dark:bg-[#2c2c2c] rounded-2xl text-gray-800 dark:text-pink-500">
                        {isImprint ? <Scale size={32} /> : <Shield size={32} />}
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                        {isImprint ? t('legal.imprint_title', 'Impressum') : t('legal.privacy_title', 'Datenschutzerklärung')}
                    </h1>
                </div>

                <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-8">

                    {isImprint ? (
                        <>
                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('legal.provider_id', 'Angaben gemäß § 5 TMG')}</h2>
                                <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{company_name}</p>
                                <p>{address_street}</p>
                                <p>{address_zip_city}</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('legal.represented_by', 'Vertreten durch')}</h2>
                                <p>{ceo_name}</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('legal.contact', 'Kontakt')}</h2>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <Phone size={18} className="text-gray-400" />
                                        <span>{contact_phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail size={18} className="text-gray-400" />
                                        <a href={`mailto:${contact_email}`} className="text-pink-600 hover:underline">{contact_email}</a>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('legal.register_entry', 'Registereintrag')}</h2>
                                <p>{t('legal.register_court', 'Eintragung im Handelsregister.')}</p>
                                <p><span className="font-medium">{t('legal.register_court_label', 'Registergericht')}:</span> {register_court}</p>
                                <p><span className="font-medium">{t('legal.register_number_label', 'Registernummer')}:</span> {register_number}</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('legal.vat_id', 'Umsatzsteuer-ID')}</h2>
                                <p>{t('legal.vat_note', 'Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz')}:</p>
                                <p className="font-mono bg-gray-100 dark:bg-[#2c2c2c] w-fit px-2 py-1 rounded">{vat_id}</p>
                            </section>
                        </>
                    ) : (
                        <>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('legal.privacy_title', 'Datenschutzerklärung')}</h2>
                                <p className="text-gray-600 dark:text-gray-300 mb-4">{t('legal.privacy_full.intro')}</p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-semibold mb-2">{t('legal.privacy_full.controller')}</h3>
                                <p>{t('legal.privacy_full.controller_text')}</p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-semibold mb-2">{t('legal.privacy_full.collection')}</h3>
                                <p>{t('legal.privacy_full.collection_text')}</p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-semibold mb-2">{t('legal.privacy_full.registration')}</h3>
                                <p>{t('legal.privacy_full.registration_text')}</p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-semibold mb-2">{t('legal.privacy_full.cookies')}</h3>
                                <p>{t('legal.privacy_full.cookies_text')}</p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-semibold mb-2">{t('legal.privacy_full.rights')}</h3>
                                <p>{t('legal.privacy_full.rights_text')}</p>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Legal;