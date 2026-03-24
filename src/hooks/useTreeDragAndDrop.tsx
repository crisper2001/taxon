import React, { useRef } from 'react';

interface UseTreeDragAndDropProps<T> {
    items: T[];
    draggedItem: { type: string; id: string; parentId?: string } | null;
    setDraggedItem: (item: { type: string; id: string; parentId?: string } | null) => void;
    dragOverId: string | null;
    setDragOverId: (id: string | null) => void;
    itemType: string;
    dataAttribute: string;
    onMoveItem: (draggedId: string, newParentId?: string) => void;
    ghostRef: React.RefObject<HTMLDivElement | null>;
}

export const useTreeDragAndDrop = <T extends { id: string; parentId?: string }>({
    items, draggedItem, setDraggedItem, dragOverId, setDragOverId,
    itemType, dataAttribute, onMoveItem, ghostRef
}: UseTreeDragAndDropProps<T>) => {
    const touchTimeout = useRef<NodeJS.Timeout | null>(null);
    const lastTouchPos = useRef({ x: 0, y: 0 });

    const isCycle = (draggedId: string, targetId: string) => {
        let current: string | undefined = targetId;
        while (current) {
            if (current === draggedId) return true;
            current = items.find(x => x.id === current)?.parentId;
        }
        return false;
    };

    const onDragStart = (e: React.DragEvent, id: string) => {
        e.stopPropagation();
        setDraggedItem({ type: itemType, id });
    };

    const onDragEnd = () => {
        setDraggedItem(null);
        setDragOverId(null);
    };

    const onDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem?.type === itemType && draggedItem.id !== id) {
            if (!isCycle(draggedItem.id, id) && dragOverId !== id) setDragOverId(id);
        }
    };

    const onDragLeave = (id: string) => {
        if (dragOverId === id) setDragOverId(null);
    };

    const onDrop = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);
        if (draggedItem?.type === itemType && draggedItem.id !== id && !isCycle(draggedItem.id, id)) {
            onMoveItem(draggedItem.id, id);
        }
        setDraggedItem(null);
    };

    const onRootDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverId(null);
        if (draggedItem?.type === itemType) onMoveItem(draggedItem.id, undefined);
        setDraggedItem(null);
    };

    const onTouchStart = (e: React.TouchEvent, id: string) => {
        e.stopPropagation();
        lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchTimeout.current = setTimeout(() => {
            setDraggedItem({ type: itemType, id });
            if (navigator.vibrate) navigator.vibrate(50);
        }, 300);
    };

    const onTouchMove = (e: React.TouchEvent, id: string) => {
        const touch = e.touches[0];
        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        if (ghostRef.current) {
            ghostRef.current.style.left = `${touch.clientX}px`;
            ghostRef.current.style.top = `${touch.clientY}px`;
        }
        if (!draggedItem) {
            if (touchTimeout.current) clearTimeout(touchTimeout.current);
            return;
        }
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetNode = el?.closest(`[${dataAttribute}]`);
        const targetRoot = el?.closest('[data-root-drop="true"]');

        if (targetNode) {
            const targetId = targetNode.getAttribute(dataAttribute);
            if (targetId && targetId !== id && !isCycle(draggedItem.id, targetId) && dragOverId !== targetId) setDragOverId(targetId);
        } else if (targetRoot) {
            if (dragOverId !== 'root') setDragOverId('root');
        } else if (dragOverId) setDragOverId(null);
    };

    const onTouchEnd = (e: React.TouchEvent, id: string) => {
        if (touchTimeout.current) clearTimeout(touchTimeout.current);
        if (draggedItem) {
            if (e.cancelable) e.preventDefault();
            if (dragOverId && dragOverId !== 'root' && dragOverId !== id) onMoveItem(draggedItem.id, dragOverId);
            else if (dragOverId === 'root') onMoveItem(draggedItem.id, undefined);
            setDraggedItem(null);
            setDragOverId(null);
        }
    };

    const onTouchCancel = () => { if (touchTimeout.current) clearTimeout(touchTimeout.current); setDraggedItem(null); setDragOverId(null); };

    return { onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onRootDrop, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, lastTouchPos };
};