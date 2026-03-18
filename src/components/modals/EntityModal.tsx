import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Icon } from '../Icon';
import { ImageViewer } from '../common/ImageViewer';
import type { KeyData, Media, ScoreType, Characteristic, IconName, EntityNode } from '../../types';
import { translations } from '../../constants';

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
              className="w-full text-left font-semibold text-gray-500 flex items-center mb-1 text-sm bg-panel-bg hover:bg-hover-bg transition-colors py-1 px-2 rounded-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 gap-1"
            >
              <span className="shrink-0 flex items-center justify-center">
                <Icon name="ChevronRight" size={16} className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
              </span>
              <span className="text-text break-words min-w-0">{subgroup.name}</span>
            </button>
            {!isCollapsed && (
              <div className="border-l border-border/50 ml-3">
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
        <div key={i} className="flex justify-between items-center py-2 border-b border-border text-sm ml-2 gap-2">
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

  // Cache the entityId when the modal opens to prevent content disappearing during close animation
  useEffect(() => {
    if (isOpen) {
      setActiveEntityId(entityId);
      setNavigationHistory([]); // Reset history when modal is opened from outside
      setCollapsedGroups(new Set());
    }
    setIsCopied(false); // Reset copied state when modal opens/closes
  }, [isOpen, entityId]);

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

  if (!entity) return <Modal isOpen={isOpen} onClose={onClose} title="Loading..."><div /></Modal>;

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
    return <span className={`char-badge text-xs px-2 py-0.5 rounded-full font-bold shrink-0 whitespace-nowrap ${badgeClass}`}>{badgeText}</span>;
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

  const modalTitle = (
    <div className="flex items-center gap-2 min-w-0">
      {navigationHistory.length > 0 && (
        <button onClick={handleBack} className="p-1 rounded-md hover:bg-hover-bg" title={t('back')}><Icon name="ArrowLeft" size={18} /></button>
      )}
      <span>{entity.name}</span>
      <button onClick={handleCopy} className="text-gray-400 hover:text-accent p-1 rounded-md" title={t('copy' as any)}><Icon name={isCopied ? 'Check' : 'Copy'} size={16} /></button>    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="flex flex-col md:flex-row h-[75vh]">
        <ImageViewer
          media={media}
          altText={entity.name}
          noImageText={t('noImageAvailable')}
          onImageClick={onImageClick}
          className="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r border-border overflow-y-auto min-h-0"
        />
        <div className="modal-details-viewer w-full md:w-1/2 p-4 flex flex-col min-h-0">
          {entityHierarchy.length > 1 && (
            <div className="mb-4 shrink-0">
              <div className="w-full font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2 text-left p-1">
                <Icon name="Network" size={16} />
                <span className="grow">{t('hierarchy')}</span>
              </div>
              <div className="flex flex-wrap items-center text-sm pl-2 text-gray-600 dark:text-gray-400 pt-2">
                {entityHierarchy.map((node, index) => {
                  const isLast = index === entityHierarchy.length - 1;
                  return (
                    <React.Fragment key={node.id}>
                      {isLast ? (
                        <span className="font-semibold text-text">{node.name}</span>
                      ) : (
                        <button onClick={() => handleNavigate(node.id)} className="hover:underline hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-sm">
                          {node.name}
                        </button>
                      )}
                      {!isLast && <Icon name="ChevronRight" size={16} className="mx-1" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
          {(profile?.characteristics || []).length > 0 && (
            <div className="flex flex-col grow min-h-0">
              <div className="flex items-center w-full mb-2 shrink-0">
                <div className="grow font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 text-left p-1">
                  <Icon name="List" size={16} />
                  <span className="grow">{t('features')}</span>
                </div>
                <div className="flex items-center gap-1 ml-2 text-xs font-semibold">
                  <button onClick={handleCollapseAll} className="flex items-center text-gray-500 hover:text-accent transition-colors p-1 rounded-sm hover:bg-hover-bg">
                    <Icon name="ChevronUp" size={14} className="mr-1" />
                    {t('collapseAll')}
                  </button>
                  <button onClick={handleExpandAll} className="flex items-center text-gray-500 hover:text-accent transition-colors p-1 rounded-sm hover:bg-hover-bg">
                    <Icon name="ChevronDown" size={14} className="mr-1" />
                    {t('expandAll')}
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto grow pt-2 pr-2">
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
    </Modal>
  );
};
