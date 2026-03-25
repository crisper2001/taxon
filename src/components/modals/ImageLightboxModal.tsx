import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '../common/Icon';
import type { Media } from '../../types';
import { useAppContext } from '../../context/AppContext';

// --- ImageLightboxModal ---
interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: Media[] | null;
  startIndex: number;
}
export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ isOpen, onClose, media, startIndex = 0 }) => {
  const { t } = useAppContext();
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const pinchRef = useRef({ distance: 0, originScale: 1 });
  const panRef = useRef({ active: false, start: { x: 0, y: 0 }, originPos: { x: 0, y: 0 } });
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setCurrentIndex(startIndex); // Reset index when opening
      setScale(1);
      setPosition({ x: 0, y: 0 });
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, startIndex]);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (media) {
      setCurrentIndex((prev) => prev < media.length - 1 ? prev + 1 : prev);
    }
  }, [media]);

  const handlePrev = useCallback(() => {
    if (media) {
      setCurrentIndex((prev) => prev > 0 ? prev - 1 : prev);
    }
  }, [media]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen) {
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'Escape') onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchRef.current = { distance: dist, originScale: scale };
      setIsSwiping(false);
      return;
    }

    if (e.touches.length === 1) {
      if (scale > 1) {
        panRef.current = { active: true, start: { x: e.touches[0].clientX, y: e.touches[0].clientY }, originPos: position };
      } else if (media && media.length > 1) {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setIsSwiping(false);
        setSwipeOffset(0);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const ratio = dist / pinchRef.current.distance;
      const newScale = Math.min(Math.max(1, pinchRef.current.originScale * ratio), 5);
      setScale(newScale);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return;
    }

    if (e.touches.length === 1) {
      if (scale > 1 && panRef.current.active) {
        const dx = e.touches[0].clientX - panRef.current.start.x;
        const dy = e.touches[0].clientY - panRef.current.start.y;
        setPosition({
          x: panRef.current.originPos.x + dx,
          y: panRef.current.originPos.y + dy
        });
        return;
      }

      if (scale === 1 && touchStart.current && media && media.length > 1) {
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
          if (currentIndex === 0 && deltaX > 0) effectiveDelta *= 0.3;
          if (currentIndex === media.length - 1 && deltaX < 0) effectiveDelta *= 0.3;
          setSwipeOffset(effectiveDelta);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    panRef.current.active = false;
    if (scale > 1) return;

    if (!touchStart.current || !media || media.length <= 1) {
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }
    if (isSwiping) {
      const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
      if (deltaX < -50) handleNext();
      else if (deltaX > 50) handlePrev();
    }
    setIsSwiping(false);
    setSwipeOffset(0);
    touchStart.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    const newScale = Math.min(Math.max(1, scale + delta), 5);
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      panRef.current = { active: true, start: { x: e.clientX, y: e.clientY }, originPos: position };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (panRef.current.active && scale > 1) {
      const dx = e.clientX - panRef.current.start.x;
      const dy = e.clientY - panRef.current.start.y;
      setPosition({
        x: panRef.current.originPos.x + dx,
        y: panRef.current.originPos.y + dy
      });
    }
  };

  const handleMouseUp = () => {
    panRef.current.active = false;
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  if (!isRendered || !media || media.length === 0) return null;

  return (
    <div onClick={onClose} className={`fixed inset-0 bg-black/80 backdrop-blur-2xl z-70 flex flex-col items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2.5 transition-all duration-300 z-20 backdrop-blur-md cursor-pointer border border-white/10 shadow-lg hover:shadow-xl">
        <Icon name="X" size={28} />
      </button>

      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {media.length > 1 && currentIndex > 0 && (
          <button onClick={handlePrev} className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 bg-black/20 text-white/70 hover:text-white rounded-full w-14 h-14 items-center justify-center hover:bg-black/40 z-20 transition-all duration-300 backdrop-blur-md cursor-pointer border border-white/10 shadow-lg hover:shadow-xl"><Icon name="ChevronLeft" size={36} /></button>
        )}

        <div
          className="relative flex grow h-full w-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          <div
            className="flex h-full w-full"
            style={{
              transform: `translateX(calc(-${currentIndex * 100}% + ${swipeOffset}px))`,
              transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform'
            }}
          >
            {media.map((m, index) => (
              <div key={index} className="flex-none w-full h-full flex flex-col items-center justify-center py-24 relative overflow-hidden">
                <div
                  className={`flex items-center justify-center transition-opacity duration-300 w-full h-full ${isVisible ? (currentIndex === index ? 'opacity-100' : 'opacity-40') : 'opacity-0'}`}
                  style={currentIndex === index ? {
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: panRef.current.active ? 'none' : 'transform 0.1s ease-out',
                    cursor: scale > 1 ? (panRef.current.active ? 'grabbing' : 'grab') : 'zoom-in'
                  } : { transform: 'scale(0.95)' }}
                  onWheel={currentIndex === index ? handleWheel : undefined}
                  onMouseDown={currentIndex === index ? handleMouseDown : undefined}
                  onMouseMove={currentIndex === index ? handleMouseMove : undefined}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onDoubleClick={currentIndex === index ? handleDoubleClick : undefined}
                >
                  <img
                    src={m.url}
                    alt={m.caption || t('fullScaleView')}
                    loading={Math.abs(currentIndex - index) <= 1 ? "eager" : "lazy"}
                    className="max-w-[90vw] max-h-full object-contain rounded-2xl shadow-2xl pointer-events-none"
                    draggable={false}
                  />
                </div>
                {(m.caption || m.copyright) && scale === 1 && (
                  <div className={`absolute bottom-24 text-white text-center mt-4 p-2 bg-black/40 rounded-lg max-w-[80vw] transition-opacity duration-300 ${isVisible && currentIndex === index ? 'opacity-100' : 'opacity-0'}`}>
                    {m.caption && <p className="font-semibold">{m.caption}</p>}
                    {m.copyright && <p className="text-sm opacity-80">{m.copyright}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {media.length > 1 && currentIndex < media.length - 1 && (
          <button onClick={handleNext} className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 bg-black/20 text-white/70 hover:text-white rounded-full w-14 h-14 items-center justify-center hover:bg-black/40 z-20 transition-all duration-300 backdrop-blur-md cursor-pointer border border-white/10 shadow-lg hover:shadow-xl"><Icon name="ChevronRight" size={36} /></button>
        )}

        {media.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 justify-center p-3 bg-black/40 backdrop-blur-xl rounded-2xl flex-wrap max-w-[80vw] overflow-y-auto max-h-[15vh] border border-white/20 shadow-2xl">
            {media.map((m, i) =>
              <img
                key={i}
                src={m.url}
                onClick={() => setCurrentIndex(i)}
                className={`w-16 h-16 object-cover rounded-xl cursor-pointer border-2 transition-all ${i === currentIndex ? 'border-accent scale-105 shadow-md' : 'border-transparent hover:border-white/50 opacity-60 hover:opacity-100'}`}
                alt={`${t('thumbnail' as any)} ${i + 1}`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
