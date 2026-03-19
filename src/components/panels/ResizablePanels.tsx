import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Icon, type IconName } from '../Icon';

interface ResizablePanelsProps {
    children: React.ReactNode[];
    bottomBarItems?: { id: string; icon: IconName; label: string; count?: number }[];
}

const MIN_PANEL_SIZE = 250;
const RESIZER_SIZE = 5; // The size of the resizer bar in pixels.

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({ children, bottomBarItems }) => {
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
        return { rows: `3fr ${RESIZER_SIZE}px 2fr`, cols: `1fr ${RESIZER_SIZE}px 2fr` };
    });
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
        const rect = containerRef.current!.getBoundingClientRect();
        if (type === 'v') dragOffset.current = e.clientX - (rect.left + containerRef.current!.firstElementChild!.clientWidth);
        else dragOffset.current = e.clientY - (rect.top + containerRef.current!.firstElementChild!.clientHeight);
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

            if (resizingType.current === 'v') {
                let newFirstColWidth = e.clientX - rect.left - dragOffset.current;
                newFirstColWidth = Math.max(MIN_PANEL_SIZE, Math.min(newFirstColWidth, rect.width - MIN_PANEL_SIZE - RESIZER_SIZE));
                setLayout(prev => ({ ...prev, cols: `${newFirstColWidth}px ${RESIZER_SIZE}px 1fr` }));
            } else { // 'h'
                let newFirstRowHeight = e.clientY - rect.top - dragOffset.current;
                newFirstRowHeight = Math.max(MIN_PANEL_SIZE, Math.min(newFirstRowHeight, rect.height - MIN_PANEL_SIZE - RESIZER_SIZE));
                setLayout(prev => ({ ...prev, rows: `${newFirstRowHeight}px ${RESIZER_SIZE}px 1fr` }));
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
            <style>{`
                @media (min-width: 768px) {
                    .panels-grid-layout {
                        display: grid !important;
                        grid-template-rows: ${layout.rows};
                        grid-template-columns: ${layout.cols};
                        padding: 1rem;
                        gap: 0.5rem;
                    }
                }
                @media (max-width: 767px) {
                    .panels-grid-layout {
                        display: flex;
                        flex-direction: row;
                        width: 100%;
                        height: 100%;
                        transform: translateX(calc(-${mobileTab * 100}% + ${swipeOffset}px));
                        transition: ${isSwiping ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'};
                        will-change: transform;
                        contain: none !important;
                        touch-action: pan-y;
                    }
                    .panel-wrapper {
                        flex: 0 0 100%;
                        width: 100%;
                        height: 100%;
                        padding: 0.5rem;
                    }
                }
            `}</style>
            <div
                ref={containerRef}
                className={`panels-grid-layout grow min-h-0 md:overflow-hidden ${isResizing ? `select-none ${resizingType.current === 'v' ? 'cursor-col-resize' : 'cursor-row-resize'}` : ''}`}
                style={{ contain: 'strict' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div style={{ gridArea: '1 / 1 / 2 / 2' }} className="panel-wrapper min-h-0 min-w-0 h-full">{children[0]}</div>
                <div 
                    onMouseDown={(e) => handleMouseDown(e, 'v')} 
                    onDoubleClick={() => setLayout(prev => ({ ...prev, cols: `1fr ${RESIZER_SIZE}px 2fr` }))} 
                    style={{ gridArea: '1 / 2 / 4 / 3' }} 
                    className={`cursor-col-resize items-center justify-center group hidden md:flex`}
                    title="Double-click to reset width"
                >
                    <div className={`w-1 h-full rounded-full transition-all duration-300 ${isResizing && resizingType.current === 'v' ? 'bg-accent shadow-md shadow-accent/50 scale-x-150' : 'bg-transparent group-hover:bg-accent/50 group-hover:scale-x-150'}`}></div>
                </div>
                <div style={{ gridArea: '1 / 3 / 2 / 4' }} className="panel-wrapper min-h-0 min-w-0 h-full">{children[1]}</div>
                <div 
                    onMouseDown={(e) => handleMouseDown(e, 'h')} 
                    onDoubleClick={() => setLayout(prev => ({ ...prev, rows: `3fr ${RESIZER_SIZE}px 2fr` }))} 
                    style={{ gridArea: '2 / 1 / 3 / 4' }} 
                    className={`cursor-row-resize items-center justify-center group hidden md:flex`}
                    title="Double-click to reset height"
                >
                    <div className={`h-1 w-full rounded-full transition-all duration-300 ${isResizing && resizingType.current === 'h' ? 'bg-accent shadow-md shadow-accent/50 scale-y-150' : 'bg-transparent group-hover:bg-accent/50 group-hover:scale-y-150'}`}></div>
                </div>
                <div style={{ gridArea: '3 / 1 / 4 / 2' }} className="panel-wrapper min-h-0 min-w-0 h-full">{children[2]}</div>
                <div style={{ gridArea: '3 / 3 / 4 / 4' }} className="panel-wrapper min-h-0 min-w-0 h-full">{children[3]}</div>
            </div>

            {/* Mobile Bottom Bar */}
            {bottomBarItems && (
                <div 
                    className="flex md:hidden items-center justify-around bg-panel-bg/85 backdrop-blur-xl border-t border-white/20 dark:border-white/10 p-2 shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
                    style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
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