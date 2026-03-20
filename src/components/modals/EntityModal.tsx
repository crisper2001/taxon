import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from './Modal';
import { Icon } from '../Icon';
import { ImageViewer } from '../common/ImageViewer';
import type { KeyData, Media, ScoreType, Characteristic, IconName, EntityNode } from '../../types';
import { translations } from '../../constants';
import { marked } from 'marked';

interface GroupNode {
  name: string;
  path: string;
  subgroups: Record<string, GroupNode>;
  chars: Characteristic[];
}

const RenderFeatureGroup: React.FC<{
  node: GroupNode;
  collapsedGroups: Set<string>;
  toggleGroup: (path: string) => void;
  getIconForChar: (char: Characteristic) => React.ReactElement;
  getBadge: (char: { type: string, score?: ScoreType }) => React.ReactElement;
}> = ({ node, collapsedGroups, toggleGroup, getIconForChar, getBadge }) => {
  const sortedSubgroups = Object.values(node.subgroups).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const sortedChars = [...node.chars].sort((a, b) => a.text.localeCompare(b.text, undefined, { numeric: true }));

  return (
    <>
      {sortedSubgroups.map(subgroup => {
        const isCollapsed = collapsedGroups.has(subgroup.path);
        return (
          <div key={subgroup.path} className="mb-2 pl-2">
            <button 
              onClick={() => toggleGroup(subgroup.path)} 
              className="w-full text-left font-bold text-gray-500 flex items-center mb-1.5 text-sm bg-panel-bg/80 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-hover-bg/80 transition-all py-2 px-3 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 gap-2"
            >
              <span className="shrink-0 flex items-center justify-center">
                <Icon name="ChevronRight" size={16} className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
              </span>
              <span className="text-text break-words min-w-0">{subgroup.name}</span>
            </button>
            {!isCollapsed && (
              <div className="border-l-2 border-border/50 ml-3.5 mb-3">
                <RenderFeatureGroup 
                  node={subgroup} 
                  collapsedGroups={collapsedGroups} 
                  toggleGroup={toggleGroup} 
                  getIconForChar={getIconForChar} 
                  getBadge={getBadge} 
                />
              </div>
            )}
          </div>
        );
      })}
      {sortedChars.map((char, i) => (
        <div key={i} className="flex justify-between items-center py-2.5 border-b border-border text-sm ml-3 gap-3 pr-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 flex items-center justify-center">{getIconForChar(char)}</span>
            <span className="break-words min-w-0">{char.text}</span>
          </div>
          {getBadge(char)}
        </div>
      ))}
    </>
  );
};

// --- EntityModal ---
interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  keyData: KeyData | null;
  t: (key: keyof typeof translations['en']) => string;
  onImageClick: (media: Media[], startIndex: number) => void;
}

