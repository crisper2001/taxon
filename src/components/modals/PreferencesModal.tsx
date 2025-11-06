import React from 'react';
import { Modal } from './Modal';
import { Icon } from '../Icon';
import { translations } from '../../constants';

type Language = keyof typeof translations;
type Theme = 'light' | 'dark';

// A map to display native language names
const languageNames: Record<Language, string> = {
    'en': 'English',
    'pt-br': 'Português (Brasil)',
    'es': 'Español',
    'ru': 'Русский',
    'zh': '中文',
    'ja': '日本語',
    'fr': 'Français',
    'de': 'Deutsch',
    'la': 'Latina',
    'it': 'Italiano',
};

// --- PreferencesModal ---
interface PreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPrefs: { lang: Language; theme: Theme; };
    onPreferenceChange: (key: 'lang' | 'theme', value: Language | Theme) => void;
    t: (key: keyof typeof translations['en']) => string;
    availableLanguages: Language[];
}
export const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose, currentPrefs, onPreferenceChange, t, availableLanguages }) => {

    const prefButtonClasses = (isSelected: boolean) =>
        `px-4 py-2 rounded-lg border-2 transition-colors duration-200 flex items-center gap-2 justify-center w-full
        ${isSelected
            ? 'bg-accent text-white border-accent'
            : 'bg-transparent border-border hover:border-gray-400 dark:hover:border-gray-500'
        }`;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('preferences')}>
            <div className="p-6 space-y-8">
                <div>
                    <label htmlFor="language-select" className="font-semibold mb-3 text-lg text-center block">{t('language')}</label>
                    <select
                        id="language-select"
                        value={currentPrefs.lang}
                        onChange={(e) => onPreferenceChange('lang', e.target.value as Language)}
                        className="w-full p-2 border-2 border-border rounded-lg bg-bg focus:ring-accent focus:border-accent"
                    >
                        {availableLanguages.map((langCode) => (
                            <option key={langCode} value={langCode}>
                                {languageNames[langCode] || langCode}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <h4 className="font-semibold mb-3 text-lg text-center">{t('uiTheme')}</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <button className={prefButtonClasses(currentPrefs.theme === 'light')} onClick={() => onPreferenceChange('theme', 'light')}>
                            <Icon name="Sun" /> {t('themeLight')}
                        </button>
                        <button className={prefButtonClasses(currentPrefs.theme === 'dark')} onClick={() => onPreferenceChange('theme', 'dark')}>
                            <Icon name="Moon" /> {t('themeDark')}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
