import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { KeyData, ChosenFeature, ModalState, Media, RawChatMessage, DraftKeyData } from './types';
import { LucidKeyParser } from './services/LucidKeyParserService';
import { FeaturesPanel, EntitiesPanel, ChosenFeaturesPanel } from './components/panels';
import { AIAssistant } from './components/AIAssistant';
import { ResizablePanels } from './components/panels/ResizablePanels';
import { EntityModal, PreferencesModal, KeyInfoModal, FeatureModal, ImageLightboxModal, ConfirmModal } from './components/modals';
import { translations } from './constants';
import { useKeyFiltering } from './hooks/useKeyFiltering';
import { useResizablePanel } from './hooks/useResizablePanel';
import { filterEntityTree } from './utils/treeUtils';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Icon } from './components/Icon';
import { KeyBuilder } from './components/builder/KeyBuilder';
import { Toast } from './components/Toast';
import { AppProvider } from './context/AppContext';
import type { Language, Theme } from './types';

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [keyData, setKeyData] = useState<KeyData | null>(null);
  const [chosenFeatures, setChosenFeatures] = useState<Map<string, ChosenFeature>>(new Map());
  const [appMode, setAppMode] = useState<'identify' | 'build'>('identify');
  const [draftKeyData, setDraftKeyData] = useState<DraftKeyData | undefined>(undefined);
  const [isHome, setIsHome] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [showToasts, setShowToasts] = useState<boolean>(true);
  const [hideAi, setHideAi] = useState<boolean>(false);

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isAiPanelVisible, setAiPanelVisible] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [underlyingModalState, setUnderlyingModalState] = useState<ModalState | null>(null);
  const [expandedRemainingNodes, setExpandedRemainingNodes] = useState(new Set<string>());
  const [expandedDiscardedNodes, setExpandedDiscardedNodes] = useState(new Set<string>());
  const [identifyChatHistory, setIdentifyChatHistory] = useState<RawChatMessage[]>([]);
  const [buildChatHistory, setBuildChatHistory] = useState<RawChatMessage[]>([]);
  const [toasts, setToasts] = useState<{ id: string, message: string }[]>([]);
  const toastIdCounter = useRef(0);
  const prevDiscardedCountRef = useRef(0);
  const isFeatureUpdateRef = useRef(false);

  // AI Panel Resizing State
  const MIN_AI_PANEL_WIDTH = 350;
  const MAX_AI_PANEL_WIDTH = 700;
  const { 
    width: aiPanelWidth, 
    isActivelyResizing, 
    handleMouseDown: handleAiPanelMouseDown, 
    setWidth: setAiPanelWidth 
  } = useResizablePanel(450, MIN_AI_PANEL_WIDTH, MAX_AI_PANEL_WIDTH, isAiPanelVisible, 'aiPanelWidth');
  
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const combinedFileInputRef = useRef<HTMLInputElement>(null);
  const currentDraftRef = useRef<DraftKeyData | null>(null);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const dragCounter = useRef(0);
  const [dragOverHomeButton, setDragOverHomeButton] = useState<'identify' | 'build' | null>(null);

  // --- DERIVED STATE & MEMOS ---
  const { directMatches, indirectMatches, discardedEntityIds, directlyDiscarded } = useKeyFiltering(keyData, chosenFeatures);

  const remainingTree = useMemo(() => {
    if (!keyData) return [];
    return filterEntityTree(keyData.entityTree, new Set([...directMatches, ...indirectMatches]), directMatches);
  }, [keyData, directMatches, indirectMatches]);

  const discardedTree = useMemo(() => {
    if (!keyData) return [];
    return filterEntityTree(keyData.entityTree, discardedEntityIds, new Set(), directlyDiscarded);
  }, [keyData, discardedEntityIds, directlyDiscarded]);

  const chosenFeatureCount = useMemo(() => {
    if (!keyData) return 0;
    const uniqueFeatures = new Set<string>();
    for (const id of chosenFeatures.keys()) {
      const feature = keyData.allFeatures.get(id);
      if (!feature) continue;
      if (feature.isState && feature.parentName) {
        uniqueFeatures.add(feature.parentName);
      } else {
        uniqueFeatures.add(feature.id);
      }
    }
    return uniqueFeatures.size;
  }, [chosenFeatures, keyData]);

  // --- EFFECTS ---
  useEffect(() => {
    const savedLang = localStorage.getItem('userLanguage') as Language;
    if (savedLang && Object.keys(translations).includes(savedLang)) {
      setLang(savedLang);
    } else {
      const browserLangCode = navigator.language.split('-')[0] as keyof typeof translations;
      if (browserLangCode === 'pt-br') { // Special case for pt-br
        setLang('pt-br');
      } else if (Object.keys(translations).includes(browserLangCode)) {
        setLang(browserLangCode as Language);
      } else {
        setLang('en');
      }
    }

    const savedTheme = localStorage.getItem('userTheme') as Theme;
    setTheme(savedTheme || 'light');

    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
      setGeminiApiKey(savedApiKey);
    }

    const savedToasts = localStorage.getItem('showToasts');
    if (savedToasts !== null) {
      setShowToasts(savedToasts === 'true');
    }

    const savedHideAi = localStorage.getItem('hideAi');
    if (savedHideAi !== null) {
      setHideAi(savedHideAi === 'true');
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar' || lang === 'he') ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    const accentColor = theme === 'light' ? '#007bff' : '#3b82f6';
    const accentHoverColor = theme === 'light' ? '#0056b3' : '#2563eb';
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--accent-hover-color', accentHoverColor);

    // Dynamically generate and set the Leaf SVG favicon using the current accent color
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 22 12 12"/></svg>`;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = `data:image/svg+xml,${encodeURIComponent(svgFavicon)}`;

    // Dynamically update the browser's theme-color meta tag
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme === 'light' ? '#f8f9fa' : '#1a1a1a');
  }, [theme]);

  // Failsafe to guarantee the global drag state is reset when a file is dropped
  // anywhere on the window, even if a child component stops the event propagation.
  useEffect(() => {
    const handleWindowDrop = () => {
      dragCounter.current = 0;
      setIsGlobalDragging(false);
    };
    window.addEventListener('drop', handleWindowDrop, true);
    window.addEventListener('dragend', handleWindowDrop, true);
    return () => {
      window.removeEventListener('drop', handleWindowDrop, true);
      window.removeEventListener('dragend', handleWindowDrop, true);
    };
  }, []);

  useEffect(() => {
    setAiPanelVisible(false);
  }, [appMode]);

  useEffect(() => {
    if (isHome) {
      setAiPanelVisible(false);
      setSidebarOpen(false);
    }
  }, [isHome]);

  // --- TRANSLATIONS ---
  const t = useCallback((key: keyof typeof translations['en']) => {
    return translations[lang]?.[key] || translations['en'][key] || key;
  }, [lang]);

  // --- EVENT HANDLERS & LOGIC ---
  const resetKey = () => {
    setChosenFeatures(new Map());
    setExpandedRemainingNodes(new Set());
    setExpandedDiscardedNodes(new Set());
  };

  const addToast = useCallback((message: string) => {
    if (!showToasts) return;
    toastIdCounter.current += 1;
    const id = toastIdCounter.current.toString();
    setToasts(prev => [...prev, { id, message }]);
  }, [showToasts]);

  useEffect(() => {
    if (!keyData) {
      prevDiscardedCountRef.current = 0;
      isFeatureUpdateRef.current = false;
      return;
    }

    if (isFeatureUpdateRef.current) {
      const diff = discardedEntityIds.size - prevDiscardedCountRef.current;
      const remain = directMatches.size;
      if (diff > 0) {
        addToast(t('entitiesDiscardedCount').replace('{count}', diff.toString()).replace('{remain}', remain.toString()));
      } else if (diff < 0) {
        addToast(t('entitiesRestoredCount').replace('{count}', Math.abs(diff).toString()).replace('{remain}', remain.toString()));
      } else {
        addToast(t('featureUpdated'));
      }
      isFeatureUpdateRef.current = false;
    }
    
    prevDiscardedCountRef.current = discardedEntityIds.size;
  }, [discardedEntityIds, keyData, addToast, t, directMatches.size]);

  const handleCloseToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleReset = () => {
    if (keyData) {
      setModalState({ type: 'confirmClear' });
    }
  };

  const executeReset = () => {
    resetKey();
    addToast(t('featuresCleared'));
  };

  const processZipFile = async (file: File, targetMode: 'identify' | 'build') => {
    if (targetMode === 'build') {
      addToast(t('errProcessingKey')); // ZIPs can't be edited directly in builder
      return;
    }
    setIsLoading(true);
    setError(null);
    setKeyData(null);
    resetKey();
    setIdentifyChatHistory([]);

    try {
      const parser = new LucidKeyParser();
      const data = await parser.processKeyFromZip(file);
      setKeyData(data);
      setAppMode(targetMode);
      setIsHome(false);
      setSidebarOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(t(err.message as keyof typeof translations['en']));
      } else {
        setError(t('errProcessingKey'));
      }
      console.error("Error processing key file:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const processJsonFile = async (file: File, targetMode: 'identify' | 'build') => {
    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as DraftKeyData;
      if (data.title !== undefined && Array.isArray(data.features) && Array.isArray(data.entities)) {
        if (targetMode === 'identify') {
          const parser = new LucidKeyParser();
          const loadedKeyData = parser.processDraftKey(data);
          setKeyData(loadedKeyData);
          resetKey();
          setIdentifyChatHistory([]);
        } else {
          setDraftKeyData(data);
          setBuildChatHistory([]);
        }
        setAppMode(targetMode);
        setIsHome(false);
        setSidebarOpen(false);
        addToast(`${t('openNativeKey')} \u2014 ${data.title}`);
      } else {
        addToast(t('errCorruptedFile'));
      }
    } catch (err: unknown) {
      addToast(t('errProcessingKey'));
      console.error("Error processing JSON key file:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processZipFile(file, appMode);
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleJsonFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processJsonFile(file, appMode);
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleGlobalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      const isImageDrag = Array.from(e.dataTransfer.items).some((item: DataTransferItem) => item.type.startsWith('image/'));
      // Don't show the global key drop overlay if the user is dragging images
      if (!isImageDrag) {
        dragCounter.current += 1;
        setIsGlobalDragging(true);
      }
    }
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      const isImageDrag = Array.from(e.dataTransfer.items).some((item: DataTransferItem) => item.type.startsWith('image/'));
      if (!isImageDrag) {
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
          dragCounter.current = 0;
          setIsGlobalDragging(false);
        }
      }
    }
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsGlobalDragging(false);

    if (isHome) return; // Drop on Home screen is managed by specific buttons

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      return; // Handled by AI Assistant if dropped there
    }

    const name = file.name.toLowerCase();
    if (name.endsWith('.json')) {
      processJsonFile(file, appMode);
    } else if (name.endsWith('.zip') || name.endsWith('.lk4') || name.endsWith('.lk5')) {
      processZipFile(file, appMode);
    } else {
      addToast(t('errCorruptedFile'));
    }
  };

  const handleHomeDrop = (e: React.DragEvent, targetMode: 'identify' | 'build') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverHomeButton(null);
    dragCounter.current = 0;
    setIsGlobalDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (name.endsWith('.json')) {
      processJsonFile(file, targetMode);
    } else if (name.endsWith('.zip') || name.endsWith('.lk4') || name.endsWith('.lk5')) {
      processZipFile(file, targetMode);
    } else {
      addToast(t('errCorruptedFile'));
    }
  };

  const updateFeature = (id: string, value: string | boolean | number, isNumeric = false) => {
    isFeatureUpdateRef.current = true;
    setChosenFeatures(prevMap => {
      const newMap = new Map(prevMap);

      // Handle state features (booleans from checkboxes)
      if (!isNumeric) {
        if (value) {
            newMap.set(id, { }); // State features are marked as chosen without a specific value
        } else {
            newMap.delete(id);
        }
        return newMap;
      }

      // Handle numeric features (strings/numbers from input fields)
      const isValueInvalid = value === '' || typeof value === 'boolean' || isNaN(parseFloat(String(value)));
      if (isValueInvalid) {
        newMap.delete(id);
      } else {
        newMap.set(id, { value });
      }

      return newMap;
    });
  };

  const handlePreferenceChange = (key: 'lang' | 'theme' | 'geminiApiKey' | 'showToasts' | 'hideAi', value: string | boolean) => {
    if (key === 'lang') {
      const newLang = value as Language;
      setLang(newLang);
      localStorage.setItem('userLanguage', newLang);
    } else if (key === 'theme') {
      const newTheme = value as Theme;
      setTheme(newTheme);
      localStorage.setItem('userTheme', newTheme);
    } else if (key === 'geminiApiKey') {
      setGeminiApiKey(value as string);
      localStorage.setItem('geminiApiKey', value as string);
    } else if (key === 'showToasts') {
      setShowToasts(value as boolean);
      localStorage.setItem('showToasts', String(value));
    } else if (key === 'hideAi') {
      setHideAi(value as boolean);
      localStorage.setItem('hideAi', String(value));
      if (value) setAiPanelVisible(false);
    }
  };

  const handleModalClose = useCallback(() => {
    if ((modalState.type === 'lightbox' || (modalState.type as any) === 'confirmClearData') && underlyingModalState) {
      setModalState(underlyingModalState);
      setUnderlyingModalState(null);
    } else {
      setModalState({ type: 'none' });
      setUnderlyingModalState(null);
    }
  }, [modalState.type, underlyingModalState]);

  const handleOpenLightbox = useCallback((media: Media[], startIndex: number) => {
    setUnderlyingModalState(modalState);
    setModalState({ type: 'lightbox', media, startIndex });
  }, [modalState]);

  const statusText = isLoading ? t('processing') :
    error ? `${t('error')}: ${error}` :
      keyData ? keyData.keyTitle : t('loadKeyPrompt');

  const activeOrUnderlying = underlyingModalState || modalState;

  const HomeButton = ({ onClick, onDragOver, onDragLeave, onDrop, isDragOver, icon, title, desc }: any) => (
    <button 
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex-1 flex flex-col items-center gap-4 p-8 bg-panel-bg border rounded-3xl transition-all group cursor-pointer shadow-sm ${isDragOver ? 'border-accent shadow-xl scale-105 bg-accent/5' : 'border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-lg'}`}
    >
      <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform pointer-events-none">
        <Icon name={icon} size={32} />
      </div>
      <div className="text-center pointer-events-none">
        <h3 className="text-xl font-bold text-text mb-2">{title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{desc}</p>
      </div>
    </button>
  );

  // --- CONTEXT VALUE ---
  const contextValue = {
    keyData,
    t,
    isLoading,
    error,
    statusText,
    lang, setLang,
    theme, setTheme,
    appMode, setAppMode,
    geminiApiKey, setGeminiApiKey,
    isAiPanelVisible, setAiPanelVisible,
    triggerImport: () => combinedFileInputRef.current?.click(),
    triggerOpenNativeKey: () => jsonFileInputRef.current?.click(),
    resetKey: handleReset,
    openPreferences: () => setModalState({ type: 'preferences' }),
    openKeyInfo: () => keyData && setModalState({ type: 'keyInfo' }),
    closeKey: () => {
      setIsHome(true);
    },
    hideAi,
  };

  return (
    <AppProvider value={contextValue}>
    <div 
      className={`main-container flex flex-col h-dvh w-full font-sans bg-bg text-text transition-colors duration-300 overflow-hidden ${isActivelyResizing ? 'select-none cursor-col-resize' : ''}`}
      onDragEnter={handleGlobalDragEnter}
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      {isGlobalDragging && !isHome && (
        <div className="absolute inset-0 z-100 bg-bg/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none transition-all duration-300">
          <div className="border-4 border-dashed border-accent rounded-3xl p-12 flex flex-col items-center justify-center bg-panel-bg shadow-2xl animate-fade-in-up">
             <Icon name="FolderOpen" size={64} className="mb-6 animate-bounce text-accent" />
             <h3 className="text-3xl font-black tracking-tight text-accent">{t('openNativeKey')}</h3>
             <p className="text-lg opacity-80 mt-2 font-medium text-accent">{t('dropKeyHere' as any)}</p>
          </div>
        </div>
      )}
      {/* Global SVG Gradients for Icons */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="accent-gradient" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--color-accent, var(--accent-color))" style={{ stopColor: 'color-mix(in srgb, var(--color-accent, var(--accent-color)), white 15%)' }} />
            <stop offset="100%" stopColor="var(--color-accent, var(--accent-color))" style={{ stopColor: 'color-mix(in srgb, var(--color-accent, var(--accent-color)), black 10%)' }} />
          </linearGradient>
          <linearGradient id="red-gradient" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444" style={{ stopColor: 'color-mix(in srgb, #ef4444, white 15%)' }} />
            <stop offset="100%" stopColor="#ef4444" style={{ stopColor: 'color-mix(in srgb, #ef4444, black 10%)' }} />
          </linearGradient>
        </defs>
      </svg>

      {/* --- Modals --- */}
      <EntityModal
        isOpen={modalState.type === 'entity' || underlyingModalState?.type === 'entity'}
        onClose={handleModalClose}
        entityId={(activeOrUnderlying as any).entityId}
        keyData={keyData}
        t={t}
        onImageClick={handleOpenLightbox}
      />
      <PreferencesModal isOpen={modalState.type === 'preferences' || underlyingModalState?.type === 'preferences'} onClose={() => setModalState({ type: 'none' })} currentPrefs={{ lang, theme, geminiApiKey, showToasts, hideAi }} onPreferenceChange={handlePreferenceChange} t={t} availableLanguages={Object.keys(translations) as Language[]} onClearData={() => { setUnderlyingModalState(modalState); setModalState({ type: 'confirmClearData' as any }); }} />
      <KeyInfoModal isOpen={modalState.type === 'keyInfo' || underlyingModalState?.type === 'keyInfo'} onClose={() => setModalState({ type: 'none' })} keyData={keyData} t={t} />
      <FeatureModal isOpen={modalState.type === 'feature' || underlyingModalState?.type === 'feature'} onClose={handleModalClose} featureId={(activeOrUnderlying as any).featureId} keyData={keyData} t={t} onImageClick={handleOpenLightbox} />
      <ImageLightboxModal isOpen={modalState.type === 'lightbox'} onClose={handleModalClose} media={(modalState as any).media} startIndex={(modalState as any).startIndex ?? 0} />

      <ConfirmModal
        isOpen={modalState.type === 'confirmClear' || underlyingModalState?.type === 'confirmClear'}
        onClose={handleModalClose}
        onConfirm={executeReset}
        title={t('clearFeatures')}
        message={
          <div className="flex items-start gap-3 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            <Icon name="TriangleAlert" size={24} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{t('confirmClear')}</p>
          </div>
        }
        confirmText={t('clearFeatures')}
        cancelText={t('cancel')}
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={(modalState.type as any) === 'confirmClearData' || (underlyingModalState?.type as any) === 'confirmClearData'}
        onClose={handleModalClose}
        onConfirm={() => { localStorage.clear(); window.location.reload(); }}
        title={t('clearLocalData' as any)}
        message={
          <div className="flex items-start gap-3 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            <Icon name="TriangleAlert" size={24} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{t('confirmClearLocalData' as any)}</p>
          </div>
        }
        confirmText={t('clearLocalData' as any)}
        cancelText={t('cancel')}
        isDestructive={true}
      />

      <input
        type="file"
        ref={jsonFileInputRef}
        onChange={handleJsonFileSelect}
        className="hidden"
        accept=".json"
      />
      <input
        type="file"
        ref={combinedFileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.name.toLowerCase().endsWith('.json')) {
            handleJsonFileSelect(e);
          } else {
            handleFileSelect(e);
          }
        }}
        className="hidden"
        accept=".zip,.lk4,.lk5,.json"
      />

      {/* --- Sidebar --- */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />


      <div className={`content-wrapper flex grow min-h-0 transition-all duration-300 ease-in-out ml-0`}>
        <div className="page-content grow flex flex-col h-full min-w-0 min-h-0 overflow-hidden relative">
          
          {/* --- Background Layer (Identify or Build) --- */}
          {(!isLoading && !error && (keyData || appMode === 'build')) && (
            <div className={`absolute inset-0 flex flex-col bg-bg transition-all duration-500 ease-in-out z-10 ${isHome ? 'scale-[0.97] opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
              
              {appMode === 'identify' && keyData && (
                <Header isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
              )}
              
              {appMode === 'build' ? (
                <div className="flex grow min-h-0 relative z-10 w-full animate-screen-in">
                  <KeyBuilder 
                    onExit={() => {
                      if (currentDraftRef.current) setDraftKeyData(currentDraftRef.current);
                      setIsHome(true);
                    }} 
                    initialData={draftKeyData} 
                    onChange={(draft) => currentDraftRef.current = draft} 
                    onTestKey={(draft) => {
                      const parser = new LucidKeyParser();
                      setKeyData(parser.processDraftKey(draft));
                      resetKey();
                      setIdentifyChatHistory([]);
                      setDraftKeyData(draft);
                      setAppMode('identify');
                    }}
                    onNewKey={() => setBuildChatHistory([])}
                  />
                </div>
              ) : keyData ? (
                <div className="flex flex-col grow min-h-0 relative z-10 w-full animate-screen-in">
                  <ResizablePanels
                    bottomBarItems={[
                      { id: 'features', icon: 'ListFilter', label: t('features') },
                      { id: 'remaining', icon: 'List', label: t('entitiesRemaining'), count: directMatches.size },
                      { id: 'chosen', icon: 'ListChecks', label: t('featuresChosen'), count: chosenFeatureCount },
                      { id: 'discarded', icon: 'ListX', label: t('entitiesDiscarded'), count: discardedEntityIds.size }
                    ]}
                  >
                    <FeaturesPanel keyData={keyData} chosenFeatures={chosenFeatures} onFeatureChange={updateFeature} onImageClick={(id) => setModalState({ type: 'feature', featureId: id })} t={t} />
                    <EntitiesPanel
                      title={t('entitiesRemaining')}
                      icon="List"
                      count={directMatches.size}                
                      entityTree={remainingTree}
                      directMatches={directMatches}
                      indirectMatches={indirectMatches}
                      mediaMap={keyData.entityMedia} onEntityClick={(id) => setModalState({ type: 'entity', entityId: id })}
                      t={t}
                      expandedNodes={expandedRemainingNodes}
                      setExpandedNodes={setExpandedRemainingNodes} />
                    <ChosenFeaturesPanel chosenFeatures={chosenFeatures} keyData={keyData} onFeatureChange={updateFeature} onImageClick={(id) => setModalState({ type: 'feature', featureId: id })} t={t} />
                    <EntitiesPanel
                      title={t('entitiesDiscarded')}
                      directMatches={new Set()}
                      indirectMatches={new Set()}
                      count={discardedEntityIds.size}
                      icon="ListX" entityTree={discardedTree}
                      mediaMap={keyData.entityMedia} onEntityClick={(id) => setModalState({ type: 'entity', entityId: id })}
                      t={t}
                      expandedNodes={expandedDiscardedNodes}
                      setExpandedNodes={setExpandedDiscardedNodes} />
                  </ResizablePanels>
                </div>
              ) : null}
            </div>
          )}

          {/* --- Foreground Layer (Loading, Error, Home) --- */}
          {isLoading ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg p-8 animate-screen-in text-center w-full">
              <span className="animate-pulse text-2xl font-bold text-accent tracking-tight flex items-center gap-3">
                <Icon name="LoaderCircle" className="animate-spin" size={28} /> {statusText}
              </span>
            </div>
          ) : error ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg p-8 animate-screen-in text-center w-full">
              <div className="flex flex-col items-center gap-4 max-w-md bg-red-500/10 backdrop-blur-md p-6 rounded-3xl border border-red-500/30 text-red-500 shadow-inner">
                <Icon name="CircleAlert" size={40} />
                <span className="text-lg font-bold tracking-tight">{statusText}</span>
              </div>
              <button onClick={() => { setError(null); setIsHome(true); }} className="mt-8 px-6 py-2.5 bg-panel-bg border border-white/20 dark:border-white/10 rounded-xl hover:bg-hover-bg/80 transition-all duration-300 font-bold text-text shadow-sm hover:shadow-md cursor-pointer">{t('back')}</button>
            </div>
          ) : (
            <div className={`absolute inset-0 z-50 flex items-center justify-center w-full bg-bg transition-all duration-500 ease-in-out ${isHome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <div className={`relative z-10 flex flex-col items-center justify-center w-full p-8 transition-transform duration-500 ease-in-out ${isHome ? 'scale-100' : 'scale-[1.02]'}`}>
                <h2 className="text-6xl font-black flex items-center justify-center gap-4 mb-12 animate-fade-in-up text-accent tracking-tight">
                  <Icon name="Leaf" size={60} /> 
                  <span className="flex items-start gap-3">
                    Taxon
                    <span className="text-xs font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-lg border border-accent/20 uppercase tracking-widest mt-2">Beta</span>
                  </span>
                </h2>
                <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl mb-8">
                  <HomeButton 
                    onClick={() => {
                      setAppMode('identify');
                      if (keyData) {
                        setIsHome(false);
                      } else {
                        combinedFileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverHomeButton('identify'); }}
                    onDragLeave={() => setDragOverHomeButton(null)}
                    onDrop={(e) => handleHomeDrop(e, 'identify')}
                    isDragOver={dragOverHomeButton === 'identify'}
                    icon="FolderOpen"
                    title={t('startOpenKey')}
                    desc={t('startOpenKeyDesc')}
                  />
                  
                  <HomeButton 
                    onClick={() => {
                      setAppMode('build');
                      if (draftKeyData) {
                        setIsHome(false);
                      } else if (currentDraftRef.current) {
                        setDraftKeyData(currentDraftRef.current);
                        setIsHome(false);
                      } else {
                        setDraftKeyData(undefined);
                      setBuildChatHistory([]);
                        setIsHome(false);
                      }
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverHomeButton('build'); }}
                    onDragLeave={() => setDragOverHomeButton(null)}
                    onDrop={(e) => handleHomeDrop(e, 'build')}
                    isDragOver={dragOverHomeButton === 'build'}
                    icon="PenTool"
                    title={t('startCreateKey')}
                    desc={t('startCreateKeyDesc')}
                  />
                </div>
                <button 
                  onClick={() => setModalState({ type: 'preferences' })}
                  className="p-3 rounded-full bg-panel-bg transition-all cursor-pointer text-gray-500 hover:text-accent shadow-sm border border-transparent dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-md"
                  title={t('preferences')}
                >
                  <Icon name="Settings2" size={24} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- AI Panel --- */}
        {!hideAi && (
        <>
          {/* Mobile AI Panel Backdrop */}
          {isAiPanelVisible && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setAiPanelVisible(false)} />
          )}
          <div
            className="shrink-0 flex items-stretch absolute md:relative right-0 z-40 h-full max-w-[100vw]"
            style={{
              width: isAiPanelVisible ? `${aiPanelWidth}px` : '0px', transition: isActivelyResizing ? 'none' : 'width 300ms ease-in-out'
            }}
          >
            <div
            onMouseDown={handleAiPanelMouseDown}
            onTouchStart={handleAiPanelMouseDown}
            onDoubleClick={() => setAiPanelWidth && setAiPanelWidth(450)}
            className={`absolute -left-4 top-4 bottom-4 z-20 w-4 cursor-col-resize items-center justify-center group ${!isAiPanelVisible ? 'hidden' : 'hidden md:flex'}`}
            title={`${t('resizePanel')} ${t('doubleClickToReset' as any)}`}
          >
            <div className={`w-1 h-full rounded-full transition-all duration-300 ${isActivelyResizing ? 'bg-accent shadow-md scale-x-150' : 'bg-transparent group-hover:bg-accent/50 group-hover:scale-x-150'}`}></div>
          </div>
          <div className={`ai-panel-wrapper grow min-w-0 h-full transition-all duration-300 ${isAiPanelVisible ? 'p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-0 md:py-4 md:pr-4' : 'p-0 overflow-hidden'}`}>
            <AIAssistant
              isVisible={isAiPanelVisible}
              onClose={() => setAiPanelVisible(false)}
              keyData={keyData}
              onEntityClick={(id) => setModalState({ type: 'entity', entityId: id })}
              onImageClick={(url) => handleOpenLightbox([{ url }], 0)}
              t={t}
              lang={lang}
              chatHistory={appMode === 'identify' ? identifyChatHistory : buildChatHistory}
              geminiApiKey={geminiApiKey}
              setChatHistory={appMode === 'identify' ? setIdentifyChatHistory : setBuildChatHistory}
              appMode={appMode}
              getCurrentDraft={() => currentDraftRef.current}
            />
          </div>
          </div>
        </>
        )}
      </div>
      <div className="fixed md:bottom-6 bottom-24 left-0 right-0 z-100 flex flex-col items-center gap-2 pointer-events-none px-4 md:px-0">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} onClose={() => handleCloseToast(toast.id)} />
        ))}
      </div>
    </div>
    </AppProvider>
  );
};

export default App;
