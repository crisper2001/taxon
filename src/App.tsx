import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { KeyData, ChosenFeature, ModalState, Media, RawChatMessage, DraftKeyData } from './types';
import { LucidKeyParser } from './services/LucidKeyParserService';
import { FeaturesPanel, EntitiesPanel, ChosenFeaturesPanel } from './components/panels';
import { AIAssistant } from './components/AIAssistant';
import { ResizablePanels } from './components/panels/ResizablePanels';
import { EntityModal, PreferencesModal, KeyInfoModal, FeatureImageModal, ImageLightboxModal, ConfirmModal } from './components/modals';
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

type Language = 'en' | 'pt-br' | 'es' | 'ru' | 'zh' | 'ja' | 'fr' | 'de' | 'la' | 'it';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [keyData, setKeyData] = useState<KeyData | null>(null);
  const [chosenFeatures, setChosenFeatures] = useState<Map<string, ChosenFeature>>(new Map());
  const [appMode, setAppMode] = useState<'identify' | 'build'>('identify');
  const [draftKeyData, setDraftKeyData] = useState<DraftKeyData | undefined>(undefined);

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
  const [aiChatHistory, setAiChatHistory] = useState<RawChatMessage[]>([]);
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const combinedFileInputRef = useRef<HTMLInputElement>(null);
  const currentDraftRef = useRef<DraftKeyData | null>(null);

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
  }, [theme]);

  useEffect(() => {
    setAiPanelVisible(false);
  }, [appMode]);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setKeyData(null);
    resetKey();
    setAiChatHistory([]);

    try {
      const parser = new LucidKeyParser();
      const data = await parser.processKeyFromZip(file);
      setKeyData(data);
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
      if (event.target) {
        event.target.value = ''; // Allow re-selecting the same file
      }
    }
  };

  const handleJsonFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as DraftKeyData;
      if (data.title !== undefined && Array.isArray(data.features) && Array.isArray(data.entities)) {
        setDraftKeyData(data);
        if (appMode === 'identify') {
          const parser = new LucidKeyParser();
          const loadedKeyData = parser.processDraftKey(data);
          setKeyData(loadedKeyData);
          resetKey();
          setAiChatHistory([]);
        }
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
      if (event.target) {
        event.target.value = '';
      }
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
    if (modalState.type === 'lightbox' && underlyingModalState) {
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
    triggerImport: () => fileInputRef.current?.click(),
    triggerOpenNativeKey: () => jsonFileInputRef.current?.click(),
    resetKey: handleReset,
    openPreferences: () => setModalState({ type: 'preferences' }),
    openKeyInfo: () => keyData && setModalState({ type: 'keyInfo' }),
    hideAi,
  };

  return (
    <AppProvider value={contextValue}>
    <div className={`main-container font-sans bg-bg text-text transition-colors duration-300 overflow-hidden ${isActivelyResizing ? 'select-none cursor-col-resize' : ''}`}>
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
      <style>{`
        .text-accent:not([class*="bg-"]) svg[stroke="currentColor"],
        .text-accent:not([class*="bg-"]) svg *[stroke="currentColor"],
        svg.text-accent:not([class*="bg-"])[stroke="currentColor"],
        svg.text-accent:not([class*="bg-"]) *[stroke="currentColor"],
        .hover\\:text-accent:not([class*="bg-"]):hover svg[stroke="currentColor"],
        .hover\\:text-accent:not([class*="bg-"]):hover svg *[stroke="currentColor"],
        .group:hover .group-hover\\:text-accent:not([class*="bg-"]) svg[stroke="currentColor"],
        .group:hover .group-hover\\:text-accent:not([class*="bg-"]) svg *[stroke="currentColor"] {
          stroke: url(#accent-gradient) !important;
        }
        
        .text-accent:not([class*="bg-"]) svg[fill="currentColor"],
        .text-accent:not([class*="bg-"]) svg *[fill="currentColor"],
        svg.text-accent:not([class*="bg-"])[fill="currentColor"],
        svg.text-accent:not([class*="bg-"]) *[fill="currentColor"],
        .hover\\:text-accent:not([class*="bg-"]):hover svg[fill="currentColor"],
        .hover\\:text-accent:not([class*="bg-"]):hover svg *[fill="currentColor"],
        .group:hover .group-hover\\:text-accent:not([class*="bg-"]) svg[fill="currentColor"],
        .group:hover .group-hover\\:text-accent:not([class*="bg-"]) svg *[fill="currentColor"] {
          fill: url(#accent-gradient) !important;
        }

        .text-red-500:not([class*="bg-"]) svg[stroke="currentColor"],
        .text-red-500:not([class*="bg-"]) svg *[stroke="currentColor"],
        svg.text-red-500:not([class*="bg-"])[stroke="currentColor"],
        svg.text-red-500:not([class*="bg-"]) *[stroke="currentColor"],
        .hover\\:text-red-500:not([class*="bg-"]):hover svg[stroke="currentColor"],
        .hover\\:text-red-500:not([class*="bg-"]):hover svg *[stroke="currentColor"],
        .group:hover .group-hover\\:text-red-500:not([class*="bg-"]) svg[stroke="currentColor"],
        .group:hover .group-hover\\:text-red-500:not([class*="bg-"]) svg *[stroke="currentColor"] {
          stroke: url(#red-gradient) !important;
        }
        
        .text-red-500:not([class*="bg-"]) svg[fill="currentColor"],
        .text-red-500:not([class*="bg-"]) svg *[fill="currentColor"],
        svg.text-red-500:not([class*="bg-"])[fill="currentColor"],
        svg.text-red-500:not([class*="bg-"]) *[fill="currentColor"],
        .hover\\:text-red-500:not([class*="bg-"]):hover svg[fill="currentColor"],
        .hover\\:text-red-500:not([class*="bg-"]):hover svg *[fill="currentColor"],
        .group:hover .group-hover\\:text-red-500:not([class*="bg-"]) svg[fill="currentColor"],
        .group:hover .group-hover\\:text-red-500:not([class*="bg-"]) svg *[fill="currentColor"] {
          fill: url(#red-gradient) !important;
        }
      `}</style>

      {/* --- Modals --- */}
      <EntityModal
        isOpen={modalState.type === 'entity'}
        onClose={handleModalClose}
        entityId={(modalState as any).entityId}
        keyData={keyData}
        t={t}
        onImageClick={handleOpenLightbox}
      />
      <PreferencesModal isOpen={modalState.type === 'preferences'} onClose={() => setModalState({ type: 'none' })} currentPrefs={{ lang, theme, geminiApiKey, showToasts, hideAi }} onPreferenceChange={handlePreferenceChange} t={t} availableLanguages={Object.keys(translations) as Language[]} />
      <KeyInfoModal isOpen={modalState.type === 'keyInfo'} onClose={() => setModalState({ type: 'none' })} keyData={keyData} t={t} />
      <FeatureImageModal isOpen={modalState.type === 'featureImage'} onClose={handleModalClose} featureId={(modalState as any).featureId} keyData={keyData} t={t} onImageClick={handleOpenLightbox} />
      <ImageLightboxModal isOpen={modalState.type === 'lightbox'} onClose={handleModalClose} media={(modalState as any).media} startIndex={(modalState as any).startIndex ?? 0} />

      <ConfirmModal
        isOpen={modalState.type === 'confirmClear'}
        onClose={handleModalClose}
        onConfirm={executeReset}
        title={t('clearFeatures')}
        message={t('confirmClear')}
        confirmText={t('clearFeatures')}
        cancelText={t('cancel')}
        isDestructive={true}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".zip"
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
      />

      <div className={`content-wrapper flex grow h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-60' : 'ml-0'}`}>
        <div className="page-content grow flex flex-col h-full min-w-0 overflow-hidden">
          {/* --- Header --- */}
          {appMode === 'identify' && keyData && (
            <Header isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
          )}

          {/* --- Main Panels --- */}
          {appMode === 'build' ? (
            <div className="flex grow min-h-0 bg-bg animate-fade-in relative z-10">
              <KeyBuilder 
                onExit={() => {
                  if (currentDraftRef.current) setDraftKeyData(currentDraftRef.current);
                  setAppMode('identify');
                }} 
                initialData={draftKeyData} 
                onChange={(draft) => currentDraftRef.current = draft} 
                onTestKey={(draft) => {
                  const parser = new LucidKeyParser();
                  setKeyData(parser.processDraftKey(draft));
                  resetKey(); setAiChatHistory([]);
                  setDraftKeyData(draft);
                  setAppMode('identify');
                }}
              />
            </div>
          ) : keyData ? (
            <ResizablePanels>
              <FeaturesPanel keyData={keyData} chosenFeatures={chosenFeatures} onFeatureChange={updateFeature} onImageClick={(id) => setModalState({ type: 'featureImage', featureId: id })} t={t} />
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
              <ChosenFeaturesPanel chosenFeatures={chosenFeatures} keyData={keyData} onFeatureChange={updateFeature} onImageClick={(id) => setModalState({ type: 'featureImage', featureId: id })} t={t} />
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
          ) : (
            <div className="flex grow flex-col items-center justify-center bg-bg p-8 animate-fade-in relative">
              <button 
                onClick={() => setModalState({ type: 'preferences' })}
                className="absolute top-6 right-6 p-3 rounded-full bg-panel-bg border border-border shadow-sm hover:shadow-md hover:bg-hover-bg transition-all cursor-pointer text-gray-500 hover:text-accent"
                title={t('preferences')}
              >
                <Icon name="Settings2" size={24} />
              </button>
              <h2 className="text-6xl font-black flex items-center justify-center gap-4 mb-12 animate-fade-in-up text-accent tracking-tight">
                <Icon name="Leaf" size={60} /> Taxon
              </h2>
              <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
                <button 
                  onClick={() => combinedFileInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center gap-4 p-8 bg-panel-bg border border-border rounded-3xl hover:border-accent hover:shadow-lg transition-all group cursor-pointer"
                >
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <Icon name="FolderOpen" size={32} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-text mb-2">{t('startOpenKey')}</h3>
                    <p className="text-sm text-gray-500">{t('startOpenKeyDesc')}</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    setDraftKeyData(undefined);
                    setAppMode('build');
                  }}
                  className="flex-1 flex flex-col items-center gap-4 p-8 bg-panel-bg border border-border rounded-3xl hover:border-accent hover:shadow-lg transition-all group cursor-pointer"
                >
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <Icon name="PenTool" size={32} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-text mb-2">{t('startCreateKey')}</h3>
                    <p className="text-sm text-gray-500">{t('startCreateKeyDesc')}</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- AI Panel --- */}
        {!hideAi && (
        <div
          className="shrink-0 flex items-stretch relative"
          style={{
            width: isAiPanelVisible ? `${aiPanelWidth}px` : '0px', transition: isActivelyResizing ? 'none' : 'width 300ms ease-in-out'
          }}
        >
          <div
            onMouseDown={handleAiPanelMouseDown}
            onDoubleClick={() => setAiPanelWidth && setAiPanelWidth(450)}
            className={`absolute left-0 top-0 bottom-0 z-20 w-3 -ml-1.5 cursor-col-resize flex items-center justify-center group ${!isAiPanelVisible ? 'hidden' : ''}`}
            title={`${t('resizePanel')} (Double-click to reset)`}
          >
            <div className={`w-1 h-full transition-all duration-300 ${isActivelyResizing ? 'bg-accent shadow-md shadow-accent/50 scale-x-150' : 'bg-transparent group-hover:bg-accent/50 group-hover:scale-x-150'}`}></div>
          </div>
          <div className="ai-panel-wrapper grow">
            <AIAssistant
              isVisible={isAiPanelVisible}
              onClose={() => setAiPanelVisible(false)}
              keyData={keyData}
              onEntityClick={(id) => setModalState({ type: 'entity', entityId: id })}
              onImageClick={(url) => handleOpenLightbox([{ url }], 0)}
              t={t}
              lang={lang}
              chatHistory={aiChatHistory}
              geminiApiKey={geminiApiKey}
              setChatHistory={setAiChatHistory}
              appMode={appMode}
              getCurrentDraft={() => currentDraftRef.current}
            />
          </div>
        </div>
        )}
      </div>
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} onClose={() => handleCloseToast(toast.id)} />
        ))}
      </div>
    </div>
    </AppProvider>
  );
};

export default App;