export const EntityModal: React.FC<EntityModalProps> = ({ isOpen, onClose, entityId, keyData, t, onImageClick }) => {
  const [activeEntityId, setActiveEntityId] = useState(entityId);
  const [isCopied, setIsCopied] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const detailsRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileTab, setMobileTab] = useState<'image' | 'details' | 'features'>('image');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  // Cache the entityId when the modal opens to prevent content disappearing during close animation
  useEffect(() => {
    if (isOpen) {
      setActiveEntityId(entityId);
      setNavigationHistory([]); // Reset history when modal is opened from outside
      setCollapsedGroups(new Set());
      setMobileTab('image'); // Reset tab on open
    }
    setIsCopied(false); // Reset copied state when modal opens/closes
  }, [isOpen, entityId]);

  // Reset scroll position when navigating between different entities within the hierarchy
  useEffect(() => {
    if (isOpen) {
      setShowBackToTop(false);
      document.querySelectorAll('.entity-modal-panel, .entity-modal-desktop-right-pane').forEach(el => el.scrollTop = 0);
    }
  }, [activeEntityId, isOpen]);

  const entity = keyData?.allEntities.get(activeEntityId);
  const media = keyData?.entityMedia.get(activeEntityId) || [];
  const profile = keyData?.entityProfiles.get(activeEntityId);

  const findEntityPath = (nodes: EntityNode[], targetId: string, path: EntityNode[] = []): EntityNode[] | null => {
    for (const node of nodes) {
      const currentPath = [...path, node];
      if (node.id === targetId) {
        return currentPath;
      }
      if (node.children && node.children.length > 0) {
        const foundPath = findEntityPath(node.children, targetId, currentPath);
        if (foundPath) return foundPath;
      }
    }
    return null;
  };

  const entityHierarchy = useMemo(() => (keyData && activeEntityId ? findEntityPath(keyData.entityTree, activeEntityId) : []) || [], [keyData, activeEntityId]);

  const featureTree = useMemo(() => {
    const root: GroupNode = { name: '', path: '', subgroups: {}, chars: [] };
    (profile?.characteristics || []).forEach(char => {
      const parts = char.parent.split(' > ');
      let current = root;
      let currentPath = '';
      
      parts.forEach(part => {
        currentPath = currentPath ? `${currentPath} > ${part}` : part;
        if (!current.subgroups[part]) {
          current.subgroups[part] = { name: part, path: currentPath, subgroups: {}, chars: [] };
        }
        current = current.subgroups[part];
      });
      
      current.chars.push(char);
    });
    return root;
  }, [profile?.characteristics]);

  const parsedDescription = profile?.description ? (marked.parse(profile.description) as string).replace(/<a (?![^>]*\btarget=)/g, '<a target="_blank" rel="noopener noreferrer" ') : '';

  if (!entity) return <Modal isOpen={isOpen} onClose={onClose} title={t('loading')}><div /></Modal>;

  const SCORE_VALUE_MAP: Record<ScoreType, keyof typeof translations['en']> = { '0': 'scoreUncertain', '1': 'scoreCommon', '2': 'scoreRare', '3': 'scoreUncertain', '4': 'scoreCommonMisinterpret', '5': 'scoreRareMisinterpret' };

  const getBadge = (char: { type: string, score?: ScoreType }) => {
    let badgeClass = 'bg-gray-400 text-white';
    let badgeTextKey: keyof typeof translations['en'] = 'scoreUncertain';

    if (char.type === 'numeric') {
      badgeClass = 'bg-gray-500 text-white';
      badgeTextKey = 'scoreInterval';
    } else if (char.score && SCORE_VALUE_MAP[char.score]) {
      badgeTextKey = SCORE_VALUE_MAP[char.score];
      switch (badgeTextKey) {
        case 'scoreCommon': badgeClass = 'bg-blue-500 text-white'; break;
        case 'scoreRare': badgeClass = 'bg-green-500 text-white'; break;
        case 'scoreUncertain': badgeClass = 'bg-black text-white'; break;
        case 'scoreCommonMisinterpret': badgeClass = 'bg-red-500 text-white'; break;
        case 'scoreRareMisinterpret': badgeClass = 'bg-yellow-400 text-black'; break;
      }
    }
    const badgeText = t(badgeTextKey);
    return <span className={`char-badge text-[11px] px-2.5 py-1 rounded-full font-bold shrink-0 whitespace-nowrap shadow-sm uppercase tracking-wider ${badgeClass}`}>{badgeText}</span>;
  }

  const getIconForChar = (char: Characteristic): React.ReactElement => {
    let iconName: IconName = 'Check';
    let iconClass = 'text-gray-400';

    if (char.type === 'numeric') {
      iconName = 'ArrowUpDown';
      iconClass = 'text-gray-500';
    } else if (char.score && SCORE_VALUE_MAP[char.score]) {
      const badgeTextKey = SCORE_VALUE_MAP[char.score];
      switch (badgeTextKey) {
        case 'scoreCommon': iconClass = 'text-blue-500'; break;
        case 'scoreRare': iconClass = 'text-green-500'; break;
        case 'scoreUncertain': return <span className="text-black text-lg w-[14px] h-[14px] flex items-center justify-center">?</span>;
        case 'scoreCommonMisinterpret': iconClass = 'text-red-500'; break;
        case 'scoreRareMisinterpret': iconClass = 'text-yellow-500'; break;
        default: iconName = 'CircleQuestionMark'; iconClass = 'text-gray-400';
      }
    }
    return <Icon name={iconName} size={14} className={iconClass} />;
  };

  const handleCopy = () => {
    if (!entity) return;
    navigator.clipboard.writeText(entity.name).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleNavigate = (newEntityId: string) => {
    setNavigationHistory(prev => [...prev, activeEntityId]);
    setActiveEntityId(newEntityId);
  };

  const handleBack = () => {
    if (navigationHistory.length > 0) {
      const previousId = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setActiveEntityId(previousId);
    }
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const handleExpandAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedGroups(new Set());
  };

  const handleCollapseAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allPaths = new Set<string>();
    const traverse = (node: GroupNode) => {
      if (node.path) allPaths.add(node.path);
      Object.values(node.subgroups).forEach(traverse);
    };
    traverse(featureTree);
    setCollapsedGroups(allPaths);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowBackToTop(e.currentTarget.scrollTop > 300);
  };

  const scrollToTop = () => {
    document.querySelectorAll('.entity-modal-panel, .entity-modal-desktop-right-pane').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const tabIndex = mobileTab === 'image' ? 0 : mobileTab === 'details' ? 1 : 2;

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsSwiping(false);
      setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStart.current.x;
      const deltaY = currentY - touchStart.current.y;

      if (!isSwiping) {
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
              setIsSwiping(true);
          } else if (Math.abs(deltaY) > 10) {
              touchStart.current = null;
              return;
          }
      }

      if (isSwiping) {
          let effectiveDelta = deltaX;
          if (mobileTab === 'image' && deltaX > 0) effectiveDelta *= 0.3;
          if (mobileTab === 'features' && deltaX < 0) effectiveDelta *= 0.3;
          setSwipeOffset(effectiveDelta);
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStart.current) {
          setIsSwiping(false);
          setSwipeOffset(0);
          return;
      }
      if (isSwiping) {
          const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
          if (deltaX < -50) {
              if (mobileTab === 'image') setMobileTab('details');
              else if (mobileTab === 'details') setMobileTab('features');
          } else if (deltaX > 50) {
              if (mobileTab === 'features') setMobileTab('details');
              else if (mobileTab === 'details') setMobileTab('image');
          }
      }
      setIsSwiping(false);
      setSwipeOffset(0);
      touchStart.current = null;
  };

  const modalTitle = (
    <div className="flex items-center gap-2 min-w-0">
      {navigationHistory.length > 0 && (
        <button onClick={handleBack} className="p-1.5 rounded-full hover:bg-hover-bg transition-colors border border-transparent hover:border-border hover:shadow-sm cursor-pointer" title={t('back')}><Icon name="ArrowLeft" size={20} /></button>
      )}
      <span>{entity.name}</span>
      <button onClick={handleCopy} className="text-gray-400 hover:text-accent hover:bg-hover-bg p-1.5 rounded-full transition-colors cursor-pointer" title={t('copy' as any)}><Icon name={isCopied ? 'Check' : 'Copy'} size={18} /></button>    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="flex flex-col h-[75vh] bg-bg/80 backdrop-blur-sm rounded-b-3xl overflow-hidden relative">
        <div className="flex md:contents flex-col grow min-h-0 overflow-hidden relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
           <div className={`entity-modal-mobile-view grow ${isSwiping ? 'is-swiping' : ''}`} style={{ '--mobile-tab-offset': `-${tabIndex * 100}%`, '--swipe-offset': `${swipeOffset}px` } as React.CSSProperties}>
              <ImageViewer
                media={media}
                altText={entity.name}
                noImageText={t('noImageAvailable')}
                onImageClick={onImageClick}
                className="entity-modal-panel is-image md:border-r border-white/10 dark:border-white/5 bg-panel-bg/50"
              />
              <div 
                ref={detailsRef}
                onScroll={handleScroll}
                className="entity-modal-desktop-right-pane md:bg-panel-bg/50"
              >
               <div className="entity-modal-panel is-details max-md:bg-panel-bg/50 flex flex-col" onScroll={handleScroll}>
                 {entityHierarchy.length > 1 && (
            <div className="mb-4 shrink-0 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner">
              <div className="w-full font-bold text-accent flex items-center gap-2 mb-3 text-left tracking-tight">
                <Icon name="Network" size={18} />
                <span className="grow text-base">{t('hierarchy')}</span>
              </div>
              <div className="flex flex-wrap items-center text-sm text-text opacity-90">
                {entityHierarchy.map((node, index) => {
                  const isLast = index === entityHierarchy.length - 1;
                  return (
                    <React.Fragment key={node.id}>
                      {isLast ? (
                        <span className="font-bold text-text">{node.name}</span>
                      ) : (
                        <button onClick={() => handleNavigate(node.id)} className="hover:underline hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-sm cursor-pointer">
                          {node.name}
                        </button>
                      )}
                      {!isLast && <Icon name="ChevronRight" size={16} className="mx-1 opacity-50" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
          {profile?.description && (
            <div className="mb-4 flex flex-col grow min-h-0 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner">
              <div className="w-full font-bold text-accent flex items-center gap-2 mb-3 text-left tracking-tight shrink-0">
                <Icon name="FileText" size={18} />
                <span className="grow text-base">{t('kbDescription')}</span>
              </div>
              <div 
                className="text-sm text-text opacity-90 leading-relaxed markdown-body md:max-h-[30vh] grow overflow-y-auto pr-2 [&>p]:mb-3 [&>p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-3 [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_a]:text-accent hover:[&_a]:text-accent-hover [&_h1]:font-bold [&_h1]:text-lg [&_h2]:font-bold [&_h3]:font-semibold break-words"
              dangerouslySetInnerHTML={{ __html: parsedDescription }}
              />
            </div>
                 )}
               </div>
               <div className="entity-modal-panel is-features max-md:bg-panel-bg/50 flex flex-col" onScroll={handleScroll}>
                 {(profile?.characteristics || []).length > 0 && (
            <div className="flex flex-col grow min-h-0 mb-4 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner">
              <div className="flex items-center w-full mb-3 shrink-0">
                <div className="grow font-bold text-accent flex items-center gap-2 text-left tracking-tight">
                  <Icon name="List" size={18} />
                  <span className="grow text-base">{t('features')}</span>
                </div>
                <div className="flex items-center gap-1 ml-2 text-xs font-semibold">
                  <button onClick={handleCollapseAll} className="flex items-center text-gray-500 hover:text-accent transition-colors py-1 px-2 rounded-lg hover:bg-hover-bg border border-transparent hover:border-border hover:shadow-sm cursor-pointer">
                    <Icon name="ChevronUp" size={14} className="mr-1" />
                    {t('collapseAll')}
                  </button>
                  <button onClick={handleExpandAll} className="flex items-center text-gray-500 hover:text-accent transition-colors py-1 px-2 rounded-lg hover:bg-hover-bg border border-transparent hover:border-border hover:shadow-sm cursor-pointer">
                    <Icon name="ChevronDown" size={14} className="mr-1" />
                    {t('expandAll')}
                  </button>
                </div>
              </div>
              <div className="grow overflow-y-auto pr-1 -mr-1">
                  <RenderFeatureGroup 
                    node={featureTree} 
                    collapsedGroups={collapsedGroups} 
                    toggleGroup={toggleGroup} 
                    getIconForChar={getIconForChar} 
                    getBadge={getBadge} 
                  />
              </div>
            </div>
                 )}
               </div>
              </div>
           </div>
        </div>

        {/* Mobile Bottom Bar for EntityModal */}
        <div className="flex md:hidden items-center justify-around bg-panel-bg/85 backdrop-blur-xl border border-white/20 dark:border-white/10 p-2 shrink-0 z-20 shadow-lg rounded-3xl m-2 mb-3">
            <button onClick={() => setMobileTab('image')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 ${mobileTab === 'image' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50'}`}>
              <Icon name="Image" size={22} />
              <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('preview')}</span>
            </button>
            <button onClick={() => setMobileTab('details')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 ${mobileTab === 'details' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50'}`}>
              <Icon name="FileText" size={22} />
              <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('kbDescription')}</span>
            </button>
            <button onClick={() => setMobileTab('features')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 ${mobileTab === 'features' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50'}`}>
              <Icon name="List" size={22} />
              <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('features')}</span>
            </button>
        </div>

        <button
          onClick={scrollToTop}
          className={`absolute md:bottom-6 bottom-20 right-8 p-3 bg-accent/95 backdrop-blur-md border border-white/20 text-white rounded-full shadow-lg shadow-accent/30 hover:bg-accent-hover transition-all duration-300 z-10 hover:-translate-y-0.5 ${showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}
        >
          <Icon name="ArrowUp" size={20} />
        </button>
      </div>
    </Modal>
  );
};
