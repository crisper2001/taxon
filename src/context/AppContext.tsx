import React, { createContext, useContext } from 'react';
import type { KeyData } from '../types';
import { translations } from '../constants';

type Language = keyof typeof translations;
type Theme = 'light' | 'dark';

interface AppContextProps {
  // State
  keyData: KeyData | null;
  t: (key: keyof typeof translations['en']) => string;
  isLoading: boolean;
  error: string | null;
  statusText: string;
  lang: Language;
  theme: Theme;
  appMode: 'identify' | 'build';
  geminiApiKey: string;
  isAiPanelVisible: boolean;

  // Setters
  setLang: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setGeminiApiKey: (key: string) => void;
  setAppMode: (mode: 'identify' | 'build') => void;
  setAiPanelVisible: (visible: boolean) => void;

  // Actions
  triggerImport: () => void;
  triggerOpenNativeKey: () => void;
  resetKey: () => void;
  openPreferences: () => void;
  openKeyInfo: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = AppContext.Provider;
