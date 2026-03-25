import React, { MutableRefObject, useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { Modal } from './Modal';
import { MarkdownInput } from '../common';
import { CustomSelect } from '../common';
import type { DraftFeature, DraftState } from '../../types';

const reorderArray = <T,>(arr: T[], from: number, to: number): T[] => {
  const newArr = [...arr];
  const [moved] = newArr.splice(from, 1);
  newArr.splice(to, 0, moved);
  return newArr;
};

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
  const [cachedFeature, setCachedFeature] = useState<DraftFeature | undefined>(selectedFeature);
  const [cachedState, setCachedState] = useState<DraftState | undefined>(selectedState);
  const [cachedStateParent, setCachedStateParent] = useState<DraftFeature | undefined>(selectedStateParent);
  const [cachedMode, setCachedMode] = useState<'feature' | 'state'>('feature');

  useEffect(() => {
    if (selectedFeature) setCachedFeature(selectedFeature);
    if (selectedState) setCachedState(selectedState);
    if (selectedStateParent) setCachedStateParent(selectedStateParent);

    if (selectedState) {
      setCachedMode('state');
    } else if (selectedFeature) {
      setCachedMode('feature');
    }
  }, [selectedFeature, selectedState, selectedStateParent]);

  const featureToRender = selectedFeature || cachedFeature;
  const stateToRender = selectedState || cachedState;
  const stateParentToRender = selectedStateParent || cachedStateParent;

  const modalTitle = stateToRender && stateParentToRender ? (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 leading-none truncate">{stateParentToRender.name || t('kbUnnamedFeature')}</span>
        <span className="truncate leading-tight">{stateToRender.name || t('kbStateName' as any) || 'Unnamed State'}</span>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-2 min-w-0">
      <Icon name={featureToRender?.type === 'state' ? 'ListTree' : 'Hash'} size={24} className="text-gray-400" />
      <span className="truncate">{featureToRender?.name || t('kbUnnamedFeature')}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="p-5 md:p-8 overflow-y-auto relative max-h-[85vh] bg-bg/80 backdrop-blur-sm rounded-b-3xl">
        {cachedMode === 'feature' && featureToRender ? (
          <div className="flex flex-col gap-6 animate-fade-in-up">

            <div className="flex flex-col gap-4 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 relative z-10">
              <div className="w-full font-bold text-accent flex items-center gap-2 mb-1 text-left tracking-tight shrink-0">
                <Icon name="Info" size={18} />
                <span className="grow text-base">{t('kbMetadata')}</span>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbName')}</span>
                <input type="text" value={featureToRender.name} onChange={e => updateFeature(featureToRender.id, { name: e.target.value })} className="input-base text-lg font-medium" />
              </label>

              <MarkdownInput label={t('kbDescription')} value={featureToRender.description || ''} onChange={val => updateFeature(featureToRender.id, { description: val })} rows={3} />

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbType')}</span>
                <CustomSelect
                  value={featureToRender.type}
                  onChange={val => requestTypeChange(featureToRender.id, val as 'numeric' | 'state')}
                  options={[{ value: 'state', label: t('kbTypeState') }, { value: 'numeric', label: t('kbTypeNumeric') }]}
                  className="input-base cursor-pointer"
                />
              </label>

              {featureToRender.type === 'numeric' && (
                <div className="flex gap-4">
                  <label className="flex flex-col gap-1.5 flex-1">
                    <span className="text-sm font-semibold opacity-80">{t('kbUnitPrefix' as any) || 'Unit Prefix'}</span>
                    <CustomSelect
                      value={featureToRender.unit_prefix || 'none'}
                      onChange={val => updateFeature(featureToRender.id, { unit_prefix: val })}
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
                      className="input-base cursor-pointer"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 flex-1">
                    <span className="text-sm font-semibold opacity-80">{t('kbBaseUnit' as any) || 'Base Unit'}</span>
                    <CustomSelect
                      value={featureToRender.base_unit || 'none'}
                      onChange={val => updateFeature(featureToRender.id, { base_unit: val })}
                      options={[
                        { value: 'none', label: t('unitNone' as any) },
                        { value: 'metre', label: t('unitMetre' as any) },
                        { value: 'square metre', label: t('unitSquareMetre' as any) },
                        { value: 'cubic metre', label: t('unitCubicMetre' as any) },
                        { value: 'litre', label: t('unitLitre' as any) },
                        { value: 'degrees celcius', label: t('unitCelsius' as any) },
                        { value: 'degrees planar', label: t('unitDegree' as any) },
                      ]}
                      className="input-base cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0">
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
                    handleAddImages(e.dataTransfer.files, 'feature', featureToRender.id);
                  }
                }}
              >
                {featureToRender.media?.map((m, i) => (
                  <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `feature-media-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg scale-[1.02]' : ''} ${draggedMedia?.index === i && draggedMedia.itemId === featureToRender.id ? 'opacity-50' : ''}`}
                    draggable
                    data-feature-media-idx={i}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={() => setDraggedMedia({ type: 'feature', itemId: featureToRender.id, index: i })}
                    onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedMedia?.type === 'feature' && draggedMedia.itemId === featureToRender.id && draggedMedia.index !== i) {
                        if (dragOverId !== `feature-media-${i}`) setDragOverId(`feature-media-${i}`);
                      }
                    }}
                    onDragLeave={() => { if (dragOverId === `feature-media-${i}`) setDragOverId(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverId(null);
                      if (draggedMedia?.type === 'feature' && draggedMedia.itemId === featureToRender.id) {
                        reorderFeatureMedia(featureToRender.id, draggedMedia.index, i);
                      }
                      setDraggedMedia(null);
                    }}
                    onTouchStart={(e) => {
                      lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                      touchTimeout.current = setTimeout(() => {
                        setDraggedMedia({ type: 'feature', itemId: featureToRender.id, index: i });
                        if (navigator.vibrate) navigator.vibrate(50);
                      }, 300);
                    }}
                    onTouchMove={(e) => {
                      if (draggedMedia) e.stopPropagation();
                      const touch = e.touches[0];
                      lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                      if (ghostRef.current) {
                        ghostRef.current.style.left = `${touch.clientX}px`;
                        ghostRef.current.style.top = `${touch.clientY}px`;
                      }
                      if (!draggedMedia) {
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        return;
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
                          if (!isNaN(targetIdx) && targetIdx !== i) reorderFeatureMedia(featureToRender.id, i, targetIdx);
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
                    <div className="h-24 w-24 relative overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md cursor-move group-hover:shadow-lg transition-all" onClick={() => setEditingMedia({ type: 'feature', itemId: featureToRender.id, mediaIndex: i })}>
                      <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                    </div>

                    <button onClick={() => {
                      setDeleteTarget({ type: 'featureMedia', id: featureToRender.id, mediaIndex: i });
                    }} className="absolute -top-2 -right-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md hover:shadow-lg cursor-pointer z-10"><Icon name="X" size={12} /></button>
                  </div>
                ))}
                <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-accent group">
                  <Icon name="Plus" size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{t('kbAdd' as any)}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                    handleAddImages(e.target.files, 'feature', featureToRender.id);
                    e.target.value = '';
                  }} />
                </label>
              </div>
            </div>

            {featureToRender.type === 'state' && (
              <div className="flex flex-col gap-3 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0">
                <div className="flex items-center w-full mb-1 shrink-0">
                  <div className="grow font-bold text-accent flex items-center gap-2 text-left tracking-tight">
                    <Icon name="List" size={18} />
                    <span className="grow text-base">{t('kbStates')}</span>
                  </div>
                  <button onClick={() => { addState(featureToRender.id); if (collapsedFeatures.has(featureToRender.id)) toggleFeatureCollapse(featureToRender.id); }} className="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-accent/30">
                    <Icon name="Plus" size={14} /> {t('kbAdd' as any)}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {featureToRender.states.length === 0 ? (
                    <span className="text-sm opacity-50 italic">{t('kbNoStatesDefined' as any)}</span>
                  ) : (
                    featureToRender.states.map(s => (
                      <div key={s.id} onClick={() => setSelectedFeatureId(s.id)} className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border hover:border-accent/50 cursor-pointer transition-colors group/editstate shadow-sm hover:shadow-md">
                        <span className="text-sm font-medium truncate flex-1">{s.name || t('kbStateName' as any) || 'Unnamed State'}</span>
                        <Icon name="ChevronRight" size={16} className="opacity-40 group-hover/editstate:opacity-100 group-hover/editstate:text-accent transition-all" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-2 pt-2">
              <button onClick={() => duplicateFeature(featureToRender.id)} className="px-4 py-2 text-gray-500 hover:text-accent bg-panel-bg/50 hover:bg-hover-bg rounded-xl border border-border shadow-sm transition-all font-semibold flex items-center gap-2 cursor-pointer">
                <Icon name="Copy" size={16} /> {t('kbDuplicate')}
              </button>
              <button onClick={() => setDeleteTarget({ type: 'feature', id: featureToRender.id })} className="px-4 py-2 text-red-500 hover:text-white hover:bg-red-500 bg-red-500/10 rounded-xl border border-red-500/20 shadow-sm transition-all font-semibold flex items-center gap-2 cursor-pointer">
                <Icon name="Trash2" size={16} /> {t('kbDelete')}
              </button>
            </div>

          </div>
        ) : cachedMode === 'state' && stateToRender && stateParentToRender ? (
          <div className="flex flex-col gap-6 animate-fade-in-up">

            <div className="flex flex-col gap-4 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0">
              <div className="w-full font-bold text-accent flex items-center gap-2 mb-1 text-left tracking-tight shrink-0">
                <Icon name="Info" size={18} />
                <span className="grow text-base">{t('kbMetadata')}</span>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbName')}</span>
                <input type="text" value={stateToRender.name} onChange={e => updateState(stateParentToRender.id, stateToRender.id, { name: e.target.value })} className="input-base text-lg font-medium" />
              </label>
              <MarkdownInput label={t('kbDescription')} value={(stateToRender as any).description || ''} onChange={val => updateState(stateParentToRender.id, stateToRender.id, { description: val })} rows={3} />
            </div>

            {/* State Media Section */}
            <div className="flex flex-col gap-3 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0">
              <div className="w-full font-bold text-accent flex items-center gap-2 mb-1 text-left tracking-tight shrink-0">
                <Icon name="Image" size={18} />
                <span className="grow text-base">{t('kbImages' as any) || 'Images'}</span>
              </div>
              <div
                className={`flex gap-3 overflow-x-auto pb-2 pt-2 px-2 -mx-2 rounded-xl transition-all min-h-[116px] ${dragOverId === `state-images-${stateToRender.id}` ? 'bg-accent/10 ring-2 ring-accent ring-inset' : ''}`}
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
                    if (dragOverId !== `state-images-${stateToRender.id}`) setDragOverId(`state-images-${stateToRender.id}`);
                  }
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (dragOverId === `state-images-${stateToRender.id}`) setDragOverId(null);
                }}
                onDrop={(e) => {
                  if (dragOverId === `state-images-${stateToRender.id}`) {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverId(null);
                    handleAddImages(e.dataTransfer.files, 'state', stateToRender.id, stateParentToRender.id);
                  }
                }}
              >
                {stateToRender.media?.map((m, i) => (
                  <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `state-media-${stateToRender.id}-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg scale-[1.02]' : ''} ${draggedMedia?.index === i && draggedMedia.stateId === stateToRender.id ? 'opacity-50' : ''}`}
                    draggable
                    data-state-media-idx={i}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={() => setDraggedMedia({ type: 'state', itemId: stateParentToRender.id, stateId: stateToRender.id, index: i })}
                    onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedMedia?.type === 'state' && draggedMedia.itemId === stateParentToRender.id && draggedMedia.stateId === stateToRender.id && draggedMedia.index !== i) {
                        if (dragOverId !== `state-media-${stateToRender.id}-${i}`) setDragOverId(`state-media-${stateToRender.id}-${i}`);
                      }
                    }}
                    onDragLeave={() => { if (dragOverId === `state-media-${stateToRender.id}-${i}`) setDragOverId(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverId(null);
                      if (draggedMedia?.type === 'state' && draggedMedia.itemId === stateParentToRender.id && draggedMedia.stateId === stateToRender.id) {
                        reorderStateMedia(stateParentToRender.id, stateToRender.id, draggedMedia.index, i);
                      }
                      setDraggedMedia(null);
                    }}
                    onTouchStart={(e) => {
                      lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                      touchTimeout.current = setTimeout(() => {
                        setDraggedMedia({ type: 'state', itemId: stateParentToRender.id, stateId: stateToRender.id, index: i });
                        if (navigator.vibrate) navigator.vibrate(50);
                      }, 300);
                    }}
                    onTouchMove={(e) => {
                      if (draggedMedia) e.stopPropagation();
                      const touch = e.touches[0];
                      lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                      if (ghostRef.current) {
                        ghostRef.current.style.left = `${touch.clientX}px`;
                        ghostRef.current.style.top = `${touch.clientY}px`;
                      }
                      if (!draggedMedia) {
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        return;
                      }
                      const el = document.elementFromPoint(touch.clientX, touch.clientY);
                      const targetMedia = el?.closest('[data-state-media-idx]');
                      if (targetMedia) {
                        const targetIdx = parseInt(targetMedia.getAttribute('data-state-media-idx') || '-1');
                        if (targetIdx !== -1 && targetIdx !== i && dragOverId !== `state-media-${stateToRender.id}-${targetIdx}`) setDragOverId(`state-media-${stateToRender.id}-${targetIdx}`);
                      } else {
                        if (dragOverId) setDragOverId(null);
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (draggedMedia) e.stopPropagation();
                      if (touchTimeout.current) clearTimeout(touchTimeout.current);
                      if (draggedMedia) {
                        if (e.cancelable) e.preventDefault();
                        if (dragOverId && dragOverId.startsWith(`state-media-${stateToRender.id}-`)) {
                          const targetIdx = parseInt(dragOverId.replace(`state-media-${stateToRender.id}-`, ''));
                          if (!isNaN(targetIdx) && targetIdx !== i) reorderStateMedia(stateParentToRender.id, stateToRender.id, i, targetIdx);
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
                    <div className="h-24 w-24 relative overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md cursor-move group-hover:shadow-lg transition-all" onClick={() => setEditingMedia({ type: 'state', itemId: stateParentToRender.id, stateId: stateToRender.id, mediaIndex: i })}>
                      <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                    </div>
                    <button onClick={() => {
                      setDeleteTarget({ type: 'stateMedia', id: stateToRender.id, parentId: stateParentToRender.id, mediaIndex: i });
                    }} className="absolute -top-2 -right-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md hover:shadow-lg cursor-pointer z-10"><Icon name="X" size={12} /></button>
                  </div>
                ))}
                <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-accent group" title={t('kbAddImage' as any)}>
                  <Icon name="Plus" size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{t('kbAdd' as any)}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                    handleAddImages(e.target.files, 'state', stateToRender.id, stateParentToRender.id);
                    e.target.value = '';
                  }} />
                </label>
              </div>
            </div>

            {/* State Values Section */}
            <div className="flex flex-col gap-3 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0">
              <div className="flex items-center w-full mb-1 shrink-0">
                <div className="grow font-bold text-accent flex items-center gap-2 text-left tracking-tight">
                  <Icon name="Target" size={18} />
                  <span className="grow text-base">{t('value' as any) || 'Values'}</span>
                </div>
                <button onClick={() => addStateValue(stateParentToRender.id, stateToRender.id)} className="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-accent/30"><Icon name="Plus" size={14} /> {t('kbAdd' as any)}</button>
              </div>
              <div className="flex flex-col gap-2">
                {((stateToRender as any).values || getDefaultStateValues(t)).map((v: any, vIndex: number) => {
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
                      data-state-id={stateToRender.id}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => { if (isDefault) return e.preventDefault(); e.stopPropagation(); setDraggedValue({ stateId: stateToRender.id, index: vIndex }); }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (isDefault) return;
                        if (draggedValue?.stateId === stateToRender.id && draggedValue.index !== vIndex) {
                          if (dragOverId !== `value-${stateToRender.id}-${vIndex}`) setDragOverId(`value-${stateToRender.id}-${vIndex}`);
                        }
                      }}
                      onDragLeave={() => { if (!isDefault && dragOverId === `value-${stateToRender.id}-${vIndex}`) setDragOverId(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverId(null);
                        if (!isDefault && draggedValue?.stateId === stateToRender.id) {
                          updateDraftKey(prev => ({
                            ...prev,
                            features: prev.features.map(f => f.id === stateParentToRender.id ? {
                              ...f, states: f.states.map(st => st.id === stateToRender.id ? {
                                ...st, values: reorderArray((st as any).values || getDefaultStateValues(t), draggedValue.index, vIndex)
                              } : st)
                            } : f)
                          }));
                        }
                        setDraggedValue(null);
                      }}
                      onDragEnd={() => { setDraggedValue(null); setDragOverId(null); }}
                      onTouchStart={(e) => {
                        if (isDefault) return;
                        lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                        touchTimeout.current = setTimeout(() => {
                          setDraggedValue({ stateId: stateToRender.id, index: vIndex });
                          if (navigator.vibrate) navigator.vibrate(50);
                        }, 300);
                      }}
                      onTouchMove={(e) => {
                        if (draggedValue) e.stopPropagation();
                        const touch = e.touches[0];
                        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                        if (ghostRef.current) {
                          ghostRef.current.style.left = `${touch.clientX}px`;
                          ghostRef.current.style.top = `${touch.clientY}px`;
                        }
                        if (!draggedValue) {
                          if (touchTimeout.current) clearTimeout(touchTimeout.current);
                          return;
                        }
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const targetVal = el?.closest('[data-state-value-idx]');
                        if (targetVal) {
                          const targetIdx = parseInt(targetVal.getAttribute('data-state-value-idx') || '-1');
                          const targetStateId = targetVal.getAttribute('data-state-id');
                          if (targetIdx >= 5 && targetStateId === stateToRender.id && targetIdx !== -1 && targetIdx !== vIndex && dragOverId !== `value-${stateToRender.id}-${targetIdx}`) setDragOverId(`value-${stateToRender.id}-${targetIdx}`);
                        } else {
                          if (dragOverId) setDragOverId(null);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (draggedValue) e.stopPropagation();
                        if (touchTimeout.current) clearTimeout(touchTimeout.current);
                        if (draggedValue) {
                          if (e.cancelable) e.preventDefault();
                          if (dragOverId && dragOverId.startsWith(`value-${stateToRender.id}-`)) {
                            let targetIdx = parseInt(dragOverId.replace(`value-${stateToRender.id}-`, ''));
                            if (targetIdx < 5) targetIdx = 5;
                            if (!isNaN(targetIdx) && targetIdx !== vIndex) {
                              updateDraftKey(prev => ({
                                ...prev,
                                features: prev.features.map(f => f.id === stateParentToRender.id ? {
                                  ...f, states: f.states.map(st => st.id === stateToRender.id ? {
                                    ...st, values: reorderArray((st as any).values || getDefaultStateValues(t), draggedValue.index, targetIdx)
                                  } : st)
                                } : f)
                              }));
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
                      className={`flex gap-3 items-center group/val ${!isDefault ? 'cursor-grab hover:bg-black/5 dark:hover:bg-white/5' : ''} rounded-xl px-3 py-2 -mx-3 transition-all ${dragOverId === `value-${stateToRender.id}-${vIndex}` ? 'ring-2 ring-accent scale-[1.02] bg-accent/5' : ''} ${draggedValue?.index === vIndex && draggedValue?.stateId === stateToRender.id ? 'opacity-50' : ''}`}
                    >
                      <Icon name="GripVertical" size={16} className={`opacity-30 shrink-0 transition-opacity ${!isDefault ? 'group-hover/val:opacity-100 cursor-grab' : 'invisible'}`} />
                      {isDefault ? (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getSymbolBg(v.id)}`}>
                          {v.id === '1' ? <Icon name="Check" size={16} /> : v.id === '2' ? <Icon name="Check" size={16} /> : v.id === '3' ? <span className="font-bold text-[17px] leading-none">?</span> : v.id === '4' ? <Icon name="Check" size={16} /> : <Icon name="Check" size={16} />}
                        </div>
                      ) : (
                        <button onClick={() => updateStateValue(stateParentToRender.id, stateToRender.id, v.id, { iconType: cycleIcon(v.iconType || 'check') })} title={t('edit' as any)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity border border-border" style={{ backgroundColor: `color-mix(in srgb, ${v.color || 'var(--color-accent)'} 15%, transparent)` }}>
                          {renderCustomIcon(v.iconType || 'check', v.color || 'var(--color-accent)')}
                        </button>
                      )}

                      {isDefault ? (
                        <span className="flex-1 text-sm px-2 py-1.5 font-medium opacity-80">{v.name}</span>
                      ) : (
                        <input type="text" value={v.name} onChange={e => updateStateValue(stateParentToRender.id, stateToRender.id, v.id, { name: e.target.value })} className="flex-1 text-sm p-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg focus:border-accent hover:border-black/20 dark:hover:border-white/20 focus:outline-none transition-colors" placeholder={t('value' as any)} />
                      )}

                      {!isDefault && <input type="color" value={v.color || '#3b82f6'} onChange={e => updateStateValue(stateParentToRender.id, stateToRender.id, v.id, { color: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent shrink-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-lg" title="Select color" />}
                      {!isDefault && <button onClick={() => deleteStateValue(stateParentToRender.id, stateToRender.id, v.id)} className="opacity-0 group-hover/val:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20"><Icon name="X" size={16} /></button>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center mt-2 pt-2">
              <button onClick={() => duplicateState(stateParentToRender.id, stateToRender.id)} className="px-4 py-2 text-gray-500 hover:text-accent bg-panel-bg/50 hover:bg-hover-bg rounded-xl border border-border shadow-sm transition-all font-semibold flex items-center gap-2 cursor-pointer">
                <Icon name="Copy" size={16} /> {t('kbDuplicate')}
              </button>
              <button onClick={() => setDeleteTarget({ type: 'state', id: stateToRender.id, parentId: stateParentToRender.id })} className="px-4 py-2 text-red-500 hover:text-white hover:bg-red-500 bg-red-500/10 rounded-xl border border-red-500/20 shadow-sm transition-all font-semibold flex items-center gap-2 cursor-pointer">
                <Icon name="Trash2" size={16} /> {t('kbDelete')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
