import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelsProps {
    children: React.ReactNode[];
}

const MIN_PANEL_SIZE = 100;
const RESIZER_SIZE = 5; // The size of the resizer bar in pixels.

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({ children }) => {
    const [layout, setLayout] = useState({ rows: `1fr ${RESIZER_SIZE}px 1fr`, cols: `1fr ${RESIZER_SIZE}px 1fr` });
    const containerRef = useRef<HTMLDivElement>(null);
    const resizingType = useRef<null | 'v' | 'h'>(null);
    const dragOffset = useRef(0);
    const [isResizing, setIsResizing] = useState(false);

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
                const newFirstColWidth = e.clientX - rect.left - dragOffset.current;
                if (newFirstColWidth > MIN_PANEL_SIZE && (rect.width - newFirstColWidth - RESIZER_SIZE) > MIN_PANEL_SIZE) {
                    setLayout(prev => ({ ...prev, cols: `${newFirstColWidth}px ${RESIZER_SIZE}px 1fr` }));
                }
            } else { // 'h'
                const newFirstRowHeight = e.clientY - rect.top - dragOffset.current;
                if (newFirstRowHeight > MIN_PANEL_SIZE && (rect.height - newFirstRowHeight - RESIZER_SIZE) > MIN_PANEL_SIZE) {
                    setLayout(prev => ({ ...prev, rows: `${newFirstRowHeight}px ${RESIZER_SIZE}px 1fr` }));
                }
            }
        });
    }, []);

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
        <div
            ref={containerRef}
            className={`app-container grow p-4 grid gap-1 overflow-hidden ${isResizing ? `select-none ${resizingType.current === 'v' ? 'cursor-col-resize' : 'cursor-row-resize'}` : ''}`}
            style={{ gridTemplateRows: layout.rows, gridTemplateColumns: layout.cols }}
        >
            <div style={{ gridArea: '1 / 1 / 2 / 2' }} className="min-h-0 min-w-0">{children[0]}</div>
            <div onMouseDown={(e) => handleMouseDown(e, 'v')} style={{ gridArea: '1 / 2 / 4 / 3' }} className={`cursor-col-resize hover:bg-accent transition-colors ${isResizing && resizingType.current === 'v' ? 'bg-accent' : ''}`}></div>
            <div style={{ gridArea: '1 / 3 / 2 / 4' }} className="min-h-0 min-w-0">{children[1]}</div>
            <div onMouseDown={(e) => handleMouseDown(e, 'h')} style={{ gridArea: '2 / 1 / 3 / 4' }} className={`cursor-row-resize hover:bg-accent transition-colors ${isResizing && resizingType.current === 'h' ? 'bg-accent' : ''}`}></div>
            <div style={{ gridArea: '3 / 1 / 4 / 2' }} className="min-h-0 min-w-0">{children[2]}</div>
            <div style={{ gridArea: '3 / 3 / 4 / 4' }} className="min-h-0 min-w-0">{children[3]}</div>
        </div>
    );
};