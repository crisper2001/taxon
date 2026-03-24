import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Icon } from '../Icon';
import type { DraftKeyData } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { Modal, ConfirmModal } from '../modals';

const flattenHierarchy = <T extends { id: string, parentId?: string }>(items: T[]): { item: T, depth: number }[] => {
  const result: { item: T, depth: number }[] = [];
  const map = new Map<string | undefined, T[]>();
  items.forEach(item => {
    const pid = item.parentId;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(item);
  });
  const traverse = (parentId: string | undefined, depth: number) => {
    const children = map.get(parentId) || [];
    children.forEach(child => {
      result.push({ item: child, depth });
      traverse(child.id, depth + 1);
    });
  };
  traverse(undefined, 0);
  return result;
};

interface BuilderScoringTabProps {
  draftKey: DraftKeyData;
  updateDraftKey: (updater: (prev: DraftKeyData) => DraftKeyData) => void;
  t: (key: string) => string;
}

export const BuilderScoringTab: React.FC<BuilderScoringTabProps> = React.memo(({ draftKey, updateDraftKey, t }) => {
  const [editingNumeric, setEditingNumeric] = useState<{entityId: string, featureId: string, min: string, max: string} | null>(null);
  const [isClearMatrixModalOpen, setIsClearMatrixModalOpen] = useState(false);
  const lastEditingNumeric = useRef<{entityId: string, featureId: string, min: string, max: string} | null>(null);
  if (editingNumeric) lastEditingNumeric.current = editingNumeric;
  const currentEditingNumeric = editingNumeric || lastEditingNumeric.current;
  const tableRef = useRef<HTMLTableElement>(null);
  const lastHighlighted = useRef<HTMLElement[]>([]);

  const flattenedEntities = useMemo(() => flattenHierarchy(draftKey.entities), [draftKey.entities]);
  const flattenedFeatures = useMemo(() => flattenHierarchy(draftKey.features), [draftKey.features]);

  const clearHighlight = useCallback(() => {
    for (const cell of lastHighlighted.current) {
      cell.classList.remove('matrix-highlight');
    }
    lastHighlighted.current = [];
  }, []);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const td = target.closest('td, th') as HTMLTableCellElement;
    const table = tableRef.current;
    if (!td || !table) return clearHighlight();
    
    const tr = td.closest('tr') as HTMLTableRowElement;
    if (!tr) return clearHighlight();
    
    const targetCol = td.cellIndex;
    const targetRow = tr.rowIndex;

    if (tr.dataset.noHighlight === 'true') return clearHighlight();

    clearHighlight();

    // Only highlight if hovering over a scoring data cell (not the headers themselves)
    if (targetCol > 0 && targetRow > 0) {
      const rows = table.rows;
      // Highlight strictly to the left in the same row, including the header and the hovered cell itself
      for (let c = 0; c <= targetCol; c++) {
        const cell = tr.cells[c];
        if (cell) { cell.classList.add('matrix-highlight'); lastHighlighted.current.push(cell); }
      }
      // Highlight strictly upwards in the same column, including the header
      for (let r = 0; r < targetRow; r++) {
        const row = rows[r];
        if (row && row.cells[targetCol]) { 
           row.cells[targetCol].classList.add('matrix-highlight'); 
           lastHighlighted.current.push(row.cells[targetCol]); 
        }
      }
    }
  }, [clearHighlight]);

  const setScore = (entityId: string, itemId: string, value: any) => {
    updateDraftKey(prev => ({
      ...prev,
      entities: prev.entities.map(e => {
        if (e.id === entityId) {
          const newScores = { ...e.scores };
          if (value === null || value === false || value === '') {
            delete newScores[itemId];
          } else {
            newScores[itemId] = value;
          }
          return { ...e, scores: newScores };
        }
        return e;
      })
    }));
  };

  const clearAllScores = useCallback(() => {
    updateDraftKey(prev => ({
      ...prev,
      entities: prev.entities.map(e => ({ ...e, scores: {} }))
    }));
    setIsClearMatrixModalOpen(false);
  }, [updateDraftKey]);

  const getDefaultStateValues = (t: any) => [
    { id: '1', name: t('kbScoreCommon') || 'Common' },
    { id: '2', name: t('kbScoreRare') || 'Rare' },
    { id: '3', name: t('scoreUncertain') || 'Uncertain' },
    { id: '4', name: t('scoreCommonMisinterpret') || 'Common (misinterpreted)' },
    { id: '5', name: t('scoreRareMisinterpret') || 'Rare (misinterpreted)' }
  ];

  const renderScoreSymbol = (v: any) => {
    const isDefault = ['1', '2', '3', '4', '5'].includes(v.id);
    const getSymbolBg = (id: string) => {
       switch(id) {
         case '1': return 'bg-blue-500/10 text-blue-500';
         case '2': return 'bg-green-500/10 text-green-500';
         case '3': return 'bg-gray-500/10 text-text';
         case '4': return 'bg-red-500/10 text-red-500';
         case '5': return 'bg-yellow-500/10 text-yellow-500';
         default: return '';
       }
    };
    const renderCustomIcon = (iconType: string, color: string) => {
       if (iconType === 'question') return <span className="font-bold text-[14px] leading-none" style={{ color }}>?</span>;
       if (iconType === 'exclamation') return <span className="font-bold text-[14px] leading-none" style={{ color }}>!</span>;
       return <Icon name="Check" size={14} style={{ color }} />;
    };

    if (isDefault) {
      return (
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${getSymbolBg(v.id)}`}>
          {v.id === '1' ? <Icon name="Check" size={14} /> : v.id === '2' ? <Icon name="Check" size={14} /> : v.id === '3' ? <span className="font-bold text-[15px] leading-none">?</span> : v.id === '4' ? <Icon name="Check" size={14} /> : <Icon name="Check" size={14} />}
        </div>
      );
    } else {
      return (
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 border border-border" style={{ backgroundColor: `color-mix(in srgb, ${v.color || 'var(--color-accent)'} 15%, transparent)` }}>
          {renderCustomIcon(v.iconType || 'check', v.color || 'var(--color-accent)')}
        </div>
      );
    }
  };

  const getUnitSymbol = (base_unit?: string, unit_prefix?: string) => {
    const UNIT_PREFIX_MAP: Record<string, string> = { 'kilo': 'k', 'hecto': 'h', 'deca': 'da', 'deci': 'd', 'centi': 'c', 'milli': 'm', 'micro': 'µ', 'none': '' };
    const BASE_UNIT_MAP: Record<string, string> = { 'metre': 'm', 'square metre': 'm²', 'cubic metre': 'm³', 'litre': 'l', 'degrees celcius': '°C', 'degrees planar': '°', 'none': '' };
    const prefix = UNIT_PREFIX_MAP[unit_prefix || 'none'] || '';
    const base = BASE_UNIT_MAP[base_unit || 'none'] || '';
    return prefix + base;
  };

  const cycleScore = (entityId: string, stateId: string, currentVal: string, vals: any[]) => {
    const validIds = ['', ...vals.map(v => v.id)];
    const currentIndex = validIds.indexOf(currentVal || '');
    const nextIndex = (currentIndex + 1) % validIds.length;
    const nextVal = validIds[nextIndex];
    setScore(entityId, stateId, nextVal || null);
  };

  if (draftKey.features.length === 0 || draftKey.entities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center opacity-40 text-lg font-medium flex-col gap-4 p-8 text-center animate-fade-in">
        <Icon name="Table" size={48} className="opacity-50" />
        <p>{t('kbNoFeaturesToScore' as any) || 'Add features and entities to build the scoring matrix.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full animate-fade-in min-w-0 min-h-0">
      <div className="p-4 border-b border-white/10 dark:border-white/5 flex items-center justify-between bg-header-bg/85 backdrop-blur-md shadow-sm shrink-0 md:rounded-tl-3xl z-50">
        <div className="flex items-center gap-3">
          <Icon name="Target" size={20} className="text-accent" />
          <h3 className="text-xl font-bold text-accent tracking-tight">{t('kbScoring')}</h3>
        </div>
        <button onClick={() => setIsClearMatrixModalOpen(true)} className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-1 cursor-pointer">
          <Icon name="Eraser" size={14} /> <span className="hidden sm:inline">{t('kbClearMatrix' as any) || 'Clear Matrix'}</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-bg/30 relative custom-scrollbar min-w-0 min-h-0">
        <table 
          id="scoring-matrix-table" 
          ref={tableRef}
          onMouseOver={handleMouseOver}
          onMouseLeave={clearHighlight}
          className="text-left border-collapse w-max min-w-max"
        >
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-40 bg-header-bg p-4 border-b border-border border-r-2 border-r-border w-[140px] min-w-[140px] max-w-[140px] md:w-[250px] md:min-w-[250px] md:max-w-[250px] align-bottom">
              </th>
              {flattenedEntities.map(({ item: e, depth }) => (
                <th key={e.id} className="sticky top-0 z-20 bg-header-bg py-2 px-3 border-b border-r border-border w-[1%] whitespace-nowrap align-bottom text-center">
                  <div className="inline-flex items-center justify-start font-bold h-40 relative pt-[calc(var(--depth)*0.75rem)] md:pt-[calc(var(--depth)*1.5rem)]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', '--depth': depth } as React.CSSProperties}>
                    <span className="truncate max-h-[140px] whitespace-nowrap text-accent" title={e.name}>{e.name || t('kbUnnamedEntity')}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flattenedFeatures.map(({ item: f, depth }) => {
              return (
              <React.Fragment key={f.id}>
                <tr className="transition-colors group/row bg-panel-bg" data-no-highlight={f.type === 'state'}>
                  <td className="sticky left-0 z-30 p-2 md:p-4 border-b border-border border-r-2 border-r-border transition-colors align-middle w-[140px] min-w-[140px] max-w-[140px] md:w-[250px] md:min-w-[250px] md:max-w-[250px] bg-header-bg">
                    <div className="flex items-center gap-2 font-bold relative w-full text-sm md:text-base pl-[calc(var(--depth)*0.75rem)] md:pl-[calc(var(--depth)*1.5rem)]" style={{ '--depth': depth } as React.CSSProperties}>
                       <span className="truncate text-accent" title={f.name}>{f.name || t('kbUnnamedFeature')}</span>
                    </div>
                  </td>
                  {flattenedEntities.map(({ item: e }) => (
                    <td key={e.id} className={`p-2 border-b border-border align-middle w-[1%] whitespace-nowrap ${f.type === 'state' ? 'bg-black/10 dark:bg-black/3' : 'border-r'}`}>
                      {f.type === 'numeric' && (
                        (() => {
                          const score = e.scores[f.id] as { min: number, max: number } | undefined;
                          const hasScore = score !== undefined && score.min !== undefined && score.max !== undefined;
                          const unitSym = getUnitSymbol(f.base_unit, f.unit_prefix);
                          const tooltip = hasScore ? `${score.min} - ${score.max}${unitSym ? ` ${unitSym}` : ''}` : undefined;
                          return (
                            <div className="flex items-center justify-center w-full h-full min-h-[32px]">
                              <button
                                onClick={() => setEditingNumeric({ entityId: e.id, featureId: f.id, min: score?.min?.toString() ?? '', max: score?.max?.toString() ?? '' })}
                                className={`w-full h-full min-w-[32px] rounded-md flex items-center justify-center font-bold text-lg transition-all border cursor-pointer ${hasScore ? 'bg-accent/20 text-accent border-accent/30' : 'bg-transparent text-gray-500 opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 border-border'}`}
                                title={tooltip}
                              >
                                #
                              </button>
                            </div>
                          );
                        })()
                      )}
                    </td>
                  ))}
                </tr>
                {f.type === 'state' && f.states.map(s => (
                  <tr key={s.id} className="transition-colors group/row bg-panel-bg">
                    <td className="sticky left-0 z-30 py-2 md:py-3 px-2 md:px-4 border-b border-border border-r-2 border-r-border transition-colors align-middle w-[140px] min-w-[140px] max-w-[140px] md:w-[250px] md:min-w-[250px] md:max-w-[250px] bg-header-bg text-text font-medium">
                      <div className="flex items-center gap-2 relative w-full text-xs md:text-sm pl-[calc(var(--depth)*0.75rem)] md:pl-[calc(var(--depth)*1.5rem)]" style={{ '--depth': depth + 1 } as React.CSSProperties}>
                         <span className="truncate opacity-90" title={s.name}>{s.name}</span>
                      </div>
                    </td>
                    {flattenedEntities.map(({ item: e }) => (
                      <td key={`${e.id}-${s.id}`} className="p-2 border-b border-r border-border align-middle w-[1%] whitespace-nowrap">
                        {(() => {
                          const scoreVal = e.scores[s.id] as string;
                          const vals = (s as any).values || getDefaultStateValues(t);
                          const selectedVal = vals.find((v: any) => v.id === scoreVal);
                          return (
                              <div className="flex items-center justify-center w-full h-full min-h-[32px]" title={selectedVal?.name}>
                                <CustomSelect 
                                  value={scoreVal || ''} 
                                  onChange={val => setScore(e.id, s.id, val || null)} 
                                  hideChevron={true}
                                  customTrigger={
                                    <div className="flex items-center justify-center w-full">
                                      {scoreVal && selectedVal ? renderScoreSymbol(selectedVal) : null}
                                    </div>
                                  }
                                  onTriggerClick={(ev, toggle) => {
                                    cycleScore(e.id, s.id, scoreVal || '', vals);
                                  }}
                                  onTriggerContextMenu={(ev, toggle) => {
                                    ev.preventDefault();
                                    toggle();
                                  }}
                                  options={[
                                    { value: '', label: <span className="opacity-40 px-2">-</span> }, 
                                    ...vals.map((v: any) => ({ value: v.id, label: <span className="flex items-center gap-2 px-1 whitespace-nowrap">{renderScoreSymbol(v)} <span className="text-[12px] leading-none font-bold">{v.name}</span></span> }))
                                  ]} 
                                  className="w-8 h-8 cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md focus:outline-none flex items-center justify-center transition-colors border border-border" 
                                />
                              </div>
                          );
                        })()}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editingNumeric} onClose={() => setEditingNumeric(null)} title={t('kbScoring')}>
         {currentEditingNumeric && (() => {
           const feature = draftKey.features.find(x => x.id === currentEditingNumeric.featureId);
           const entity = draftKey.entities.find(x => x.id === currentEditingNumeric.entityId);
           const unitSym = feature ? getUnitSymbol(feature.base_unit, feature.unit_prefix) : '';
           return (
             <div className="p-6 flex flex-col gap-4">
               <div className="text-base mb-2">
                 <span className="font-bold text-accent">{feature?.name}</span> <span className="text-accent">&rarr;</span> <span className="font-bold text-accent">{entity?.name}</span>
               </div>
               <div className="flex flex-col sm:flex-row gap-4">
                 <label className="flex flex-col gap-1.5 flex-1">
                   <span className="text-sm font-semibold opacity-80">{t('kbMin')}</span>
                   <div className="relative flex items-center">
                     <input type="number" value={editingNumeric?.min ?? currentEditingNumeric.min} onChange={e => editingNumeric && setEditingNumeric({...editingNumeric, min: e.target.value})} className={`input-base text-lg font-medium w-full ${unitSym ? 'pr-10' : ''}`} />
                     {unitSym && <span className="absolute right-3 text-gray-500 font-bold select-none pointer-events-none">{unitSym}</span>}
                   </div>
                 </label>
                 <label className="flex flex-col gap-1.5 flex-1">
                   <span className="text-sm font-semibold opacity-80">{t('kbMax')}</span>
                   <div className="relative flex items-center">
                     <input type="number" value={editingNumeric?.max ?? currentEditingNumeric.max} onChange={e => editingNumeric && setEditingNumeric({...editingNumeric, max: e.target.value})} className={`input-base text-lg font-medium w-full ${unitSym ? 'pr-10' : ''}`} />
                     {unitSym && <span className="absolute right-3 text-gray-500 font-bold select-none pointer-events-none">{unitSym}</span>}
                   </div>
                 </label>
               </div>
               <div className="mt-4 flex justify-end gap-3">
                 <button onClick={() => {
                    if (!editingNumeric) return;
                    setScore(editingNumeric.entityId, editingNumeric.featureId, null);
                    setEditingNumeric(null);
                 }} className="px-4 py-2 hover:bg-red-500/10 text-red-500 rounded-xl font-medium transition-colors cursor-pointer">{t('kbDelete')}</button>
                 <div className="flex-1"></div>
                 <button onClick={() => setEditingNumeric(null)} className="px-4 py-2 hover:bg-hover-bg/80 rounded-xl font-medium transition-colors cursor-pointer">{t('cancel')}</button>
                 <button onClick={() => {
                    if (!editingNumeric) return;
                    const minVal = parseFloat(editingNumeric.min);
                    const maxVal = parseFloat(editingNumeric.max);
                    if (!isNaN(minVal) && !isNaN(maxVal)) {
                       setScore(editingNumeric.entityId, editingNumeric.featureId, { min: minVal, max: maxVal });
                    } else if (!isNaN(minVal)) {
                       setScore(editingNumeric.entityId, editingNumeric.featureId, { min: minVal, max: minVal });
                    } else if (!isNaN(maxVal)) {
                       setScore(editingNumeric.entityId, editingNumeric.featureId, { min: maxVal, max: maxVal });
                    } else {
                       setScore(editingNumeric.entityId, editingNumeric.featureId, null);
                    }
                    setEditingNumeric(null);
                 }} className="px-4 py-2 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover transition-colors shadow-sm cursor-pointer">{t('save')}</button>
               </div>
             </div>
           );
         })()}
      </Modal>

      <ConfirmModal
        isOpen={isClearMatrixModalOpen}
        onClose={() => setIsClearMatrixModalOpen(false)}
        onConfirm={clearAllScores}
        title={t('kbClearMatrix' as any) || 'Clear Matrix'}
        message={
          <div className="flex items-start gap-3 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            <Icon name="TriangleAlert" size={24} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{t('kbConfirmClearMatrix' as any) || 'Are you sure you want to clear all scores from the matrix? This action cannot be undone.'}</p>
          </div>
        }
        confirmText={t('kbClearMatrix' as any) || 'Clear Matrix'}
        cancelText={t('cancel')}
        isDestructive={true}
      />
    </div>
  );
});