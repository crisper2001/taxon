import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { KeyData, ChosenFeature, ModalState, Entity, Feature, FeatureNode, Media, Score, StateScore, NumericScore, GeminiResponse, RawChatMessage, EntityNode } from './types';
import { LucidKeyParser } from './services/LucidKeyParserService';
import { FeaturesPanel, EntitiesPanel, ChosenFeaturesPanel } from './components/panels';
import { AIAssistant } from './components/AIAssistant';
import { ResizablePanels } from './components/panels/ResizablePanels';
import { EntityModal, PreferencesModal, KeyInfoModal, FeatureImageModal, ImageLightboxModal } from './components/modals';
import { Icon } from './components/Icon';
import { translations } from './constants';
import Spot from './components/Spot';
type Language = 'en' | 'pt-br' | 'es' | 'ru' | 'zh' | 'ja' | 'fr' | 'de' | 'la' | 'it';
type Theme = 'light' | 'dark';

// --- Custom Hook for Resizable Panel ---
const useResizablePanel = (initialWidth: number, minWidth: number, maxWidth: number, isVisible: boolean) => {
  const [width, setWidth] = useState(initialWidth);
  const isResizing = useRef(false);
  const dragOffset = useRef(0);
  const [isActivelyResizing, setIsActivelyResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsActivelyResizing(true);
    dragOffset.current = e.clientX - (window.innerWidth - width);
  }, [width]); // Added width dependency

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    setIsActivelyResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    requestAnimationFrame(() => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - (e.clientX - dragOffset.current);
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    });
  }, [minWidth, maxWidth, dragOffset]); // Added dragOffset dependency

  useEffect(() => {
    if (!isVisible) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isVisible, handleMouseMove, handleMouseUp]);

  return { width, isActivelyResizing, handleMouseDown };
};

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [keyData, setKeyData] = useState<KeyData | null>(null);
  const [chosenFeatures, setChosenFeatures] = useState<Map<string, ChosenFeature>>(new Map());

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isAiPanelVisible, setAiPanelVisible] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [underlyingModalState, setUnderlyingModalState] = useState<ModalState | null>(null);
  const [expandedRemainingNodes, setExpandedRemainingNodes] = useState(new Set<string>());
  const [expandedDiscardedNodes, setExpandedDiscardedNodes] = useState(new Set<string>());
  const [aiChatHistory, setAiChatHistory] = useState<RawChatMessage[]>([]);
  const [modalSections, setModalSections] = useState({ hierarchy: true, features: true });

  // AI Panel Resizing State
  const MIN_AI_PANEL_WIDTH = 320;
  const MAX_AI_PANEL_WIDTH = 900;
  const { width: aiPanelWidth, isActivelyResizing, handleMouseDown: handleAiPanelMouseDown } = useResizablePanel(450, MIN_AI_PANEL_WIDTH, MAX_AI_PANEL_WIDTH, isAiPanelVisible);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DERIVED STATE & MEMOS ---
  const { directMatches, indirectMatches, discardedEntityIds, directlyDiscarded } = useMemo(() => {
    if (!keyData) {
      return { directMatches: new Set<string>(), indirectMatches: new Set<string>(), discardedEntityIds: new Set<string>(), directlyDiscarded: new Set<string>() };
    }
    
    const allEntityIds = new Set(keyData.allEntities.keys());

    if (chosenFeatures.size === 0) {
      // Nothing is discarded when no features are chosen
      return { directMatches: allEntityIds, indirectMatches: new Set<string>(), discardedEntityIds: new Set<string>(), directlyDiscarded: new Set<string>() };
    }

    const directlyDiscarded = new Set<string>();

    // 1. Determine which entities are directly discarded by a feature mismatch.
    for (const entityId of allEntityIds) {
      for (const [featureId, choice] of chosenFeatures.entries()) {
        const feature = keyData.allFeatures.get(featureId);
        if (!feature) continue;

        const scores = keyData.entityScores.get(entityId);
        const score = scores?.get(featureId);

        // An entity is mismatched if it has no score for the chosen feature,
        // or if the score doesn't align with the choice.
        const isMismatch = !score ||
          (feature.type === 'state' && (score as StateScore).value === '0') ||
          (feature.type === 'numeric' && (
            isNaN(parseFloat(String(choice.value))) || parseFloat(String(choice.value)) < (score as NumericScore).min || parseFloat(String(choice.value)) > (score as NumericScore).max
          ));

        if (isMismatch) {
          // This entity has a direct mismatch. Mark it and move to the next entity.
          directlyDiscarded.add(entityId as string);
          break; // No need to check other features for this entity
        }
      }
    }

    // 2. Direct matches are all entities that are NOT directly discarded.
    const directMatches = new Set([...allEntityIds].filter(id => !directlyDiscarded.has(id as string)));

    // 3. Calculate indirect matches (parents of remaining entities).
    const indirectMatches = new Set<string>();
    const remainingIds = new Set(directMatches);

    const buildIndirectHierarchy = (nodes: EntityNode[]) => {
      let changedInLoop = false;
      nodes.forEach(node => {
        if (node.isGroup && !remainingIds.has(node.id)) {
          const hasMatchingChild = node.children.some(child => remainingIds.has(child.id));
          if (hasMatchingChild) {
            indirectMatches.add(node.id);
            remainingIds.add(node.id);
            changedInLoop = true;
          }
        }
      });
      return changedInLoop;
    };
    
    // Iteratively build up the hierarchy from children to parents
    while(buildIndirectHierarchy(keyData.entityTree));


    // 4. Total discarded entities are everyone not in the final remaining set.
    const discardedEntityIds = new Set([...allEntityIds].filter(id => !remainingIds.has(id)));

    return { directMatches, indirectMatches, discardedEntityIds, directlyDiscarded };
  }, [keyData, chosenFeatures]);


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
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    const accentColor = theme === 'light' ? '#007bff' : '#3498db';
    const accentHoverColor = theme === 'light' ? '#0056b3' : '#217dbb';
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--accent-hover-color', accentHoverColor);
  }, [theme]);

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
        setError(err.message);
      } else {
        setError('Failed to process key file.');
      }
      console.error("Error processing key file:", err);
    } finally {
      setIsLoading(false);
      if (event.target) {
        event.target.value = ''; // Allow re-selecting the same file
      }
    }
  };

  const updateFeature = (id: string, value: string | boolean | number, isNumeric = false) => {
    setChosenFeatures(prevMap => {
      const newMap = new Map(prevMap);

      // Handle state features (booleans from checkboxes)
      if (!isNumeric) {
        if (value) {
            newMap.set(id, { value: true }); // Store boolean for state features
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

  const handlePreferenceChange = (key: 'lang' | 'theme' | 'geminiApiKey', value: string) => {
    if (key === 'lang') {
      const newLang = value as Language;
      setLang(newLang);
      localStorage.setItem('userLanguage', newLang);
    } else if (key === 'theme') {
      const newTheme = value as Theme;
      setTheme(newTheme);
      localStorage.setItem('userTheme', newTheme);
    } else if (key === 'geminiApiKey') {
      setGeminiApiKey(value);
      localStorage.setItem('geminiApiKey', value);
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

  const filterEntityTree = (nodes: EntityNode[], allowedIds: Set<string>, directIds: Set<string>, directlyDiscarded?: Set<string>): EntityNode[] => {
    const result: EntityNode[] = [];
    for (const node of nodes) {
        if (allowedIds.has(node.id)) {
            const children = node.isGroup ? filterEntityTree(node.children, allowedIds, directIds, directlyDiscarded) : [];
            // A group node is only kept if it's a direct match or has children in the filtered set.
            if (node.isGroup && children.length === 0 && !directIds.has(node.id)) {
                continue;
            }
            result.push({ ...node, children });
        } else if (node.isGroup) {
            // A discarded group node is kept if it has children that need to be shown.
            const children = filterEntityTree(node.children, allowedIds, directIds, directlyDiscarded);
            if (children.length > 0) {
                const isSelfDiscarded = directlyDiscarded?.has(node.id) ?? false;
                result.push({ ...node, children, isDimmed: !isSelfDiscarded });
            }
        }
    }
    return result;
  };  

  return (
    <div className={`main-container font-sans bg-bg text-text transition-colors duration-300 overflow-hidden ${isActivelyResizing ? 'select-none cursor-col-resize' : ''}`}>
      {/* --- Modals --- */}
      <EntityModal
        isOpen={modalState.type === 'entity'}
        onClose={handleModalClose}
        entityId={(modalState as any).entityId}
        keyData={keyData}
        t={t}
        onImageClick={handleOpenLightbox}
        sections={modalSections}
        setSections={setModalSections}
      />
      <PreferencesModal isOpen={modalState.type === 'preferences'} onClose={() => setModalState({ type: 'none' })} currentPrefs={{ lang, theme, geminiApiKey }} onPreferenceChange={handlePreferenceChange} t={t} availableLanguages={Object.keys(translations) as Language[]} />
      <KeyInfoModal isOpen={modalState.type === 'keyInfo'} onClose={() => setModalState({ type: 'none' })} keyData={keyData} t={t} />
      <FeatureImageModal isOpen={modalState.type === 'featureImage'} onClose={handleModalClose} featureId={(modalState as any).featureId} keyData={keyData} t={t} onImageClick={handleOpenLightbox} />
      <ImageLightboxModal isOpen={modalState.type === 'lightbox'} onClose={handleModalClose} media={(modalState as any).media} startIndex={(modalState as any).startIndex ?? 0} />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".zip"
      />

      {/* --- Sidebar --- */}
      <div id="sidebar" className={`fixed top-0 left-0 h-full z-30 w-60 bg-panel-bg border-r border-border p-4 flex flex-col gap-4 shadow-lg transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Header/Branding */}
        <div className="pb-3 flex items-center justify-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Icon name="Leaf" /> Taxon
          </h2>
        </div>

        {/* Key Management Actions */}
        <div className="flex flex-col gap-1 text-sm font-medium">
          <button disabled className="flex items-center gap-3 w-full p-3 text-left rounded-md hover:bg-hover-bg disabled:text-gray-500 disabled:cursor-not-allowed transition-colors cursor-pointer">
            <Icon name="FolderOpen" /> {t('openNativeKey')}
          </button>
          <button onClick={() => { fileInputRef.current?.click(); }} className="flex items-center gap-3 w-full p-3 text-left rounded-md hover:bg-hover-bg transition-colors cursor-pointer">
            <Icon name="FileJson" /> {t('importKey')}
          </button>

          <button onClick={() => {
            if (keyData && confirm(t('confirmReset'))) {
              resetKey();
            }
          }}
            disabled={!keyData}
            className="flex items-center gap-3 w-full p-3 text-left rounded-md hover:bg-hover-bg disabled:text-gray-500 disabled:cursor-not-allowed transition-colors cursor-pointer">
            <Icon name="RotateCcw" /> {t('resetKey')}
          </button>
        </div>

        {/* Settings & Info (Pushed to bottom) */}
        <div className="mt-auto flex flex-col gap-1 pt-4 text-sm font-medium">
          <button onClick={() => { setModalState({ type: 'preferences' }); }} className="flex items-center gap-3 w-full p-3 text-left rounded-md hover:bg-hover-bg transition-colors cursor-pointer">
            <Icon name="Settings2" /> {t('preferences')}
          </button>
        </div>
      </div>

      <div className={`content-wrapper flex grow h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-60' : 'ml-0'}`}>
        <div className="page-content grow flex flex-col h-full min-w-0 overflow-hidden">
          {/* --- Header --- */}
          {keyData && (
            <div className="header-controls flex items-center p-2 bg-panel-bg border-b border-border gap-4 shrink-0 justify-between">
              <button onClick={() => setSidebarOpen(!isSidebarOpen)} title={t('toggleMenu')} className="p-2 rounded-md hover:bg-hover-bg cursor-pointer"><Icon name={isSidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} /></button>
              <button id="status-display" onClick={() => keyData && setModalState({ type: 'keyInfo' })} disabled={!keyData || isLoading || !!error} className="text-center italic text-gray-500 disabled:cursor-default enabled:cursor-pointer enabled:not-italic enabled:font-medium enabled:text-text p-1 rounded-md hover:enabled:bg-hover-bg">
                {statusText}
              </button>
              <button onClick={() => setAiPanelVisible(true)} disabled={isAiPanelVisible} title={isAiPanelVisible ? undefined : t('assistant')} aria-hidden={isAiPanelVisible} className={`p-2 rounded-md transition-opacity duration-300 ${isAiPanelVisible ? 'opacity-0 pointer-events-none' : 'hover:bg-hover-bg cursor-pointer'}`}>
                {/* <Icon name="Sparkles" /> */}
                <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="head" className="w-7 text-accent" />
              </button>
            </div>
          )}

          {/* --- Main Panels --- */}
          {keyData ? (
            <ResizablePanels>
              <FeaturesPanel keyData={keyData} chosenFeatures={chosenFeatures} onFeatureChange={updateFeature} onImageClick={(id) => setModalState({ type: 'featureImage', featureId: id })} t={t} />
              <EntitiesPanel
                title={t('entitiesRemaining')}
                icon="List"
                count={directMatches.size}                
                entityTree={filterEntityTree(keyData.entityTree, new Set([...directMatches, ...indirectMatches]), directMatches)}
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
                icon="ListX" entityTree={filterEntityTree(keyData.entityTree, discardedEntityIds, new Set(), directlyDiscarded)}
                mediaMap={keyData.entityMedia} onEntityClick={(id) => setModalState({ type: 'entity', entityId: id })}
                t={t}
                expandedNodes={expandedDiscardedNodes}
                setExpandedNodes={setExpandedDiscardedNodes} />
            </ResizablePanels>
          ) : (
            <div className="grow flex flex-col items-center justify-center p-4 text-center">
              {isLoading ? (
                <span className="animate-pulse">{statusText}</span>
              ) : error ? (
                <span className="text-red-500">{statusText}</span>
              ) : (
                <>
                  <h2 className="text-6xl font-bold flex items-center justify-center gap-3 mb-8 animate-fade-in-up">
                    <Icon name="Leaf" size={60} /> Taxon
                  </h2>
                  <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-4 p-8 rounded-lg hover:bg-hover-bg transition-colors cursor-pointer border-2 border-dashed border-border">
                    <Icon name="FolderOpen" size={48} className="text-accent" />
                    <span className="text-lg font-medium text-text">{t('importKey')}</span>
                    <span className="text-sm text-gray-500">{t('loadKeyPrompt')}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* --- AI Panel --- */}
        <div
          className="shrink-0 flex items-stretch"
          style={{
            width: isAiPanelVisible ? `${aiPanelWidth}px` : '0px', transition: isActivelyResizing ? 'none' : 'width 300ms ease-in-out'
          }}
        >
          <div
            onMouseDown={handleAiPanelMouseDown}
            className={`w-1 cursor-col-resize transition-colors duration-200 ease-in-out shrink-0 hover:bg-accent ${isActivelyResizing ? 'bg-accent' : ''} ${!isAiPanelVisible ? 'hidden' : ''}`}
            title="Resize Panel"
          ></div>
          <div className="ai-panel-wrapper grow overflow-hidden">
            <AIAssistant
              isVisible={isAiPanelVisible}
              onClose={() => setAiPanelVisible(false)}
              keyData={keyData}
              onEntityClick={(id) => setModalState({ type: 'entity', entityId: id })}
              t={t}
              chatHistory={aiChatHistory}
              geminiApiKey={geminiApiKey}
              setChatHistory={setAiChatHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
