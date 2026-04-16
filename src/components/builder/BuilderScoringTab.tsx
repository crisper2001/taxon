import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../common/Icon';
import type { DraftKeyData } from '../../types';
import { CustomSelect } from '../common';
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
  isActive?: boolean;
}

export const BuilderScoringTab: React.FC<BuilderScoringTabProps> = React.memo(({ draftKey, updateDraftKey, t, isActive = true }) => {
  const lastActiveDraft = useRef(draftKey);
  if (isActive) {
    lastActiveDraft.current = draftKey;
  }
  const displayDraft = isActive ? draftKey : lastActiveDraft.current;

  const [editingNumeric, setEditingNumeric] = useState<{ entityId: string, featureId: string, min: string, max: string } | null>(null);
  const [isClearMatrixModalOpen, setIsClearMatrixModalOpen] = useState(false);
  const lastEditingNumeric = useRef<{ entityId: string, featureId: string, min: string, max: string } | null>(null);
  if (editingNumeric) lastEditingNumeric.current = editingNumeric;
  const currentEditingNumeric = editingNumeric || lastEditingNumeric.current;
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFooter = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setIsFooterVisible(true);
  }, []);

  const hideFooter = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsFooterVisible(false);
    }, 300);
  }, []);

  useEffect(() => {
    return () => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); };
  }, []);

  const tableRef = useRef<HTMLTableElement>(null);
  const lastHighlighted = useRef<HTMLElement[]>([]);
  const [contextMenu, setContextMenu] = useState<{ entityId: string, stateId: string, x: number, y: number, scoreVal: string, vals: any[] } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [scrollPos, setScrollPos] = useState({ top: 0, left: 0 });

  const flattenedEntities = useMemo(() => flattenHierarchy(displayDraft.entities), [displayDraft.entities]);
  const flattenedFeatures = useMemo(() => flattenHierarchy(displayDraft.features), [displayDraft.features]);

  const matrixRows = useMemo(() => {
    const rows: { type: 'feature' | 'state', f: any, s?: any, depth: number }[] = [];
    flattenedFeatures.forEach(({ item: f, depth }) => {
      rows.push({ type: 'feature', f, depth });
      if (f.type === 'state') {
        f.states.forEach((s: any) => {
          rows.push({ type: 'state', f, s, depth: depth + 1 });
        });
      }
    });
    return rows;
  }, [flattenedFeatures]);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const lower = searchTerm.toLowerCase().trim();
    if (!lower) return [];
    const m: { type: 'col' | 'row', index: number, id: string }[] = [];
    flattenedEntities.forEach((e, i) => {
      if (e.item.name.toLowerCase().includes(lower)) m.push({ type: 'col', index: i, id: e.item.id });
    });
    matrixRows.forEach((r, i) => {
      const name = r.type === 'feature' ? r.f.name : r.s.name;
      if (name.toLowerCase().includes(lower)) m.push({ type: 'row', index: i, id: r.type === 'feature' ? r.f.id : r.s.id });
    });
    return m;
  }, [searchTerm, flattenedEntities, matrixRows]);

  const matchingIds = useMemo(() => new Set(matches.map(m => m.id)), [matches]);
  const activeMatchId = matches.length > 0 ? matches[currentMatchIndex]?.id : null;

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchTerm, matches]);

  useEffect(() => {
    if (matches.length > 0 && matches[currentMatchIndex]) {
      const match = matches[currentMatchIndex];
      const container = tableRef.current?.parentElement;
      if (container) {
        if (match.type === 'col') {
          container.scrollTo({ left: Math.max(0, (match.index - 1) * COL_WIDTH), behavior: 'smooth' });
        } else {
          container.scrollTo({ top: Math.max(0, (match.index - 1) * ROW_HEIGHT), behavior: 'smooth' });
        }
      }
    }
  }, [currentMatchIndex, matches]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollPos({
      top: e.currentTarget.scrollTop,
      left: e.currentTarget.scrollLeft
    });
  }, []);

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

    if (tr.dataset.noHighlight === 'true' || td.dataset.spacer === 'true') return clearHighlight();

    clearHighlight();

    // Only highlight if hovering over a scoring data cell (not the headers themselves)
    if (targetCol > 0 && targetRow > 0) {
      const rows = table.rows;
      // Highlight strictly to the left in the same row, including the header and the hovered cell itself
      for (let c = 0; c <= targetCol; c++) {
        const cell = tr.cells[c];
        if (cell && cell.dataset.spacer !== 'true') { cell.classList.add('matrix-highlight'); lastHighlighted.current.push(cell); }
      }
      // Highlight strictly upwards in the same column, including the header
      for (let r = 0; r < targetRow; r++) {
        const row = rows[r];
        if (row && row.cells[targetCol] && row.dataset.spacer !== 'true' && row.cells[targetCol].dataset.spacer !== 'true') {
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
      switch (id) {
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

  // --- Native 2D Virtualization ---
  const ROW_HEIGHT = 48; // Approx height of a matrix row
  const COL_WIDTH = 49;  // 32px select + 16px padding + 1px border
  const OVERSCAN = 5;    // Pre-render rows/cols outside viewport for smooth scrolling

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1600;

  const startRow = Math.max(0, Math.floor(scrollPos.top / ROW_HEIGHT) - OVERSCAN);
  const endRow = Math.min(matrixRows.length, Math.ceil((scrollPos.top + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
  const visibleRows = matrixRows.slice(startRow, endRow);
  const topSpacerHeight = startRow * ROW_HEIGHT;
  const bottomSpacerHeight = (matrixRows.length - endRow) * ROW_HEIGHT;

  const startCol = Math.max(0, Math.floor(scrollPos.left / COL_WIDTH) - OVERSCAN);
  const endCol = Math.min(flattenedEntities.length, Math.ceil((scrollPos.left + viewportWidth) / COL_WIDTH) + OVERSCAN);
  const visibleEntities = flattenedEntities.slice(startCol, endCol);
  const leftSpacerWidth = startCol * COL_WIDTH;
  const rightSpacerWidth = (flattenedEntities.length - endCol) * COL_WIDTH;

  if (displayDraft.features.length === 0 || displayDraft.entities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center opacity-40 text-lg font-medium flex-col gap-4 p-8 text-center animate-fade-in">
        <Icon name="Table" size={48} className="opacity-50" />
        <p>{t('kbNoFeaturesToScore' as any) || 'Add features and entities to build the scoring matrix.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full animate-fade-in min-w-0 min-h-0 relative">
      <div className="p-4 border-b border-white/10 dark:border-white/5 flex items-center justify-between bg-header-bg/85 backdrop-blur-md shadow-sm shrink-0 md:rounded-tl-3xl z-50 gap-4">
        <div className="panel-title font-bold flex-1 min-w-0 flex items-center gap-2 whitespace-nowrap tracking-tight pr-2">
          <Icon name="Target" size={24} className="shrink-0 text-accent" />
          <span className="truncate min-w-0 text-accent bg-transparent" title={t('kbScoring')}>
            {t('kbScoring')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`search-container group flex items-center gap-1 py-1.5 px-3 rounded-full relative transition-all duration-300 focus-within:bg-bg/80 focus-within:shadow-inner focus-within:backdrop-blur-md border border-transparent focus-within:border-white/10 cursor-text shrink-0 ${matches.length > 0 || searchTerm ? 'bg-bg/80 shadow-inner backdrop-blur-md border-white/10' : 'hover:bg-bg/50 cursor-pointer'}`}
            onClick={() => searchInputRef.current?.focus()}
          >
            <Icon name="Search" className="shrink-0 text-gray-500" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search')}
              className={`transition-all duration-300 ease-in-out border-none bg-transparent outline-none text-sm p-0 ${matches.length > 0 || searchTerm ? 'w-24 opacity-100' : 'w-0 opacity-0 group-hover:w-32 group-hover:opacity-100 focus:w-32 focus:opacity-100'}`}
            />
            {searchTerm && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setSearchTerm(''); searchInputRef.current?.focus(); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center text-gray-500 hover:text-accent transition-colors shrink-0" title={t('clearSearch')}>
                <Icon name="X" size={14} />
              </button>
            )}
            {matches.length > 0 && (
              <div className="flex items-center gap-0.5 transition-opacity opacity-100 text-accent">
                <span className="text-xs font-medium whitespace-nowrap px-1">{currentMatchIndex + 1} / {matches.length}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setCurrentMatchIndex(prev => prev > 0 ? prev - 1 : matches.length - 1); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title={t('prevMatch')}><Icon name="ChevronUp" size={14} /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setCurrentMatchIndex(prev => prev < matches.length - 1 ? prev + 1 : 0); }} className="p-0.5 hover:bg-accent/20 rounded cursor-pointer flex items-center justify-center" title={t('nextMatch')}><Icon name="ChevronDown" size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-bg/30 relative custom-scrollbar min-w-0 min-h-0" onScroll={handleScroll} onMouseEnter={showFooter} onMouseLeave={hideFooter}>
        <table
          id="scoring-matrix-table"
          ref={tableRef}
          onMouseOver={handleMouseOver}
          onMouseLeave={clearHighlight}
          className="text-left border-separate border-spacing-0 w-max min-w-max"
        >
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-40 bg-header-bg p-4 border-b border-border border-r-2 border-r-border w-[140px] min-w-[140px] max-w-[140px] md:w-[250px] md:min-w-[250px] md:max-w-[250px] align-bottom">
              </th>
              {leftSpacerWidth > 0 && <th style={{ minWidth: leftSpacerWidth, padding: 0, border: 0 }} data-spacer="true"></th>}
              {visibleEntities.map(({ item: e, depth }) => {
                const isMatch = matchingIds.has(e.id);
                const isActiveMatch = activeMatchId === e.id;
                const isSearchDimmed = !!searchTerm && !isMatch;
                return (
                <th key={e.id} data-search-match={isMatch ? "true" : undefined} data-search-active={isActiveMatch ? "true" : undefined} className={`sticky top-0 z-20 bg-header-bg py-2 px-3 border-b border-r border-border w-[1%] whitespace-nowrap align-bottom text-center transition-all duration-300 ${isMatch ? 'after:absolute after:inset-0 after:bg-accent/20 after:pointer-events-none' : ''} ${isActiveMatch ? 'after:absolute after:inset-0 after:ring-2 after:ring-accent after:ring-inset after:pointer-events-none' : ''}`}>
                  <div className={`inline-flex items-center justify-start font-bold h-40 relative z-10 pt-[calc(var(--depth)*0.75rem)] md:pt-[calc(var(--depth)*1.5rem)] transition-opacity duration-300 ${isSearchDimmed ? 'opacity-30' : ''}`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', '--depth': depth } as React.CSSProperties}>
                    <span className="truncate max-h-[140px] whitespace-nowrap text-accent" title={e.name}>{e.name || t('kbUnnamedEntity')}</span>
                  </div>
                </th>
              )})}
              {rightSpacerWidth > 0 && <th style={{ minWidth: rightSpacerWidth, padding: 0, border: 0 }} data-spacer="true"></th>}
            </tr>
          </thead>
          <tbody>
            {topSpacerHeight > 0 && (
              <tr style={{ height: topSpacerHeight }} data-spacer="true">
                <td colSpan={visibleEntities.length + (leftSpacerWidth > 0 ? 2 : 1) + (rightSpacerWidth > 0 ? 1 : 0)} style={{ padding: 0, border: 0 }}></td>
              </tr>
            )}
            {visibleRows.map((rowItem) => {
              if (rowItem.type === 'feature') {
                const { f, depth } = rowItem;
                const isMatch = matchingIds.has(f.id);
                const isActiveMatch = activeMatchId === f.id;
                const isSearchDimmed = !!searchTerm && !isMatch;
                return (
                  <tr key={`f-${f.id}`} className="transition-colors group/row bg-panel-bg" data-no-highlight={f.type === 'state'}>
                    <td data-search-match={isMatch ? "true" : undefined} data-search-active={isActiveMatch ? "true" : undefined} className={`sticky left-0 z-30 p-2 md:p-4 border-b border-border border-r-2 border-r-border transition-all duration-300 align-middle w-[140px] min-w-[140px] max-w-[140px] md:w-[250px] md:min-w-[250px] md:max-w-[250px] bg-header-bg ${isMatch ? 'after:absolute after:inset-0 after:bg-accent/20 after:pointer-events-none' : ''} ${isActiveMatch ? 'after:absolute after:inset-0 after:ring-2 after:ring-accent after:ring-inset after:pointer-events-none' : ''}`}>
                      <div className={`flex items-center gap-2 font-bold relative z-10 w-full text-sm md:text-base pl-[calc(var(--depth)*0.75rem)] md:pl-[calc(var(--depth)*1.5rem)] transition-opacity duration-300 ${isSearchDimmed ? 'opacity-30' : ''}`} style={{ '--depth': depth } as React.CSSProperties}>
                        <span className="truncate text-accent" title={f.name}>{f.name || t('kbUnnamedFeature')}</span>
                      </div>
                    </td>
                    {leftSpacerWidth > 0 && <td style={{ minWidth: leftSpacerWidth, padding: 0, border: 0 }} data-spacer="true"></td>}
                    {visibleEntities.map(({ item: e }) => (
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
                    {rightSpacerWidth > 0 && <td style={{ minWidth: rightSpacerWidth, padding: 0, border: 0 }} data-spacer="true"></td>}
                  </tr>
                );
              } else {
                const { f, s, depth } = rowItem;
                const isMatch = matchingIds.has(s.id);
                const isActiveMatch = activeMatchId === s.id;
                const isSearchDimmed = !!searchTerm && !isMatch;
                return (
                  <tr key={`s-${s.id}`} className="transition-colors group/row bg-panel-bg">
                    <td data-search-match={isMatch ? "true" : undefined} data-search-active={isActiveMatch ? "true" : undefined} className={`sticky left-0 z-30 py-2 md:py-3 px-2 md:px-4 border-b border-border border-r-2 border-r-border transition-all duration-300 align-middle w-[140px] min-w-[140px] max-w-[140px] md:w-[250px] md:min-w-[250px] md:max-w-[250px] bg-header-bg text-text font-medium ${isMatch ? 'after:absolute after:inset-0 after:bg-accent/20 after:pointer-events-none' : ''} ${isActiveMatch ? 'after:absolute after:inset-0 after:ring-2 after:ring-accent after:ring-inset after:pointer-events-none' : ''}`}>
                      <div className={`flex items-center gap-2 relative z-10 w-full text-xs md:text-sm pl-[calc(var(--depth)*0.75rem)] md:pl-[calc(var(--depth)*1.5rem)] transition-opacity duration-300 ${isSearchDimmed ? 'opacity-30' : ''}`} style={{ '--depth': depth } as React.CSSProperties}>
                        <span className="truncate opacity-90" title={s.name}>{s.name}</span>
                      </div>
                    </td>
                    {leftSpacerWidth > 0 && <td style={{ minWidth: leftSpacerWidth, padding: 0, border: 0 }} data-spacer="true"></td>}
                    {visibleEntities.map(({ item: e }) => (
                      <td key={`${e.id}-${s.id}`} className="p-2 border-b border-r border-border align-middle w-[1%] whitespace-nowrap">
                        {(() => {
                          const scoreVal = e.scores[s.id] as string;
                          const vals = (s as any).values || getDefaultStateValues(t);
                          const selectedVal = vals.find((v: any) => v.id === scoreVal);
                          return (
                            <div className="flex items-center justify-center w-full h-full min-h-[32px]" title={selectedVal?.name}>
                              <button
                                className="w-8 h-8 cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md focus:outline-none flex items-center justify-center transition-colors border border-border"
                                onClick={() => cycleScore(e.id, s.id, scoreVal || '', vals)}
                                onContextMenu={(ev) => {
                                  ev.preventDefault();
                                  setContextMenu({ entityId: e.id, stateId: s.id, x: ev.clientX, y: ev.clientY, scoreVal: scoreVal || '', vals });
                                }}
                              >
                                {scoreVal && selectedVal ? renderScoreSymbol(selectedVal) : null}
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    ))}
                    {rightSpacerWidth > 0 && <td style={{ minWidth: rightSpacerWidth, padding: 0, border: 0 }} data-spacer="true"></td>}
                  </tr>
                );
              }
            })}
            {bottomSpacerHeight > 0 && (
              <tr style={{ height: bottomSpacerHeight }} data-spacer="true">
                <td colSpan={visibleEntities.length + (leftSpacerWidth > 0 ? 2 : 1) + (rightSpacerWidth > 0 ? 1 : 0)} style={{ padding: 0, border: 0 }}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Clear Button */}
      <div
        className={`absolute bottom-6 right-6 md:bottom-4 md:right-4 z-50 transition-opacity duration-300 ${isFooterVisible ? 'opacity-100 pointer-events-auto' : 'max-md:opacity-100 max-md:pointer-events-auto opacity-0 pointer-events-none'}`}
      >
        <button
          onClick={() => setIsClearMatrixModalOpen(true)}
          className="size-14 bg-red-500/95 backdrop-blur-md border border-white/20 text-white rounded-xl shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all cursor-pointer"
          title={t('kbClearMatrix' as any) || 'Clear Matrix'}
        >
          <Icon name="Eraser" className="size-6" />
        </button>
      </div>

      <Modal isOpen={!!editingNumeric} onClose={() => setEditingNumeric(null)} title={t('kbScoring')}>
        {currentEditingNumeric && (() => {
          const feature = displayDraft.features.find(x => x.id === currentEditingNumeric.featureId);
          const entity = displayDraft.entities.find(x => x.id === currentEditingNumeric.entityId);
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
                    <input type="number" value={editingNumeric?.min ?? currentEditingNumeric.min} onChange={e => editingNumeric && setEditingNumeric({ ...editingNumeric, min: e.target.value })} className={`input-base text-lg font-medium w-full ${unitSym ? 'pr-10' : ''}`} />
                    {unitSym && <span className="absolute right-3 text-gray-500 font-bold select-none pointer-events-none">{unitSym}</span>}
                  </div>
                </label>
                <label className="flex flex-col gap-1.5 flex-1">
                  <span className="text-sm font-semibold opacity-80">{t('kbMax')}</span>
                  <div className="relative flex items-center">
                    <input type="number" value={editingNumeric?.max ?? currentEditingNumeric.max} onChange={e => editingNumeric && setEditingNumeric({ ...editingNumeric, max: e.target.value })} className={`input-base text-lg font-medium w-full ${unitSym ? 'pr-10' : ''}`} />
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

      {contextMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-100" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}></div>
          <div
            className="fixed z-101 bg-panel-bg/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-xl py-1 min-w-[150px] animate-fade-in font-sans text-text"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - ((contextMenu.vals.length + 1) * 36 + 20))
            }}
          >
            <button
              onClick={() => { setScore(contextMenu.entityId, contextMenu.stateId, null); setContextMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-hover-bg/80 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span className="opacity-40 px-2">-</span>
            </button>
            {contextMenu.vals.map(v => (
              <button
                key={v.id}
                onClick={() => { setScore(contextMenu.entityId, contextMenu.stateId, v.id); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-hover-bg/80 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {renderScoreSymbol(v)} <span className="text-[12px] leading-none font-bold">{v.name}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

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
