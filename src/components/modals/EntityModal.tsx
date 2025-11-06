import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Icon } from '../Icon';
import { ImageViewer } from '../common/ImageViewer';
import type { KeyData, Media, ScoreType, Characteristic, IconName, EntityNode } from '../../types';
import { translations } from '../../constants';

// --- EntityModal ---
interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  keyData: KeyData | null;
  t: (key: keyof typeof translations['en']) => string;
  onImageClick: (media: Media[], startIndex: number) => void;
  sections: { hierarchy: boolean; features: boolean; };
  setSections: React.Dispatch<React.SetStateAction<{ hierarchy: boolean; features: boolean; }>>;
}

export const EntityModal: React.FC<EntityModalProps> = ({ isOpen, onClose, entityId, keyData, t, onImageClick, sections, setSections }) => {
  const [activeEntityId, setActiveEntityId] = useState(entityId);
  const [isCopied, setIsCopied] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Cache the entityId when the modal opens to prevent content disappearing during close animation
  useEffect(() => {
    if (isOpen) {
      setActiveEntityId(entityId);
      setNavigationHistory([]); // Reset history when modal is opened from outside
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

  if (!entity) return <Modal isOpen={isOpen} onClose={onClose} title="Loading..."><div /></Modal>;

  const groupedChars = (profile?.characteristics || []).reduce((acc, char) => {
    (acc[char.parent] = acc[char.parent] || []).push(char);
    return acc;
  }, {} as Record<string, Characteristic[]>);

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
    return <span className={`char-badge text-xs px-2 py-0.5 rounded-full font-bold ${badgeClass}`}>{badgeText}</span>;
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

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const modalTitle = (
    <div className="flex items-center gap-2 min-w-0">
      {navigationHistory.length > 0 && (
        <button onClick={handleBack} className="p-1 rounded-md hover:bg-hover-bg" title={t('back')}><Icon name="ArrowLeft" size={18} /></button>
      )}
      <span>{entity.name}</span>
      <button onClick={handleCopy} className="text-gray-400 hover:text-accent p-1 rounded-md" title={t('copyToClipboard')}><Icon name={isCopied ? 'Check' : 'Copy'} size={16} /></button>
    </div>
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
              <button onClick={() => toggleSection('hierarchy')} className="w-full font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2 text-left p-1 rounded-md hover:bg-hover-bg transition-colors duration-200">
                <Icon name="Network" size={16} />
                <span className="grow">{t('hierarchy')}</span>
                <Icon name="ChevronRight" size={20} className={`transition-transform duration-300 ${sections.hierarchy ? 'rotate-90' : ''}`} />
              </button>
              {/* ANIMATION: Added transition classes to animate max-height and opacity */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${sections.hierarchy ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
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
            </div>
          )}
          {Object.keys(groupedChars).length > 0 && (
            <div className="flex flex-col grow min-h-0">
              <button onClick={() => toggleSection('features')} className="w-full font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2 text-left p-1 rounded-md hover:bg-hover-bg transition-colors duration-200 shrink-0">
                <Icon name="List" size={16} />
                <span className="grow">{t('features')}</span>
                <Icon name="ChevronRight" size={20} className={`transition-transform duration-300 ${sections.features ? 'rotate-90' : ''}`} />
              </button>
              {/* ANIMATION: Replaced conditional rendering with conditional classes for a smooth collapse/expand animation. */}
              <div className={`overflow-y-auto grow transition-all duration-300 ease-in-out ${sections.features ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pt-2">
                  {Object.entries(groupedChars).map(([groupName, chars]) => (
                    <div key={groupName} className="mb-4 pl-2">
                      <h5 className="font-semibold text-gray-500 flex items-center gap-2 mb-1 text-sm bg-panel-bg py-1">
                        {groupName}
                      </h5>
                      {(chars as Characteristic[]).map((char, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-border text-sm ml-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {getIconForChar(char)}
                            <span>{char.text}</span>
                          </div>
                          {getBadge(char)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
