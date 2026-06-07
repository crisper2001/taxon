import React, { MutableRefObject, useState, useEffect, useRef } from 'react';
import { Icon } from '../common/Icon';
import { Modal } from './Modal';
import { MarkdownInput } from '../common';
import type { DraftEntity } from '../../types';
import { processImage } from '../../utils/imageUtils';
import { ConfirmModal } from './ConfirmModal';

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
  // Cached entity object to keep rendering during close animation
  const [localEntity, setLocalEntity] = useState<DraftEntity | undefined>(undefined);

  // Local form states
  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localMedia, setLocalMedia] = useState<any[]>([]);

  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const prevIdRef = useRef<string | null>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen && touchTimeout.current) {
      clearTimeout(touchTimeout.current);
    }
  }, [isOpen, touchTimeout]);

  useEffect(() => {
    const currentId = selectedEntity ? selectedEntity.id : null;
    const idChanged = currentId !== prevIdRef.current;
    const opened = isOpen && !prevIsOpenRef.current;

    if (isOpen && (idChanged || opened)) {
      prevIdRef.current = currentId;
      setShowConfirmClose(false);
      if (selectedEntity) {
        setLocalEntity(selectedEntity);
        setLocalName(selectedEntity.name || '');
        setLocalDescription(selectedEntity.description || '');
        setLocalMedia(selectedEntity.media ? [...selectedEntity.media] : []);
      }
    }
    prevIsOpenRef.current = isOpen;
    if (!isOpen) {
      prevIdRef.current = null;
    }
  }, [isOpen, selectedEntity]);

  const isNameEmpty = localName.trim() === '';

  const hasChanges = selectedEntity ? (
    localName !== (selectedEntity.name || '') ||
    localDescription !== (selectedEntity.description || '') ||
    JSON.stringify(localMedia) !== JSON.stringify(selectedEntity.media || [])
  ) : false;

  const handleSave = () => {
    if (isNameEmpty || !hasChanges) return;
    if (selectedEntity) {
      updateEntity(selectedEntity.id, {
        name: localName,
        description: localDescription,
        media: localMedia
      });
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

  const handleAddImagesLocal = async (files: FileList | File[] | null) => {
    if (!files) return;
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;
    const processed = await Promise.all(fileArray.map(f => processImage(f)));
    const newMedia = processed.map(p => ({ url: `data:${p.mimeType};base64,${p.base64}` }));

    setLocalMedia(prev => [...prev, ...newMedia]);
  };

  const deleteEntityMediaLocal = (index: number) => {
    setLocalMedia(prev => prev.filter((_, i) => i !== index));
  };

  const reorderEntityMediaLocal = (from: number, to: number) => {
    if (from === to) return;
    const newMedia = [...localMedia];
    const [moved] = newMedia.splice(from, 1);
    newMedia.splice(to, 0, moved);
    setLocalMedia(newMedia);
  };

  const modalTitle = (
    <div className="flex items-center gap-2 min-w-0">
      <Icon name="Box" size={24} className="text-gray-400 shrink-0" />
      <span className="truncate">{localName || t('kbUnnamedEntity' as any)}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="lg">
      <div className="flex flex-col max-h-[75vh] md:max-h-[80vh] bg-bg/80 backdrop-blur-sm rounded-b-3xl overflow-hidden relative">
        <div className="grow overflow-y-auto p-5 md:p-8 flex flex-col gap-6">
          {localEntity ? (
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
                    value={localName}
                    maxLength={150}
                    onChange={e => setLocalName(e.target.value)}
                    className={`input-base text-lg font-medium ${isNameEmpty ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                  <div className="flex justify-between items-start mt-1 min-h-[1.25rem]">
                    {isNameEmpty ? (
                      <span className="text-xs text-red-500 font-semibold text-left">
                        {t('errNameRequired')}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs font-normal opacity-60 ml-auto">
                      {localName.length} / 150
                    </span>
                  </div>
                </label>
                <div className="relative flex flex-col min-w-0 w-full">
                  <MarkdownInput
                    label={t('kbDescription')}
                    value={localDescription}
                    maxLength={2000}
                    onChange={val => setLocalDescription(val)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 bg-panel-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0 min-w-0">
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
                      handleAddImagesLocal(e.dataTransfer.files);
                    }
                  }}
                >
                  {localMedia.map((m, i) => (
                    <div key={i} className={`relative shrink-0 group rounded-xl transition-all ${dragOverId === `entity-media-${i}` ? 'ring-2 ring-accent ring-offset-2 ring-offset-panel-bg scale-[1.02]' : ''} ${draggedMedia?.index === i && draggedMedia.itemId === localEntity.id ? 'opacity-50' : ''}`}
                      draggable
                      data-entity-media-idx={i}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={() => setDraggedMedia({ type: 'entity', itemId: localEntity.id, index: i })}
                      onDragEnd={() => { setDraggedMedia(null); setDragOverId(null); }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedMedia?.type === 'entity' && draggedMedia.itemId === localEntity.id && draggedMedia.index !== i) {
                          if (dragOverId !== `entity-media-${i}`) setDragOverId(`entity-media-${i}`);
                        }
                      }}
                      onDragLeave={() => { if (dragOverId === `entity-media-${i}`) setDragOverId(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverId(null);
                        if (draggedMedia?.type === 'entity' && draggedMedia.itemId === localEntity.id) {
                          reorderEntityMediaLocal(draggedMedia.index, i);
                        }
                        setDraggedMedia(null);
                      }}
                      onTouchStart={(e) => {
                        lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                        touchTimeout.current = setTimeout(() => {
                          setDraggedMedia({ type: 'entity', itemId: localEntity.id, index: i });
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
                            if (!isNaN(targetIdx) && targetIdx !== i) reorderEntityMediaLocal(i, targetIdx);
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
                        type: 'entity',
                        itemId: localEntity.id,
                        mediaIndex: i,
                        mediaObj: localMedia[i],
                        onUpdate: (updates: Partial<Media>) => {
                          setLocalMedia(prev => prev.map((m, idx) => idx === i ? { ...m, ...updates } : m));
                        }
                      })}>
                        <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 pointer-events-none" />
                      </div>
                      <button onClick={() => {
                        deleteEntityMediaLocal(i);
                      }} className="absolute -top-2 -right-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md hover:shadow-lg cursor-pointer z-10"><Icon name="X" size={12} /></button>
                    </div>
                  ))}
                  <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-accent group">
                    <Icon name="Plus" size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{t('kbAdd' as any)}</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                      handleAddImagesLocal(e.target.files);
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Fixed Footer Bar */}
        <div className="p-5 border-t border-white/10 shrink-0 bg-panel-bg/95 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-start">
            {localEntity && (
              <>
                <button onClick={() => { duplicateEntity(localEntity.id); onClose(); }} className="px-4 py-2 text-gray-500 hover:text-accent bg-panel-bg/50 hover:bg-hover-bg rounded-xl border border-border shadow-sm transition-all duration-300 font-bold flex items-center gap-2 cursor-pointer hover:shadow-md">
                  <Icon name="Copy" size={16} /> {t('kbDuplicate')}
                </button>
                <button onClick={() => { setDeleteTarget({ type: 'entity', id: localEntity.id }); onClose(); }} className="px-4 py-2 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-red-600 transition-all duration-300 shadow-md hover:shadow-lg font-bold flex items-center gap-2 cursor-pointer">
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
