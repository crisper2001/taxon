import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '../Icon';
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
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setCurrentIndex(startIndex); // Reset index when opening
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, startIndex]);

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
    if (media && media.length > 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || !media || media.length <= 1) return;
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
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
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

  if (!isRendered || !media || media.length === 0) return null;

  return (
    <div onClick={onClose} className={`fixed inset-0 bg-black/80 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2.5 transition-all duration-300 z-20 backdrop-blur-md cursor-pointer border border-white/10 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
        <Icon name="X" size={28} />
      </button>

      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {media.length > 1 && currentIndex > 0 && (
          <button onClick={handlePrev} className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 bg-black/20 text-white/70 hover:text-white rounded-full w-14 h-14 items-center justify-center hover:bg-black/40 z-20 transition-all duration-300 backdrop-blur-md cursor-pointer border border-white/10 shadow-lg hover:shadow-xl hover:-translate-y-1"><Icon name="ChevronLeft" size={36} /></button>
        )}

        <div 
          className="relative flex grow h-full w-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'pan-y' }}
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
              <div key={index} className="flex-none w-full h-full flex flex-col items-center justify-center py-24 relative">
                <img
                  src={m.url}
                  alt={m.caption || t('fullScaleView')}
                  loading={Math.abs(currentIndex - index) <= 1 ? "eager" : "lazy"}
                  className={`max-w-[90vw] max-h-full object-contain rounded-2xl shadow-2xl transition-all duration-300 ${isVisible ? (currentIndex === index ? 'scale-100 opacity-100' : 'scale-95 opacity-40') : 'scale-95 opacity-0'}`}
                />
                {(m.caption || m.copyright) && (
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
          <button onClick={handleNext} className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 bg-black/20 text-white/70 hover:text-white rounded-full w-14 h-14 items-center justify-center hover:bg-black/40 z-20 transition-all duration-300 backdrop-blur-md cursor-pointer border border-white/10 shadow-lg hover:shadow-xl hover:-translate-y-1"><Icon name="ChevronRight" size={36} /></button>
        )}

        {media.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 justify-center p-3 bg-black/40 backdrop-blur-xl rounded-2xl flex-wrap max-w-[80vw] overflow-y-auto max-h-[15vh] border border-white/20 shadow-2xl">
            {media.map((m, i) =>
              <img
                key={i}
                src={m.url}
                onClick={() => setCurrentIndex(i)}
                className={`w-16 h-16 object-cover rounded-xl cursor-pointer border-2 transition-all ${i === currentIndex ? 'border-accent scale-105 shadow-md' : 'border-transparent hover:border-white/50 opacity-60 hover:opacity-100'}`}
                alt={`Thumbnail ${i + 1}`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
