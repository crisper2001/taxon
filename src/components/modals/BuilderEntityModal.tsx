import React, { MutableRefObject, useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { Modal } from './Modal';
import { MarkdownInput } from '../common';
import type { DraftEntity } from '../../types';

interface BuilderEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEntity?: DraftEntity;
  t: (key: string) => string;
  updateEntity: (id: string, updates: Partial<DraftEntity>) => void;
  duplicateEntity: (id: string) => void;
  setDeleteTarget: (target: any) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
  draggedMedia: any;
  setDraggedMedia: (media: any) => void;
  reorderEntityMedia: (entityId: string, from: number, to: number) => void;
  handleAddImages: (files: FileList | File[] | null, id: string) => void;
  setEditingMedia: (media: any) => void;
  ghostRef: React.RefObject<HTMLDivElement>;
  lastTouchPos: MutableRefObject<{ x: number, y: number }>;
  touchTimeout: MutableRefObject<NodeJS.Timeout | null>;
}

export const BuilderEntityModal: React.FC<BuilderEntityModalProps> = ({
  isOpen, onClose, selectedEntity, t, updateEntity, duplicateEntity, setDeleteTarget,
  dragOverId, setDragOverId, draggedMedia, setDraggedMedia, reorderEntityMedia, handleAddImages,
  setEditingMedia, ghostRef, lastTouchPos, touchTimeout
}) => {
  const [cachedEntity, setCachedEntity] = useState<DraftEntity | undefined>(selectedEntity);

  useEffect(() => {
    if (!isOpen && touchTimeout.current) {
      clearTimeout(touchTimeout.current);
    }
  }, [isOpen, touchTimeout]);

  useEffect(() => {
    if (selectedEntity) {
      setCachedEntity(selectedEntity);
    }
  }, [selectedEntity]);

  const entityToRender = selectedEntity || cachedEntity;

  const modalTitle = (
    <div className="flex items-center gap-2 min-w-0">
      <Icon name="Leaf" size={24} className="text-gray-400" />
      <span className="truncate">{entityToRender?.name || t('kbUnnamedEntity' as any)}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="p-5 md:p-8 overflow-y-auto relative max-h-[85vh] bg-bg/80 backdrop-blur-sm rounded-b-3xl">
        {entityToRender ? (
          <div className="flex flex-col gap-6 animate-fade-in-up">

            <div className="flex flex-col gap-4 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0">
              <div className="w-full font-bold text-accent flex items-center gap-2 mb-1 text-left tracking-tight shrink-0">
                <Icon name="Info" size={18} />
                <span className="grow text-base">{t('kbMetadata')}</span>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold opacity-80">{t('kbName')}</span>
                <input type="text" value={entityToRender.name} onChange={e => updateEntity(entityToRender.id, { name: e.target.value })} className="input-base text-lg font-medium" />
              </label>
              <MarkdownInput label={t('kbDescription')} value={entityToRender.description || ''} onChange={val => updateEntity(entityToRender.id, { description: val })} rows={3} />
            </div>

            <div className="flex flex-col gap-3 bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0">
              <div className="w-full font-bold text-accent flex items-center gap-2 mb-1 text-left tracking-tight shrink-0">
                <Icon name="Image" size={18} />
                <span className="grow text-base">{t('kbImages' as any) || 'Images'}</span>
              </div>
              <div
                className={`flex gap-3 overflow-x-auto pb-2 pt-2 px-2 -mx-2 rounded-xl transition-all min-h-[116px] ${dragOverId === 'entity-images' ? 'bg-accent/10 ring-2 ring-accent ring-inset' : ''}`}
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
                    if (dragOverId !== 'entity-images') setDragOverId('entity-images');
                  }
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (dragOverId === 'entity-images') setDragOverId(null);
                }}
                onDrop={(e) => {
                  if (dragOverId === 'entity-images') {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverId(null);
                    handleAddImages(e.dataTransfer.files, entityToRender.id);
                  }
                }}
              >
                {entityToRender.media?.map((m, i) => (
                  <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `entity-media-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg scale-[1.02]' : ''} ${draggedMedia?.index === i && draggedMedia.itemId === entityToRender.id ? 'opacity-50' : ''}`}
                    draggable
                    data-entity-media-idx={i}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={() => setDraggedMedia({ type: 'entity', itemId: entityToRender.id, index: i })}
                    onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedMedia?.type === 'entity' && draggedMedia.itemId === entityToRender.id && draggedMedia.index !== i) {
                        if (dragOverId !== `entity-media-${i}`) setDragOverId(`entity-media-${i}`);
                      }
                    }}
                    onDragLeave={() => { if (dragOverId === `entity-media-${i}`) setDragOverId(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverId(null);
                      if (draggedMedia?.type === 'entity' && draggedMedia.itemId === entityToRender.id) {
                        reorderEntityMedia(entityToRender.id, draggedMedia.index, i);
                      }
                      setDraggedMedia(null);
                    }}
                    onTouchStart={(e) => {
                      lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                      touchTimeout.current = setTimeout(() => {
                        setDraggedMedia({ type: 'entity', itemId: entityToRender.id, index: i });
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
                      const targetMedia = el?.closest('[data-entity-media-idx]');
                      if (targetMedia) {
                        const targetIdx = parseInt(targetMedia.getAttribute('data-entity-media-idx') || '-1');
                        if (targetIdx !== -1 && targetIdx !== i && dragOverId !== `entity-media-${targetIdx}`) setDragOverId(`entity-media-${targetIdx}`);
                      } else {
                        if (dragOverId) setDragOverId(null);
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (draggedMedia) e.stopPropagation();
                      if (touchTimeout.current) clearTimeout(touchTimeout.current);
                      if (draggedMedia) {
                        if (e.cancelable) e.preventDefault();
                        if (dragOverId && dragOverId.startsWith('entity-media-')) {
                          const targetIdx = parseInt(dragOverId.replace('entity-media-', ''));
                          if (!isNaN(targetIdx) && targetIdx !== i) reorderEntityMedia(entityToRender.id, i, targetIdx);
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
                    <div className="h-24 w-24 relative overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md cursor-move group-hover:shadow-lg transition-all" onClick={() => setEditingMedia({ type: 'entity', itemId: entityToRender.id, mediaIndex: i })}>
                      <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                    </div>
                    <button onClick={() => {
                      setDeleteTarget({ type: 'entityMedia', id: entityToRender.id, mediaIndex: i });
                    }} className="absolute -top-2 -right-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md hover:shadow-lg cursor-pointer z-10"><Icon name="X" size={12} /></button>
                  </div>
                ))}
                <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-accent group">
                  <Icon name="Plus" size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{t('kbAdd' as any)}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                    handleAddImages(e.target.files, entityToRender.id);
                    e.target.value = '';
                  }} />
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center mt-2 pt-2">
              <button onClick={() => duplicateEntity(entityToRender.id)} className="px-4 py-2 text-gray-500 hover:text-accent bg-panel-bg/50 hover:bg-hover-bg rounded-xl border border-border shadow-sm transition-all font-semibold flex items-center gap-2 cursor-pointer">
                <Icon name="Copy" size={16} /> {t('kbDuplicate')}
              </button>
              <button onClick={() => setDeleteTarget({ type: 'entity', id: entityToRender.id })} className="px-4 py-2 text-red-500 hover:text-white hover:bg-red-500 bg-red-500/10 rounded-xl border border-red-500/20 shadow-sm transition-all font-semibold flex items-center gap-2 cursor-pointer">
                <Icon name="Trash2" size={16} /> {t('kbDelete')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
