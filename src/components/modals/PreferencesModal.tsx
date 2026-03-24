import React, { useState } from 'react';
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
    const [activeTab, setActiveTab] = useState<'general' | 'interface' | 'ai'>('general');

    const prefButtonClasses = (isSelected: boolean) =>
        `px-4 py-3 rounded-2xl border transition-all duration-300 flex items-center gap-2 justify-center w-full font-bold
        ${isSelected
            ? 'bg-accent/95 backdrop-blur-md text-white border-white/20 shadow-lg'
            : 'bg-panel-bg/50 backdrop-blur-sm border-white/20 dark:border-white/10 hover:bg-hover-bg/80 hover:shadow-md text-text/80 shadow-sm'
        }`;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('preferences')}>
            <div className="flex flex-col bg-bg/80 backdrop-blur-sm rounded-b-3xl">
                <div className="p-7 min-h-[300px]">
                {activeTab === 'general' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div>
                            <div className="font-bold mb-2 text-base block tracking-tight text-text/90">{t('language')}</div>
                            <CustomSelect
                                value={currentPrefs.lang}
                                onChange={(val) => onPreferenceChange('lang', val as Language)}
                                options={availableLanguages.map(langCode => ({ value: langCode, label: languageNames[langCode] || langCode }))}
                                className="input-base w-full font-semibold cursor-pointer"
                            />
                        </div>
                        
                        {onClearData && (
                            <div className="pt-6 border-t border-black/10 dark:border-white/10">
                                <div className="font-bold mb-3 text-base block tracking-tight text-text/90">{t('data' as any) || 'Data Management'}</div>
                                <button 
                                    onClick={onClearData} 
                                    className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold cursor-pointer shadow-sm"
                                >
                                    <Icon name="Trash2" size={18} /> {t('clearLocalData' as any)}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'interface' && (
                    <div className="space-y-6 animate-fade-in-up">
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
                )}

                {activeTab === 'ai' && (
                    <div className="space-y-6 animate-fade-in-up">
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
                )}
                </div>

                <div className="flex items-center justify-around bg-panel-bg/85 backdrop-blur-xl border border-white/20 dark:border-white/10 p-2 shrink-0 z-20 shadow-lg rounded-3xl m-4 mt-0">
                    <button onClick={() => setActiveTab('general')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 ${activeTab === 'general' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50 cursor-pointer'}`}>
                        <Icon name="Settings2" size={22} />
                        <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('prefsGeneral' as any) || 'General'}</span>
                    </button>
                    <button onClick={() => setActiveTab('interface')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 ${activeTab === 'interface' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50 cursor-pointer'}`}>
                        <Icon name="Palette" size={22} />
                        <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('interface' as any) || 'Interface'}</span>
                    </button>
                    <button onClick={() => setActiveTab('ai')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 ${activeTab === 'ai' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50 cursor-pointer'}`}>
                        <Spot primaryColor="currentColor" secondaryColor="transparent" mode="head" className="w-[22px] h-[22px]" />
                        <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('prefsAI' as any) || 'AI'}</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};
