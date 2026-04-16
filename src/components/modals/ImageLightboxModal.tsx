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

// Helper to prevent panning outside the viewable area
const calculateBounds = (newX: number, newY: number, currentScale: number, wrapperEl: Element) => {
  const img = wrapperEl.querySelector('img');
  const slide = wrapperEl.closest('.slide-container');

  if (!img || !slide) return { x: newX, y: newY };

  const imgWidth = img.offsetWidth * currentScale;
  const imgHeight = img.offsetHeight * currentScale;
  const containerWidth = slide.clientWidth;
  const containerHeight = slide.clientHeight;

  // Max pan distance is half the difference between scaled image and container
  const maxX = Math.max(0, (imgWidth - containerWidth) / 2);
  const maxY = Math.max(0, (imgHeight - containerHeight) / 2);

  return {
    x: Math.min(Math.max(newX, -maxX), maxX),
    y: Math.min(Math.max(newY, -maxY), maxY)
  };
};

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ isOpen, onClose, media, startIndex = 0 }) => {
  const { t } = useAppContext();
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [activeMedia, setActiveMedia] = useState(media);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const pinchRef = useRef({ distance: 0, originScale: 1 });
  const panRef = useRef({ active: false, moved: false, start: { x: 0, y: 0 }, originPos: { x: 0, y: 0 } });
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setActiveMedia(media);
      setCurrentIndex(startIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
        // Clear media after animation to prevent flash of old content on next open
        setActiveMedia(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, startIndex, media]);

  useEffect(() => {
    let raf1: number;
    let raf2: number;
    if (isRendered && isOpen) {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setIsVisible(true));
      });
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isRendered, isOpen]);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (activeMedia) {
      setCurrentIndex((prev) => prev < activeMedia.length - 1 ? prev + 1 : prev);
    }
  }, [activeMedia]);

  const handlePrev = useCallback(() => {
    if (activeMedia) {
      setCurrentIndex((prev) => prev > 0 ? prev - 1 : prev);
    }
  }, [activeMedia]);

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
        panRef.current = { active: true, moved: false, start: { x: e.touches[0].clientX, y: e.touches[0].clientY }, originPos: position };
      } else if (activeMedia && activeMedia.length > 1) {
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

      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      } else {
        const targetEl = e.currentTarget as Element;
        setPosition(prev => calculateBounds(prev.x, prev.y, newScale, targetEl));
      }
      return;
    }

    if (e.touches.length === 1) {
      if (scale > 1 && panRef.current.active) {
        const dx = e.touches[0].clientX - panRef.current.start.x;
        const dy = e.touches[0].clientY - panRef.current.start.y;
        if (!panRef.current.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          panRef.current.moved = true;
        }
        const bounded = calculateBounds(
          panRef.current.originPos.x + dx,
          panRef.current.originPos.y + dy,
          scale,
          e.currentTarget as Element
        );
        setPosition(bounded);
        return;
      }

      if (scale === 1 && touchStart.current && activeMedia && activeMedia.length > 1) {
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
          if (currentIndex === 0 && deltaX > 0) effectiveDelta *= 0.3; // over-swipe resistance at start
          if (currentIndex === activeMedia.length - 1 && deltaX < 0) effectiveDelta *= 0.3; // over-swipe resistance at end
          setSwipeOffset(effectiveDelta);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    panRef.current.active = false;
    if (scale > 1) return;

    if (!touchStart.current || !activeMedia || activeMedia.length <= 1) {
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

    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    } else {
      const targetEl = e.currentTarget as Element;
      setPosition(prev => calculateBounds(prev.x, prev.y, newScale, targetEl));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      panRef.current = { active: true, moved: false, start: { x: e.clientX, y: e.clientY }, originPos: position };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (panRef.current.active && scale > 1) {
      const dx = e.clientX - panRef.current.start.x;
      const dy = e.clientY - panRef.current.start.y;
      if (!panRef.current.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        panRef.current.moved = true;
      }
      const bounded = calculateBounds(
        panRef.current.originPos.x + dx,
        panRef.current.originPos.y + dy,
        scale,
        e.currentTarget as Element
      );
      setPosition(bounded);
    }
  };

  const handleMouseUp = () => {
    panRef.current.active = false;
  };

  const handleImageClick = () => {
    if (scale > 1 && panRef.current.moved) {
      return;
    }
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  if (!isRendered || !activeMedia || activeMedia.length === 0) return null;

  return (
    <div onClick={onClose} className={`fixed inset-0 bg-black/80 backdrop-blur-2xl z-70 flex flex-col items-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>

      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2.5 transition-all duration-300 z-50 backdrop-blur-md cursor-pointer border border-white/10 shadow-lg hover:shadow-xl">
        <Icon name="X" size={28} />
      </button>

      {activeMedia.length > 1 && currentIndex > 0 && (
        <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 bg-black/20 text-white/70 hover:text-white rounded-full w-14 h-14 items-center justify-center hover:bg-black/40 z-50 transition-all duration-300 backdrop-blur-md cursor-pointer border border-white/10 shadow-lg hover:shadow-xl"><Icon name="ChevronLeft" size={36} /></button>
      )}

      {activeMedia.length > 1 && currentIndex < activeMedia.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 bg-black/20 text-white/70 hover:text-white rounded-full w-14 h-14 items-center justify-center hover:bg-black/40 z-50 transition-all duration-300 backdrop-blur-md cursor-pointer border border-white/10 shadow-lg hover:shadow-xl"><Icon name="ChevronRight" size={36} /></button>
      )}

      <div
        className="flex-1 relative w-full overflow-hidden min-h-0"
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
          {activeMedia.map((m, index) => (
            <div 
              key={index} 
              className="slide-container flex-none w-full h-full flex items-center justify-center relative p-4 lg:p-8"
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={`flex items-center justify-center transition-opacity duration-300 ${isVisible ? (currentIndex === index ? 'opacity-100' : 'opacity-40') : 'opacity-0'}`}
                  style={currentIndex === index ? {
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: panRef.current.active ? 'none' : 'transform 0.3s cubic-bezier(0.33, 1, 0.68, 1)',
                    cursor: scale > 1 ? (panRef.current.active ? 'grabbing' : 'grab') : 'zoom-in'
                  } : { transform: 'scale(0.95)' }}
                  onWheel={currentIndex === index ? handleWheel : undefined}
                  onMouseDown={currentIndex === index ? handleMouseDown : undefined}
                  onMouseMove={currentIndex === index ? handleMouseMove : undefined}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (currentIndex === index) handleImageClick(); 
                  }}
                >
                  <img
                    src={m.url}
                    alt={m.caption || t('fullScaleView')}
                    loading={Math.abs(currentIndex - index) <= 1 ? "eager" : "lazy"}
                    className="max-w-[95vw] max-h-[75vh] object-contain shadow-2xl pointer-events-none"
                    draggable={false}
                  />
                </div>

                {(m.caption || m.copyright) && currentIndex === index && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 text-center w-max min-w-[200px] max-w-[90vw] transition-all duration-300 ${isVisible && scale === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                      }`}
                  >
                    {m.caption && <p className="font-semibold text-sm md:text-base text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-normal">{m.caption}</p>}
                    {m.copyright && <p className="text-xs md:text-sm text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-0.5">{m.copyright}</p>}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      {activeMedia.length > 1 && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] pt-6 pb-12 flex justify-center z-40"
          onMouseEnter={() => setIsNavHovered(true)}
          onMouseLeave={() => setIsNavHovered(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className={`transition-all duration-300 ease-in-out ${
              scale > 1 && !isNavHovered ? 'opacity-0 -translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'
            }`}
          >
            <div className="flex gap-3 justify-center p-3 bg-black/40 backdrop-blur-xl rounded-2xl flex-wrap overflow-y-auto max-h-[15vh] border border-white/20 shadow-2xl">
              {activeMedia.map((m, i) =>
                <img
                  key={i}
                  src={m.url}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-16 h-16 object-cover rounded-xl cursor-pointer border-2 transition-all ${i === currentIndex ? 'border-accent scale-105 shadow-md' : 'border-transparent hover:border-white/50 opacity-60 hover:opacity-100'}`}
                  alt={`${t('thumbnail' as any)} ${i + 1}`}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
