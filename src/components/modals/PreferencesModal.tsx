import React from 'react';
import { Modal } from './Modal';
import { Icon } from '../Icon';
import { translations } from '../../constants';
import Spot from '../Spot';
import { CustomSelect } from '../common/CustomSelect';
import type { Language, Theme } from '../../types';

// A map to display native language names
const languageNames: Record<Language, string> = {
    'en': 'English',
    'pt-br': 'Português (Brasil)',
    'pt-pt': 'Português (Portugal)',
    'es': 'Español',
    'ru': 'Русский',
    'zh': '中文',
    'ja': '日本語',
    'ko': '한국어',
    'fr': 'Français',
    'de': 'Deutsch',
    'la': 'Latina',
    'it': 'Italiano',
    'el': 'Ελληνικά',
    'hi': 'हिन्दी',
    'ar': 'العربية',
    'he': 'עברית'
};

// --- PreferencesModal ---
interface PreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPrefs: { lang: Language; theme: Theme; geminiApiKey: string; showToasts: boolean; hideAi: boolean; };
    onPreferenceChange: (key: 'lang' | 'theme' | 'geminiApiKey' | 'showToasts' | 'hideAi', value: string | boolean) => void;
    t: (key: keyof typeof translations['en']) => string;
    availableLanguages: Language[];
    onClearData?: () => void;
}
export const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose, currentPrefs, onPreferenceChange, t, availableLanguages, onClearData }) => {

    const prefButtonClasses = (isSelected: boolean) =>
        `px-4 py-3 rounded-2xl border transition-all duration-300 flex items-center gap-2 justify-center w-full font-bold
        ${isSelected
            ? 'bg-accent/95 backdrop-blur-md text-white border-white/20 shadow-lg shadow-accent/30'
            : 'bg-panel-bg/50 backdrop-blur-sm border-white/20 dark:border-white/10 hover:bg-hover-bg/80 hover:shadow-md text-text/80 shadow-sm'
        }`;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('preferences')}>
            <div className="p-7 space-y-8">
                {/* General Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4 border-b border-black/5 dark:border-white/5 pb-2 text-accent">
                        <Icon name="Settings2" size={20} />
                        <h4 className="font-black text-lg tracking-tight text-text">{t('prefsGeneral')}</h4>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="font-bold mb-2 text-base block tracking-tight text-text/90">{t('language')}</div>
                            <CustomSelect
                                value={currentPrefs.lang}
                                onChange={(val) => onPreferenceChange('lang', val as Language)}
                                options={availableLanguages.map(langCode => ({ value: langCode, label: languageNames[langCode] || langCode }))}
                                className="input-base w-full font-semibold cursor-pointer"
                            />
                        </div>
                        <div>
                            <h4 className="font-bold mb-2 text-base block tracking-tight text-text/90">{t('uiTheme')}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <button className={`${prefButtonClasses(currentPrefs.theme === 'light')} cursor-pointer`} onClick={() => onPreferenceChange('theme', 'light')}>
                                    <Icon name="Sun" /> {t('themeLight')}
                                </button>
                                <button className={`${prefButtonClasses(currentPrefs.theme === 'dark')} cursor-pointer`} onClick={() => onPreferenceChange('theme', 'dark')}>
                                    <Icon name="Moon" /> {t('themeDark')}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center justify-between cursor-pointer p-4 border border-white/20 dark:border-white/10 rounded-2xl transition-all bg-panel-bg/50 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-hover-bg/50">
                                <span className="font-bold text-base tracking-tight text-text/90">{t('uiShowToasts')}</span>
                                <input
                                    type="checkbox"
                                    checked={currentPrefs.showToasts}
                                    onChange={(e) => onPreferenceChange('showToasts', e.target.checked)}
                                    className="w-5 h-5 rounded border border-white/20 dark:border-white/10 text-accent focus:ring-accent focus:ring-offset-bg bg-bg cursor-pointer shadow-inner"
                                />
                            </label>
                        </div>
                    </div>
                </section>

                {/* AI Configuration Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4 border-b border-black/5 dark:border-white/5 pb-2 text-accent">
                        <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="head" className="w-5 h-5" />
                        <h4 className="font-black text-lg tracking-tight text-text">{t('prefsAI')}</h4>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="flex items-center justify-between cursor-pointer p-4 border border-white/20 dark:border-white/10 rounded-2xl transition-all bg-panel-bg/50 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-hover-bg/50">
                                <span className="font-bold text-base tracking-tight text-text/90">{t('uiHideAi' as any)}</span>
                                <input
                                    type="checkbox"
                                    checked={currentPrefs.hideAi}
                                    onChange={(e) => onPreferenceChange('hideAi', e.target.checked)}
                                    className="w-5 h-5 rounded border border-white/20 dark:border-white/10 text-accent focus:ring-accent focus:ring-offset-bg bg-bg cursor-pointer shadow-inner"
                                />
                            </label>
                        </div>
                        <div>
                            <label htmlFor="gemini-api-key" className="font-bold mb-2 text-base block tracking-tight text-text/90">
                                Gemini API Key
                            </label>
                            <input
                                id="gemini-api-key"
                                type="password"
                                value={currentPrefs.geminiApiKey}
                                onChange={(e) => onPreferenceChange('geminiApiKey', e.target.value)}
                                className="input-base w-full font-medium"
                                placeholder={t('enterApiKey')}
                            />
                            <p className="text-xs text-gray-500 mt-2">{t('apiKeyNote')}</p>
                        </div>
                    </div>
                </section>

                {onClearData && (
                    <div className="pt-2 border-t border-black/10 dark:border-white/10 flex justify-end">
                        <button 
                            onClick={onClearData} 
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold text-sm cursor-pointer shadow-sm"
                        >
                            <Icon name="Trash2" size={16} /> {t('clearLocalData' as any)}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
