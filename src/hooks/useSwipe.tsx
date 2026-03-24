import React, { useState, useRef } from 'react';

export const useSwipe = (onSwipeLeft: () => void, onSwipeRight: () => void, leftConstraint = false, rightConstraint = false) => {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const touchStart = useRef<{ x: number, y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setIsSwiping(false);
        setSwipeOffset(0);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const deltaX = e.touches[0].clientX - touchStart.current.x;
        const deltaY = e.touches[0].clientY - touchStart.current.y;

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
            if (leftConstraint && deltaX > 0) effectiveDelta *= 0.3;
            if (rightConstraint && deltaX < 0) effectiveDelta *= 0.3;
            setSwipeOffset(effectiveDelta);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        if (isSwiping) {
            const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
            if (deltaX < -50) onSwipeLeft();
            else if (deltaX > 50) onSwipeRight();
        }
        setIsSwiping(false);
        setSwipeOffset(0);
        touchStart.current = null;
    };

    return { swipeOffset, isSwiping, handleTouchStart, handleTouchMove, handleTouchEnd };
};