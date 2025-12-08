import React from 'react';
import { ChevronLeft, Mail, Phone, MapPin, Scale, Shield } from 'lucide-react';

const Legal = ({ type, config, onBack, t }) => {
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
                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. {t('legal.privacy_head1', 'Datenschutz auf einen Blick')}</h2>
                                <h3 className="text-lg font-semibold mb-2">{t('legal.privacy_sub1', 'Allgemeine Hinweise')}</h3>
                                <p>{t('legal.privacy_text1', 'Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.')}</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. {t('legal.privacy_head2', 'Verantwortliche Stelle')}</h2>
                                <p>{t('legal.privacy_text2', 'Verantwortlich für die Datenverarbeitung auf dieser Website ist:')}</p>
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-[#2c2c2c] rounded-xl border border-gray-100 dark:border-white/10">
                                    <p className="font-bold text-gray-900 dark:text-white">{company_name}</p>
                                    <p>{address_street}</p>
                                    <p>{address_zip_city}</p>
                                    <br />
                                    <p>E-Mail: {contact_email}</p>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. {t('legal.privacy_head3', 'Datenerfassung auf unserer Website')}</h2>
                                <p>{t('legal.privacy_text3', 'Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.')}</p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. {t('legal.privacy_head4', 'Ihre Rechte')}</h2>
                                <p>{t('legal.privacy_text4', 'Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten.')}</p>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Legal;