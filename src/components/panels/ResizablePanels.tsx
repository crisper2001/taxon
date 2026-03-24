import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Icon, type IconName } from '../Icon';
import { useAppContext } from '../../context/AppContext';

interface ResizablePanelsProps {
    children: React.ReactNode[];
    bottomBarItems?: { id: string; icon: IconName; label: string; count?: number }[];
}

const MIN_PANEL_SIZE = 250;
const RESIZER_SIZE = 5; // The size of the resizer bar in pixels.

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({ children, bottomBarItems }) => {
    const { t } = useAppContext();
    const [mobileTab, setMobileTab] = useState(0);
    const [layout, setLayout] = useState(() => {
        const savedLayout = localStorage.getItem('panelsLayout');
        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                if (parsed.rows && parsed.cols) {
                    return parsed;
                }
            } catch (e) {
                // Ignore parse errors and fall back to default
            }
        }
        return { rows: `60fr ${RESIZER_SIZE}px 40fr`, cols: `33.333fr ${RESIZER_SIZE}px 66.667fr` };
    });
    const childrenArray = React.Children.toArray(children);
    const numPanels = childrenArray.length;
    const containerRef = useRef<HTMLDivElement>(null);
    const resizingType = useRef<null | 'v' | 'h'>(null);
    const dragOffset = useRef(0);
    const [isResizing, setIsResizing] = useState(false);
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setIsSwiping(false);
        setSwipeOffset(0);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStart.current || !bottomBarItems) return;
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
            // Add rubber-band resistance if trying to swipe past boundaries
            if (mobileTab === 0 && deltaX > 0) effectiveDelta *= 0.3;
            if (mobileTab === bottomBarItems.length - 1 && deltaX < 0) effectiveDelta *= 0.3;
            setSwipeOffset(effectiveDelta);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current || !bottomBarItems) {
            setIsSwiping(false);
            setSwipeOffset(0);
            return;
        }

        if (isSwiping) {
            const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
            if (deltaX < -50) setMobileTab(prev => Math.min(prev + 1, bottomBarItems.length - 1));
            else if (deltaX > 50) setMobileTab(prev => Math.max(prev - 1, 0));
        }
        
        setIsSwiping(false);
        setSwipeOffset(0);
        touchStart.current = null;
    };

    const handleMouseDown = (e: React.MouseEvent, type: 'v' | 'h') => {
        e.preventDefault();
        resizingType.current = type;
        setIsResizing(true);
        const firstChild = containerRef.current!.firstElementChild!;
        const firstRect = firstChild.getBoundingClientRect();
        if (type === 'v') dragOffset.current = e.clientX - firstRect.right;
        else dragOffset.current = e.clientY - firstRect.bottom;
    };

    const handleMouseUp = useCallback(() => {
        resizingType.current = null;
        setIsResizing(false);
    }, [setIsResizing]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingType.current || !containerRef.current) return;

        requestAnimationFrame(() => {
            if (!resizingType.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const FIXED_SPACE = 53; // 32px padding + 16px gap + 5px resizer

            if (resizingType.current === 'v') {
                const freeWidth = Math.max(1, rect.width - FIXED_SPACE);
                let newWidth = e.clientX - dragOffset.current - (rect.left + 16);
                newWidth = Math.max(MIN_PANEL_SIZE, Math.min(newWidth, freeWidth - MIN_PANEL_SIZE));
                const firstFr = (newWidth / freeWidth) * 100;
                const secondFr = 100 - firstFr;
                setLayout(prev => ({ ...prev, cols: `${firstFr}fr ${RESIZER_SIZE}px ${secondFr}fr` }));
            } else { // 'h'
                const freeHeight = Math.max(1, rect.height - FIXED_SPACE);
                let newHeight = e.clientY - dragOffset.current - (rect.top + 16);
                newHeight = Math.max(MIN_PANEL_SIZE, Math.min(newHeight, freeHeight - MIN_PANEL_SIZE));
                const firstFr = (newHeight / freeHeight) * 100;
                const secondFr = 100 - firstFr;
                setLayout(prev => ({ ...prev, rows: `${firstFr}fr ${RESIZER_SIZE}px ${secondFr}fr` }));
            }
        });
    }, []);

    useEffect(() => {
        localStorage.setItem('panelsLayout', JSON.stringify(layout));
    }, [layout]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMove = (e: MouseEvent) => handleMouseMove(e);
        const handleUp = () => handleMouseUp();

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('mouseleave', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('mouseleave', handleUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return (
        <div className="flex flex-col grow min-h-0 h-full w-full overflow-x-hidden">
            <div
                ref={containerRef}
                className={`panels-grid-layout grow min-h-0 md:overflow-hidden ${isResizing ? `select-none is-resizing ${resizingType.current === 'v' ? 'cursor-col-resize' : 'cursor-row-resize'}` : ''} ${isSwiping ? 'is-swiping' : ''}`}
                style={{ 
                  contain: 'strict',
                  '--grid-rows': numPanels === 2 ? '100%' : layout.rows,
                  '--grid-cols': numPanels === 2 ? (layout.cols.includes('33.333') ? `50fr ${RESIZER_SIZE}px 50fr` : layout.cols) : layout.cols,
                  '--mobile-tab-offset': `-${mobileTab * 100}%`,
                  '--swipe-offset': `${swipeOffset}px`
                } as React.CSSProperties}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div style={{ gridArea: '1 / 1 / 2 / 2' }} className="panel-wrapper min-h-0 min-w-0 h-full">{childrenArray[0]}</div>
                {numPanels >= 2 && (
                  <>
                <div 
                    onMouseDown={(e) => handleMouseDown(e, 'v')} 
                    onDoubleClick={() => setLayout(prev => ({ ...prev, cols: numPanels === 2 ? `50fr ${RESIZER_SIZE}px 50fr` : `33.333fr ${RESIZER_SIZE}px 66.667fr` }))} 
                    style={{ gridArea: numPanels === 2 ? '1 / 2 / 2 / 3' : '1 / 2 / 4 / 3' }} 
                    className={`cursor-col-resize items-center justify-center group hidden md:flex`}
                    title={t('doubleClickToReset' as any)}
                >
                    <div className={`w-1 h-full rounded-full transition-all duration-300 ${isResizing && resizingType.current === 'v' ? 'bg-accent shadow-md shadow-accent/50 scale-x-150' : 'bg-transparent group-hover:bg-accent/50 group-hover:scale-x-150'}`}></div>
                </div>
                <div style={{ gridArea: '1 / 3 / 2 / 4' }} className="panel-wrapper min-h-0 min-w-0 h-full">{childrenArray[1]}</div>
                  </>
                )}
                
                {numPanels >= 4 && (
                    <>
                <div 
                    onMouseDown={(e) => handleMouseDown(e, 'h')} 
                    onDoubleClick={() => setLayout(prev => ({ ...prev, rows: `60fr ${RESIZER_SIZE}px 40fr` }))} 
                    style={{ gridArea: '2 / 1 / 3 / 4' }} 
                    className={`cursor-row-resize items-center justify-center group hidden md:flex`}
                    title={t('doubleClickToReset' as any)}
                >
                    <div className={`h-1 w-full rounded-full transition-all duration-300 ${isResizing && resizingType.current === 'h' ? 'bg-accent shadow-md shadow-accent/50 scale-y-150' : 'bg-transparent group-hover:bg-accent/50 group-hover:scale-y-150'}`}></div>
                </div>
                <div style={{ gridArea: '3 / 1 / 4 / 2' }} className="panel-wrapper min-h-0 min-w-0 h-full">{childrenArray[2]}</div>
                <div style={{ gridArea: '3 / 3 / 4 / 4' }} className="panel-wrapper min-h-0 min-w-0 h-full">{childrenArray[3]}</div>
                    </>
                )}
            </div>

            {/* Mobile Bottom Bar */}
            {bottomBarItems && (
                <div 
                    className="flex md:hidden items-center justify-around bg-panel-bg/85 backdrop-blur-xl border border-white/20 dark:border-white/10 p-2 shrink-0 z-20 shadow-lg rounded-3xl m-2"
                    style={{ marginBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
                >
                    {bottomBarItems.map((item, index) => (
                        <button 
                            key={item.id} 
                            onClick={() => setMobileTab(index)} 
                            className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 relative ${mobileTab === index ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50'}`}
                        >
                            <Icon name={item.icon} size={22} className={mobileTab === index ? 'drop-shadow-sm' : ''} />
                            <span className="text-[10px] font-bold text-center leading-none tracking-tight">{item.label}</span>
                            {item.count !== undefined && item.count > 0 && (
                                <span className="absolute -top-1 -right-1 bg-accent/95 backdrop-blur-sm border border-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-fade-in-up">{item.count > 99 ? '99+' : item.count}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};