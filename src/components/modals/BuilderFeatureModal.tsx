import React, { MutableRefObject, useState, useEffect, useRef } from 'react';
import { Icon } from '../common/Icon';
import { Modal } from './Modal';
import { MarkdownInput } from '../common';
import { CustomSelect } from '../common';
import type { DraftFeature, DraftState } from '../../types';
import { processImage } from '../../utils/imageUtils';
import { ConfirmModal } from './ConfirmModal';

const reorderArray = <T,>(arr: T[], from: number, to: number): T[] => {
  const newArr = [...arr];
  const [moved] = newArr.splice(from, 1);
  newArr.splice(to, 0, moved);
  return newArr;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

interface BuilderFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFeature?: DraftFeature;
  selectedState?: DraftState;
  selectedStateParent?: DraftFeature;
  setSelectedFeatureId: (id: string | null) => void;
  t: (key: string) => string;
  updateFeature: (id: string, updates: Partial<DraftFeature>) => void;
  duplicateFeature: (id: string) => void;
  setDeleteTarget: (target: any) => void;
  requestTypeChange: (id: string, newType: 'numeric' | 'state') => void;
  addState: (id: string) => void;
  collapsedFeatures: Set<string>;
  toggleFeatureCollapse: (id: string) => void;
  duplicateState: (featureId: string, stateId: string) => void;
  updateState: (featureId: string, stateId: string, updates: any) => void;
  addStateValue: (featureId: string, stateId: string) => void;
  updateStateValue: (featureId: string, stateId: string, valueId: string, updates: any) => void;
  deleteStateValue: (featureId: string, stateId: string, valueId: string) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
  draggedMedia: any;
  setDraggedMedia: (media: any) => void;
  reorderFeatureMedia: (featureId: string, from: number, to: number) => void;
  reorderStateMedia: (featureId: string, stateId: string, from: number, to: number) => void;
  handleAddImages: (files: FileList | File[] | null, targetType: 'feature' | 'state', id: string, parentId?: string) => void;
  setEditingMedia: (media: any) => void;
  ghostRef: React.RefObject<HTMLDivElement>;
  lastTouchPos: MutableRefObject<{ x: number, y: number }>;
  touchTimeout: MutableRefObject<NodeJS.Timeout | null>;
  draggedValue: { stateId: string, index: number } | null;
  setDraggedValue: (val: { stateId: string, index: number } | null) => void;
  getDefaultStateValues: (t: any) => any[];
  updateDraftKey: (updater: (prev: any) => any) => void;
}

export const BuilderFeatureModal: React.FC<BuilderFeatureModalProps> = ({
  isOpen, onClose, selectedFeature, selectedState, selectedStateParent, setSelectedFeatureId, t,
  updateFeature, duplicateFeature, setDeleteTarget, requestTypeChange, addState,
  collapsedFeatures, toggleFeatureCollapse, duplicateState, updateState, addStateValue,
  updateStateValue, deleteStateValue, dragOverId, setDragOverId, draggedMedia,
  setDraggedMedia, reorderFeatureMedia, reorderStateMedia, handleAddImages, setEditingMedia,
  ghostRef, lastTouchPos, touchTimeout, draggedValue, setDraggedValue, getDefaultStateValues, updateDraftKey
}) => {
  const [cachedMode, setCachedMode] = useState<'feature' | 'state'>('feature');

  // Cached objects to keep rendering during close animation
  const [localFeature, setLocalFeature] = useState<DraftFeature | undefined>(undefined);
  const [localState, setLocalState] = useState<DraftState | undefined>(undefined);
  const [localStateParent, setLocalStateParent] = useState<DraftFeature | undefined>(undefined);

  // Local feature state
  const [localFeatureName, setLocalFeatureName] = useState('');
  const [localFeatureDescription, setLocalFeatureDescription] = useState('');
  const [localFeatureMatchType, setLocalFeatureMatchType] = useState<'OR' | 'AND' | 'SINGLE'>('OR');
  const [localFeatureUnitPrefix, setLocalFeatureUnitPrefix] = useState('none');
  const [localFeatureBaseUnit, setLocalFeatureBaseUnit] = useState('none');
  const [localFeatureMedia, setLocalFeatureMedia] = useState<any[]>([]);

  // Local state state
  const [localStateName, setLocalStateName] = useState('');
  const [localStateDescription, setLocalStateDescription] = useState('');
  const [localStateMedia, setLocalStateMedia] = useState<any[]>([]);
  const [localStateValues, setLocalStateValues] = useState<any[]>([]);

  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const prevIdRef = useRef<string | null>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen && touchTimeout.current) {
      clearTimeout(touchTimeout.current);
    }
  }, [isOpen, touchTimeout]);

  useEffect(() => {
    const currentId = selectedState ? selectedState.id : (selectedFeature ? selectedFeature.id : null);
    const idChanged = currentId !== prevIdRef.current;
    const opened = isOpen && !prevIsOpenRef.current;

    if (isOpen && (idChanged || opened)) {
      prevIdRef.current = currentId;
      setShowConfirmClose(false);
      if (selectedState) {
        setCachedMode('state');
        setLocalState(selectedState);
        setLocalStateParent(selectedStateParent);
        setLocalFeature(undefined);
        setLocalStateName(selectedState.name || '');
        setLocalStateDescription((selectedState as any).description || '');
        setLocalStateMedia(selectedState.media ? [...selectedState.media] : []);
        setLocalStateValues((selectedState as any).values ? JSON.parse(JSON.stringify((selectedState as any).values)) : getDefaultStateValues(t));
      } else if (selectedFeature) {
        setCachedMode('feature');
        setLocalFeature(selectedFeature);
        setLocalState(undefined);
        setLocalStateParent(undefined);
        setLocalFeatureName(selectedFeature.name || '');
        setLocalFeatureDescription(selectedFeature.description || '');
        setLocalFeatureMatchType(selectedFeature.matchType || 'OR');
        setLocalFeatureUnitPrefix(selectedFeature.unit_prefix || 'none');
        setLocalFeatureBaseUnit(selectedFeature.base_unit || 'none');
        setLocalFeatureMedia(selectedFeature.media ? [...selectedFeature.media] : []);
      }
    } else if (isOpen) {
      // If the modal is already open and we haven't switched to a different entity,
      // update cached state objects if parent props have been updated (e.g. type change or adding a state).
      if (selectedFeature && localFeature && selectedFeature.id === localFeature.id) {
        if (selectedFeature !== localFeature) {
          setLocalFeature(selectedFeature);
        }
        if (selectedFeature.type !== localFeature.type) {
          setLocalFeatureMatchType(selectedFeature.matchType || 'OR');
          setLocalFeatureUnitPrefix(selectedFeature.unit_prefix || 'none');
          setLocalFeatureBaseUnit(selectedFeature.base_unit || 'none');
        }
      }
      if (selectedState && localState && selectedState.id === localState.id) {
        if (selectedState !== localState) {
          setLocalState(selectedState);
        }
        if (selectedStateParent !== localStateParent) {
          setLocalStateParent(selectedStateParent);
        }
      }
    }
    prevIsOpenRef.current = isOpen;
    if (!isOpen) {
      prevIdRef.current = null;
    }
  }, [isOpen, selectedFeature, selectedState, selectedStateParent, localFeature, localState, localStateParent]);

  const isFeatureNameEmpty = localFeatureName.trim() === '';
  const isStateNameEmpty = localStateName.trim() === '';
  const isNameEmpty = cachedMode === 'feature' ? isFeatureNameEmpty : isStateNameEmpty;

  const hasFeatureChanges = selectedFeature ? (
    localFeatureName !== (selectedFeature.name || '') ||
    localFeatureDescription !== (selectedFeature.description || '') ||
    localFeatureMatchType !== (selectedFeature.matchType || 'OR') ||
    localFeatureUnitPrefix !== (selectedFeature.unit_prefix || 'none') ||
    localFeatureBaseUnit !== (selectedFeature.base_unit || 'none') ||
    JSON.stringify(localFeatureMedia) !== JSON.stringify(selectedFeature.media || [])
  ) : false;

  const hasStateChanges = (selectedState && selectedStateParent) ? (
    localStateName !== (selectedState.name || '') ||
    localStateDescription !== ((selectedState as any).description || '') ||
    JSON.stringify(localStateMedia) !== JSON.stringify(selectedState.media || []) ||
    JSON.stringify(localStateValues) !== JSON.stringify((selectedState as any).values || getDefaultStateValues(t))
  ) : false;

  const hasChanges = cachedMode === 'feature' ? hasFeatureChanges : hasStateChanges;

  const handleSave = () => {
    if (isNameEmpty || !hasChanges) return;
    if (cachedMode === 'feature' && selectedFeature) {
      updateFeature(selectedFeature.id, {
        name: localFeatureName,
        description: localFeatureDescription,
        matchType: localFeatureMatchType,
        unit_prefix: localFeatureUnitPrefix,
        base_unit: localFeatureBaseUnit,
        media: localFeatureMedia
      });
    } else if (cachedMode === 'state' && selectedState && selectedStateParent) {
      // Find deleted custom state values to clean up from entities
      const originalValues = (selectedState as any).values || getDefaultStateValues(t);
      const deletedValueIds = originalValues
        .map((v: any) => v.id)
        .filter((id: string) => !localStateValues.some(v => v.id === id));

      updateState(selectedStateParent.id, selectedState.id, {
        name: localStateName,
        description: localStateDescription,
        media: localStateMedia,
        values: localStateValues
      });

      if (deletedValueIds.length > 0) {
        updateDraftKey(prev => ({
          ...prev,
          entities: prev.entities.map(e => {
            const newScores = { ...e.scores };
            let changed = false;
            deletedValueIds.forEach((vid: string) => {
              if (newScores[selectedState.id] === vid) {
                delete newScores[selectedState.id];
                changed = true;
              }
            });
            return changed ? { ...e, scores: newScores } : e;
          })
        }));
      }
    }
    onClose();
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleStateClick = (stateId: string) => {
    if (cachedMode === 'feature' && selectedFeature && !isFeatureNameEmpty) {
      updateFeature(selectedFeature.id, {
        name: localFeatureName,
        description: localFeatureDescription,
        matchType: localFeatureMatchType,
        unit_prefix: localFeatureUnitPrefix,
        base_unit: localFeatureBaseUnit,
        media: localFeatureMedia
      });
    }
    setSelectedFeatureId(stateId);
  };

  const handleAddImagesLocal = async (files: FileList | File[] | null, targetType: 'feature' | 'state') => {
    if (!files) return;
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;
    const processed = await Promise.all(fileArray.map(f => processImage(f)));
    const newMedia = processed.map(p => ({ url: `data:${p.mimeType};base64,${p.base64}` }));

    if (targetType === 'feature') {
      setLocalFeatureMedia(prev => [...prev, ...newMedia]);
    } else {
      setLocalStateMedia(prev => [...prev, ...newMedia]);
    }
  };

  const deleteFeatureMediaLocal = (index: number) => {
    setLocalFeatureMedia(prev => prev.filter((_, i) => i !== index));
  };

  const deleteStateMediaLocal = (index: number) => {
    setLocalStateMedia(prev => prev.filter((_, i) => i !== index));
  };

  const reorderFeatureMediaLocal = (from: number, to: number) => {
    if (from === to) return;
    const newMedia = [...localFeatureMedia];
    const [moved] = newMedia.splice(from, 1);
    newMedia.splice(to, 0, moved);
    setLocalFeatureMedia(newMedia);
  };

  const reorderStateMediaLocal = (from: number, to: number) => {
    if (from === to) return;
    const newMedia = [...localStateMedia];
    const [moved] = newMedia.splice(from, 1);
    newMedia.splice(to, 0, moved);
    setLocalStateMedia(newMedia);
  };

  const addStateValueLocal = () => {
    setLocalStateValues(prev => [...prev, { id: generateId(), name: t('value' as any) || 'Value' }]);
  };

  const updateStateValueLocal = (valueId: string, updates: any) => {
    setLocalStateValues(prev => prev.map(v => v.id === valueId ? { ...v, ...updates } : v));
  };

  const deleteStateValueLocal = (valueId: string) => {
    setLocalStateValues(prev => prev.filter(v => v.id !== valueId));
  };

  const modalTitle = cachedMode === 'state' && localState && localStateParent ? (
    <div className="flex items-center gap-3 min-w-0">
      <Icon name="CircleCheck" size={24} className="text-gray-400" />
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 leading-none truncate">{localStateParent.name || t('kbUnnamedFeature')}</span>
        <span className="truncate leading-tight">{localStateName || t('kbStateName' as any) || 'Unnamed State'}</span>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-2 min-w-0">
      <Icon name={localFeature?.type === 'state' ? 'Tag' : 'Hash'} size={24} className="text-gray-400" />
      <span className="truncate">{localFeatureName || t('kbUnnamedFeature')}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="lg">
      <div className="flex flex-col h-[75vh] md:h-[80vh] bg-bg/80 backdrop-blur-sm rounded-b-3xl overflow-hidden relative">
        <div className="grow overflow-y-auto p-5 md:p-8 flex flex-col gap-6">
          {cachedMode === 'feature' && localFeature ? (
            <div className="flex flex-col gap-6 min-w-0 animate-fade-in" style={{ willChange: 'auto' }}>
              <div className="flex flex-col gap-4 bg-panel-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 relative z-10 min-w-0">
                <div className="w-full font-bold text-accent flex items-center gap-2 mb-1 text-left tracking-tight shrink-0">
                  <Icon name="Info" size={18} />
                  <span className="grow text-base">{t('info')}</span>
                </div>
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-sm font-semibold opacity-80 text-left">
                    {t('kbName')} <span className="text-red-500 font-bold">*</span>
                  </span>
                  <input
                    type="text"
                    value={localFeatureName}
                    maxLength={150}
                    onChange={e => setLocalFeatureName(e.target.value)}
                    className={`input-base text-lg font-medium ${isFeatureNameEmpty ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                  <div className="flex justify-between items-start mt-1 min-h-[1.25rem]">
                    {isFeatureNameEmpty ? (
                      <span className="text-xs text-red-500 font-semibold text-left">
                        {t('errNameRequired')}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs font-normal opacity-60 ml-auto">
                      {localFeatureName.length} / 150
                    </span>
                  </div>
                </label>

                <div className="relative flex flex-col min-w-0 w-full">
                  <MarkdownInput
                    label={t('kbDescription')}
                    value={localFeatureDescription}
                    maxLength={1000}
                    onChange={val => setLocalFeatureDescription(val)}
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <span className="text-sm font-semibold opacity-80">{t('kbType')}</span>
                    <CustomSelect
                      value={localFeatureBaseUnit !== 'none' || localFeatureUnitPrefix !== 'none' ? 'numeric' : localFeature.type}
                      onChange={val => requestTypeChange(localFeature.id, val as 'numeric' | 'state')}
                      options={[{ value: 'state', label: t('kbTypeState') }, { value: 'numeric', label: t('kbTypeNumeric') }]}
                      className="input-base cursor-pointer w-full"
                    />
                  </label>

                  {localFeature.type === 'state' && (
                    <label className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold opacity-80">{t('kbMatchType' as any) || 'Matching Type'}</span>
                        <div title={t('kbMatchTypeHelp' as any) || "OR: Matches any selected state.\nAND: Matches all selected states.\nSINGLE: Restricts to a single selection."} className="text-gray-400 hover:text-accent transition-colors cursor-help mt-0.5">
                          <Icon name="Info" size={14} />
                        </div>
                      </div>
                      <CustomSelect
                        value={localFeatureMatchType}
                        onChange={val => setLocalFeatureMatchType(val as 'OR' | 'AND' | 'SINGLE')}
                        options={[
                          { value: 'OR', label: t('kbMatchAny' as any) || 'Match Any (OR)' },
                          { value: 'AND', label: t('kbMatchAll' as any) || 'Match All (AND)' },
                          { value: 'SINGLE', label: t('kbSingleSelection' as any) || 'Single Selection' }
                        ]}
                        className="input-base cursor-pointer w-full"
                      />
                    </label>
                  )}
                </div>

                {localFeature.type === 'numeric' && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <span className="text-sm font-semibold opacity-80">{t('kbUnitPrefix' as any) || 'Unit Prefix'}</span>
                      <CustomSelect
                        value={localFeatureUnitPrefix}
                        onChange={val => setLocalFeatureUnitPrefix(val)}
                        options={[
                          { value: 'none', label: t('unitNone' as any) },
                          { value: 'kilo', label: t('unitKilo' as any) },
                          { value: 'hecto', label: t('unitHecto' as any) },
                          { value: 'deca', label: t('unitDeca' as any) },
                          { value: 'deci', label: t('unitDeci' as any) },
                          { value: 'centi', label: t('unitCenti' as any) },
                          { value: 'milli', label: t('unitMilli' as any) },
                          { value: 'micro', label: t('unitMicro' as any) },
                        ]}
                        className="input-base cursor-pointer w-full"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <span className="text-sm font-semibold opacity-80">{t('kbBaseUnit' as any) || 'Base Unit'}</span>
                      <CustomSelect
                        value={localFeatureBaseUnit}
                        onChange={val => setLocalFeatureBaseUnit(val)}
                        options={[
                          { value: 'none', label: t('unitNone' as any) },
                          { value: 'metre', label: t('unitMetre' as any) },
                          { value: 'square metre', label: t('unitSquareMetre' as any) },
                          { value: 'cubic metre', label: t('unitCubicMetre' as any) },
                          { value: 'litre', label: t('unitLitre' as any) },
                          { value: 'degrees celcius', label: t('unitCelsius' as any) },
                          { value: 'degrees planar', label: t('unitDegree' as any) },
                        ]}
                        className="input-base cursor-pointer w-full"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 bg-panel-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 min-w-0">
                <div className="w-full font-bold text-accent flex items-center gap-2 mb-1 text-left tracking-tight shrink-0">
                  <Icon name="Image" size={18} />
                  <span className="grow text-base">{t('kbImages' as any) || 'Images'}</span>
                </div>
                <div
                  className={`flex gap-3 overflow-x-auto pb-2 pt-2 px-2 -mx-2 rounded-xl transition-all min-h-[116px] ${dragOverId === 'feature-images' ? 'bg-accent/10 ring-2 ring-accent ring-inset' : ''}`}
                  onDragEnter={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverId !== 'feature-images') setDragOverId('feature-images');
                    }
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    if (dragOverId === 'feature-images') setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    if (dragOverId === 'feature-images') {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverId(null);
                      handleAddImagesLocal(e.dataTransfer.files, 'feature');
                    }
                  }}
                >
                  {localFeatureMedia.map((m, i) => (
                    <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `feature-media-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-panel-bg scale-[1.02]' : ''} ${draggedMedia?.index === i && draggedMedia.itemId === localFeature.id ? 'opacity-50' : ''}`}
                      draggable
                      data-feature-media-idx={i}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={() => setDraggedMedia({ type: 'feature', itemId: localFeature.id, index: i })}
                      onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedMedia?.type === 'feature' && draggedMedia.itemId === localFeature.id && draggedMedia.index !== i) {
                          if (dragOverId !== `feature-media-${i}`) setDragOverId(`feature-media-${i}`);
                        }
                      }}
                      onDragLeave={() => { if (dragOverId === `feature-media-${i}`) setDragOverId(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverId(null);
                        if (draggedMedia?.type === 'feature' && draggedMedia.itemId === localFeature.id) {
                          reorderFeatureMediaLocal(draggedMedia.index, i);
                        }
                        setDraggedMedia(null);
                      }}
                      onTouchStart={(e) => {
                        lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                        touchTimeout.current = setTimeout(() => {
                          setDraggedMedia({ type: 'feature', itemId: localFeature.id, index: i });
                          if (navigator.vibrate) navigator.vibrate(50);
                        }, 300);
                      }}
                      onTouchMove={(e) => {
                        const touch = e.touches[0];
                        if (!draggedMedia) {
                          const dx = touch.clientX - lastTouchPos.current.x;
                          const dy = touch.clientY - lastTouchPos.current.y;
                          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                            if (touchTimeout.current) clearTimeout(touchTimeout.current);
                          }
                          return;
                        }
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                        if (ghostRef.current) {
                          ghostRef.current.style.left = `${touch.clientX}px`;
                          ghostRef.current.style.top = `${touch.clientY}px`;
                        }
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const targetMedia = el?.closest('[data-feature-media-idx]');
                        if (targetMedia) {
                          const targetIdx = parseInt(targetMedia.getAttribute('data-feature-media-idx') || '-1');
                          if (targetIdx !== -1 && targetIdx !== i && dragOverId !== `feature-media-${targetIdx}`) setDragOverId(`feature-media-${targetIdx}`);
                        } else {
                          if (dragOverId) setDragOverId(null);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (draggedMedia) e.stopPropagation();
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        if (draggedMedia) {
                          if (e.cancelable) e.preventDefault();
                          if (dragOverId && dragOverId.startsWith('feature-media-')) {
                            const targetIdx = parseInt(dragOverId.replace('feature-media-', ''));
                            if (!isNaN(targetIdx) && targetIdx !== i) reorderFeatureMediaLocal(i, targetIdx);
                          }
                          setDraggedMedia(null);
                          setDragOverId(null);
                        }
                      }}
                      onTouchCancel={() => {
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        setDraggedMedia(null);
                        setDragOverId(null);
                      }}
                      style={{ touchAction: draggedMedia ? 'none' : 'auto' }}>
                      <div className="h-24 w-24 relative overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md cursor-move group-hover:shadow-lg transition-all" onClick={() => setEditingMedia({
                        type: 'feature',
                        itemId: localFeature.id,
                        mediaIndex: i,
                        mediaObj: localFeatureMedia[i],
                        onUpdate: (updates: Partial<Media>) => {
                          setLocalFeatureMedia(prev => prev.map((m, idx) => idx === i ? { ...m, ...updates } : m));
                        }
                      })}>
                        <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                      </div>

                      <button onClick={() => {
                        deleteFeatureMediaLocal(i);
                      }} className="absolute -top-2 -right-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md hover:shadow-lg cursor-pointer z-10"><Icon name="X" size={12} /></button>
                    </div>
                  ))}
                  <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-accent group">
                    <Icon name="Plus" size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{t('kbAdd' as any)}</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                      handleAddImagesLocal(e.target.files, 'feature');
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>

              {localFeature.type === 'state' && (
                <div className="flex flex-col gap-3 bg-panel-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 min-w-0">
                  <div className="flex items-center w-full mb-1 shrink-0">
                    <div className="grow font-bold text-accent flex items-center gap-2 text-left tracking-tight">
                      <Icon name="CircleCheck" size={18} />
                      <span className="grow text-base">{t('kbStates')}</span>
                    </div>
                    <button onClick={() => { addState(localFeature.id); if (collapsedFeatures.has(localFeature.id)) toggleFeatureCollapse(localFeature.id); }} className="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-accent/30">
                      <Icon name="Plus" size={14} /> {t('kbAdd' as any)}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {localFeature.states.length === 0 ? (
                      <span className="text-sm opacity-50 italic">{t('kbNoStatesDefined' as any)}</span>
                    ) : (
                      localFeature.states.map(s => (
                        <div key={s.id} onClick={() => handleStateClick(s.id)} className="flex items-center justify-between p-3 rounded-xl bg-panel-bg border border-border hover:border-accent/50 cursor-pointer transition-colors group/editstate shadow-sm hover:shadow-md">
                          <span className="text-sm font-medium truncate flex-1">{s.name || t('kbStateName' as any) || 'Unnamed State'}</span>
                          <Icon name="ChevronRight" size={16} className="opacity-40 group-hover/editstate:opacity-100 group-hover/editstate:text-accent transition-all" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : cachedMode === 'state' && localState && localStateParent ? (
            <div className="flex flex-col gap-6 min-w-0 animate-fade-in" style={{ willChange: 'auto' }}>
              <div className="flex flex-col gap-4 bg-panel-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 min-w-0">
                <div className="w-full font-bold text-accent flex items-center gap-2 mb-1 text-left tracking-tight shrink-0">
                  <Icon name="Info" size={18} />
                  <span className="grow text-base">{t('info')}</span>
                </div>
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-sm font-semibold opacity-80 text-left">
                    {t('kbName')} <span className="text-red-500 font-bold">*</span>
                  </span>
                  <input
                    type="text"
                    value={localStateName}
                    maxLength={150}
                    onChange={e => setLocalStateName(e.target.value)}
                    className={`input-base text-lg font-medium ${isStateNameEmpty ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                  <div className="flex justify-between items-start mt-1 min-h-[1.25rem]">
                    {isStateNameEmpty ? (
                      <span className="text-xs text-red-500 font-semibold text-left">
                        {t('errNameRequired')}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs font-normal opacity-60 ml-auto">
                      {localStateName.length} / 150
                    </span>
                  </div>
                </label>
                <div className="relative flex flex-col min-w-0 w-full">
                  <MarkdownInput
                    label={t('kbDescription')}
                    value={localStateDescription}
                    maxLength={1000}
                    onChange={val => setLocalStateDescription(val)}
                    rows={3}
                  />
                </div>
              </div>

              {/* State Media Section */}
              <div className="flex flex-col gap-3 bg-panel-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 min-w-0">
                <div className="w-full font-bold text-accent flex items-center gap-2 mb-1 text-left tracking-tight shrink-0">
                  <Icon name="Image" size={18} />
                  <span className="grow text-base">{t('kbImages' as any) || 'Images'}</span>
                </div>
                <div
                  className={`flex gap-3 overflow-x-auto pb-2 pt-2 px-2 -mx-2 rounded-xl transition-all min-h-[116px] ${dragOverId === `state-images-${localState.id}` ? 'bg-accent/10 ring-2 ring-accent ring-inset' : ''}`}
                  onDragEnter={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverId !== `state-images-${localState.id}`) setDragOverId(`state-images-${localState.id}`);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    if (dragOverId === `state-images-${localState.id}`) setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    if (dragOverId === `state-images-${localState.id}`) {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverId(null);
                      handleAddImagesLocal(e.dataTransfer.files, 'state');
                    }
                  }}
                >
                  {localStateMedia.map((m, i) => (
                    <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `state-media-${localState.id}-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-panel-bg scale-[1.02]' : ''} ${draggedMedia?.index === i && draggedMedia.stateId === localState.id ? 'opacity-50' : ''}`}
                      draggable
                      data-state-media-idx={i}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={() => setDraggedMedia({ type: 'state', itemId: localStateParent.id, stateId: localState.id, index: i })}
                      onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedMedia?.type === 'state' && draggedMedia.itemId === localStateParent.id && draggedMedia.stateId === localState.id && draggedMedia.index !== i) {
                          if (dragOverId !== `state-media-${localState.id}-${i}`) setDragOverId(`state-media-${localState.id}-${i}`);
                        }
                      }}
                      onDragLeave={() => { if (dragOverId === `state-media-${localState.id}-${i}`) setDragOverId(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverId(null);
                        if (draggedMedia?.type === 'state' && draggedMedia.itemId === localStateParent.id && draggedMedia.stateId === localState.id) {
                          reorderStateMediaLocal(draggedMedia.index, i);
                        }
                        setDraggedMedia(null);
                      }}
                      onTouchStart={(e) => {
                        lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                        touchTimeout.current = setTimeout(() => {
                          setDraggedMedia({ type: 'state', itemId: localStateParent.id, stateId: localState.id, index: i });
                          if (navigator.vibrate) navigator.vibrate(50);
                        }, 300);
                      }}
                      onTouchMove={(e) => {
                        const touch = e.touches[0];
                        if (!draggedMedia) {
                          const dx = touch.clientX - lastTouchPos.current.x;
                          const dy = touch.clientY - lastTouchPos.current.y;
                          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                            if (touchTimeout.current) clearTimeout(touchTimeout.current);
                          }
                          return;
                        }
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                        if (ghostRef.current) {
                          ghostRef.current.style.left = `${touch.clientX}px`;
                          ghostRef.current.style.top = `${touch.clientY}px`;
                        }
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const targetMedia = el?.closest('[data-state-media-idx]');
                        if (targetMedia) {
                          const targetIdx = parseInt(targetMedia.getAttribute('data-state-media-idx') || '-1');
                          if (targetIdx !== -1 && targetIdx !== i && dragOverId !== `state-media-${localState.id}-${targetIdx}`) setDragOverId(`state-media-${localState.id}-${targetIdx}`);
                        } else {
                          if (dragOverId) setDragOverId(null);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (draggedMedia) e.stopPropagation();
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        if (draggedMedia) {
                          if (e.cancelable) e.preventDefault();
                          if (dragOverId && dragOverId.startsWith(`state-media-${localState.id}-`)) {
                            const targetIdx = parseInt(dragOverId.replace(`state-media-${localState.id}-`, ''));
                            if (!isNaN(targetIdx) && targetIdx !== i) reorderStateMediaLocal(i, targetIdx);
                          }
                          setDraggedMedia(null);
                          setDragOverId(null);
                        }
                      }}
                      onTouchCancel={() => {
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        setDraggedMedia(null);
                        setDragOverId(null);
                      }}
                      style={{ touchAction: draggedMedia ? 'none' : 'auto' }}>
                      <div className="h-24 w-24 relative overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md cursor-move group-hover:shadow-lg transition-all" onClick={() => setEditingMedia({
                        type: 'state',
                        itemId: localStateParent.id,
                        stateId: localState.id,
                        mediaIndex: i,
                        mediaObj: localStateMedia[i],
                        onUpdate: (updates: Partial<Media>) => {
                          setLocalStateMedia(prev => prev.map((m, idx) => idx === i ? { ...m, ...updates } : m));
                        }
                      })}>
                        <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                      </div>
                      <button onClick={() => {
                        deleteStateMediaLocal(i);
                      }} className="absolute -top-2 -right-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md hover:shadow-lg cursor-pointer z-10"><Icon name="X" size={12} /></button>
                    </div>
                  ))}
                  <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-accent group" title={t('kbAddImage' as any)}>
                    <Icon name="Plus" size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{t('kbAdd' as any)}</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                      handleAddImagesLocal(e.target.files, 'state');
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>

              {/* State Values Section */}
              <div className="flex flex-col gap-3 bg-panel-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 min-w-0">
                <div className="flex items-center w-full mb-1 shrink-0">
                  <div className="grow font-bold text-accent flex items-center gap-2 text-left tracking-tight">
                    <Icon name="Target" size={18} />
                    <span className="grow text-base">{t('value' as any) || 'Values'}</span>
                  </div>
                  <button onClick={addStateValueLocal} className="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-accent/30"><Icon name="Plus" size={14} /> {t('kbAdd' as any)}</button>
                </div>
                <div className="flex flex-col gap-2">
                  {localStateValues.map((v: any, vIndex: number) => {
                    const isDefault = ['1', '2', '3', '4', '5'].includes(v.id);

                    const getSymbolBg = (id: string) => {
                      switch (id) {
                        case '1': return 'bg-blue-500/10 text-blue-500';
                        case '2': return 'bg-green-500/10 text-green-500';
                        case '3': return 'bg-gray-500/10 text-text';
                        case '4': return 'bg-red-500/10 text-red-500';
                        case '5': return 'bg-yellow-500/10 text-yellow-500';
                        default: return '';
                      }
                    };
                    const cycleIcon = (current: string) => {
                      if (current === 'question') return 'exclamation';
                      if (current === 'exclamation') return 'check';
                      return 'question';
                    };
                    const renderCustomIcon = (iconType: string, color: string) => {
                      if (iconType === 'question') return <span className="font-bold text-[14px] leading-none" style={{ color }}>?</span>;
                      if (iconType === 'exclamation') return <span className="font-bold text-[14px] leading-none" style={{ color }}>!</span>;
                      return <Icon name="Check" size={14} style={{ color }} />;
                    };

                    return (
                      <div
                        key={v.id}
                        draggable
                        data-state-value-idx={vIndex}
                        data-state-id={localState.id}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => { if (isDefault) return e.preventDefault(); e.stopPropagation(); setDraggedValue({ stateId: localState.id, index: vIndex }); }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (isDefault) return;
                          if (draggedValue?.stateId === localState.id && draggedValue.index !== vIndex) {
                            if (dragOverId !== `value-${localState.id}-${vIndex}`) setDragOverId(`value-${localState.id}-${vIndex}`);
                          }
                        }}
                        onDragLeave={() => { if (!isDefault && dragOverId === `value-${localState.id}-${vIndex}`) setDragOverId(null); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverId(null);
                          if (!isDefault && draggedValue?.stateId === localState.id) {
                            setLocalStateValues(prev => reorderArray(prev, draggedValue.index, vIndex));
                          }
                          setDraggedValue(null);
                        }}
                        onDragEnd={() => { setDraggedValue(null); setDragOverId(null); }}
                        onTouchStart={(e) => {
                          if (isDefault) return;
                          lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                          touchTimeout.current = setTimeout(() => {
                            setDraggedValue({ stateId: localState.id, index: vIndex });
                            if (navigator.vibrate) navigator.vibrate(50);
                          }, 300);
                        }}
                        onTouchMove={(e) => {
                          const touch = e.touches[0];
                          if (!draggedValue) {
                            const dx = touch.clientX - lastTouchPos.current.x;
                            const dy = touch.clientY - lastTouchPos.current.y;
                            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                              if (touchTimeout.current) clearTimeout(touchTimeout.current);
                            }
                            return;
                          }
                          e.stopPropagation();
                          if (e.cancelable) e.preventDefault();
                          lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                          if (ghostRef.current) {
                            ghostRef.current.style.left = `${touch.clientX}px`;
                            ghostRef.current.style.top = `${touch.clientY}px`;
                          }
                          const el = document.elementFromPoint(touch.clientX, touch.clientY);
                          const targetVal = el?.closest('[data-state-value-idx]');
                          if (targetVal) {
                            const targetIdx = parseInt(targetVal.getAttribute('data-state-value-idx') || '-1');
                            const targetStateId = targetVal.getAttribute('data-state-id');
                            if (targetIdx >= 5 && targetStateId === localState.id && targetIdx !== -1 && targetIdx !== vIndex && dragOverId !== `value-${localState.id}-${targetIdx}`) setDragOverId(`value-${localState.id}-${targetIdx}`);
                          } else {
                            if (dragOverId) setDragOverId(null);
                          }
                        }}
                        onTouchEnd={(e) => {
                          if (draggedValue) e.stopPropagation();
                          if (touchTimeout.current) clearTimeout(touchTimeout.current);
                          if (draggedValue) {
                            if (e.cancelable) e.preventDefault();
                            if (dragOverId && dragOverId.startsWith(`value-${localState.id}-`)) {
                              let targetIdx = parseInt(dragOverId.replace(`value-${localState.id}-`, ''));
                              if (targetIdx < 5) targetIdx = 5;
                              if (!isNaN(targetIdx) && targetIdx !== vIndex) {
                                setLocalStateValues(prev => reorderArray(prev, draggedValue.index, targetIdx));
                              }
                            }
                            setDraggedValue(null);
                            setDragOverId(null);
                          }
                        }}
                        onTouchCancel={() => {
                          if (touchTimeout.current) clearTimeout(touchTimeout.current);
                          setDraggedValue(null);
                          setDragOverId(null);
                        }}
                        style={{ touchAction: (draggedValue || isDefault) ? 'none' : 'auto' }}
                        className={`flex gap-3 items-center group/val ${!isDefault ? 'cursor-grab hover:bg-black/5 dark:hover:bg-white/5' : ''} rounded-xl px-3 py-2 -mx-3 transition-all ${dragOverId === `value-${localState.id}-${vIndex}` ? 'ring-2 ring-accent scale-[1.02] bg-accent/5' : ''} ${draggedValue?.index === vIndex && draggedValue?.stateId === localState.id ? 'opacity-50' : ''}`}
                      >
                        <Icon name="GripVertical" size={16} className={`opacity-30 shrink-0 transition-opacity ${!isDefault ? 'group-hover/val:opacity-100 cursor-grab' : 'invisible'}`} />
                        {isDefault ? (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getSymbolBg(v.id)}`}>
                            {v.id === '1' ? <Icon name="Check" size={16} /> : v.id === '2' ? <Icon name="Check" size={16} /> : v.id === '3' ? <span className="font-bold text-[17px] leading-none">?</span> : v.id === '4' ? <Icon name="Check" size={16} /> : <Icon name="Check" size={16} />}
                          </div>
                        ) : (
                          <button onClick={() => updateStateValueLocal(v.id, { iconType: cycleIcon(v.iconType || 'check') })} title={t('edit' as any)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity border border-border" style={{ backgroundColor: `color-mix(in srgb, ${v.color || 'var(--color-accent)'} 15%, transparent)` }}>
                            {renderCustomIcon(v.iconType || 'check', v.color || 'var(--color-accent)')}
                          </button>
                        )}

                        {isDefault ? (
                          <span className="flex-1 text-sm px-2 py-1.5 font-medium opacity-80">{v.name}</span>
                        ) : (
                          <div className="flex-1 flex flex-col min-w-0">
                            <input
                              type="text"
                              value={v.name}
                              maxLength={100}
                              onChange={e => updateStateValueLocal(v.id, { name: e.target.value })}
                              className="w-full text-sm p-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg focus:border-accent hover:border-black/20 dark:hover:border-white/20 focus:outline-none transition-colors"
                              placeholder={t('value' as any)}
                            />
                            <span className="text-[10px] opacity-55 text-right self-end mt-0.5 mr-1">{v.name.length} / 100</span>
                          </div>
                        )}

                        {!isDefault && <input type="color" value={v.color || '#3b82f6'} onChange={e => updateStateValueLocal(v.id, { color: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent shrink-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-lg" title="Select color" />}
                        
                        {!isDefault && <button onClick={() => {
                          setLocalStateValues(prev => reorderArray(prev, vIndex, vIndex - 1));
                        }} title={t('moveUp' as any) || 'Move Up'} className="opacity-0 group-hover/val:opacity-100 text-gray-400 hover:text-accent transition-opacity p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer" disabled={vIndex <= 5}><Icon name="ArrowUp" size={16} /></button>}
                        
                        {!isDefault && <button onClick={() => {
                          setLocalStateValues(prev => reorderArray(prev, vIndex, vIndex + 1));
                        }} title={t('moveDown' as any) || 'Move Down'} className="opacity-0 group-hover/val:opacity-100 text-gray-400 hover:text-accent transition-opacity p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer" disabled={vIndex >= localStateValues.length - 1}><Icon name="ArrowDown" size={16} /></button>}
                        
                        {!isDefault && <button onClick={() => deleteStateValueLocal(v.id)} className="opacity-0 group-hover/val:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20"><Icon name="X" size={16} /></button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Fixed Footer Bar */}
        <div className="p-5 border-t border-white/10 shrink-0 bg-panel-bg/95 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-start">
            {cachedMode === 'feature' && localFeature && (
              <>
                <button onClick={() => { duplicateFeature(localFeature.id); onClose(); }} className="px-4 py-2 text-gray-500 hover:text-accent bg-panel-bg/50 hover:bg-hover-bg rounded-xl border border-border shadow-sm transition-all duration-300 font-bold flex items-center gap-2 cursor-pointer hover:shadow-md">
                  <Icon name="Copy" size={16} /> {t('kbDuplicate')}
                </button>
                <button onClick={() => { setDeleteTarget({ type: 'feature', id: localFeature.id }); onClose(); }} className="px-4 py-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-red-600 transition-all duration-300 shadow-md hover:shadow-lg font-bold flex items-center gap-2 cursor-pointer">
                  <Icon name="Trash2" size={16} /> {t('kbDelete')}
                </button>
              </>
            )}
            {cachedMode === 'state' && localState && localStateParent && (
              <>
                <button onClick={() => { duplicateState(localStateParent.id, localState.id); onClose(); }} className="px-4 py-2 text-gray-500 hover:text-accent bg-panel-bg/50 hover:bg-hover-bg rounded-xl border border-border shadow-sm transition-all duration-300 font-bold flex items-center gap-2 cursor-pointer hover:shadow-md">
                  <Icon name="Copy" size={16} /> {t('kbDuplicate')}
                </button>
                <button onClick={() => { setDeleteTarget({ type: 'state', id: localState.id, parentId: localStateParent.id }); onClose(); }} className="px-4 py-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-red-600 transition-all duration-300 shadow-md hover:shadow-lg font-bold flex items-center gap-2 cursor-pointer">
                  <Icon name="Trash2" size={16} /> {t('kbDelete')}
                </button>
              </>
            )}
          </div>
          <div className="w-full sm:w-auto flex justify-end">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isNameEmpty}
              className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center gap-2 border border-white/20 bg-accent/95 backdrop-blur-md hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="Save" size={16} />
              {t('save')}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        onConfirm={() => {
          setShowConfirmClose(false);
          onClose();
        }}
        title={t('confirm' as any)}
        message={t('confirmDiscardChanges' as any)}
        confirmText={t('discard' as any)}
        cancelText={t('cancel')}
        isDestructive={true}
      />
    </Modal>
  );
};
