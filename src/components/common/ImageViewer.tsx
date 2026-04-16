import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { useAppContext } from '../../context/AppContext';
import type { Media } from '../../types';

interface ImageViewerProps {
  media: Media[];
  altText: string;
  noImageText: string;
  onImageClick: (media: Media[], startIndex: number) => void;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ media, altText, noImageText, onImageClick, className = '' }) => {
  const { t } = useAppContext();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStart = useRef<{ x: number, y: number } | null>(null);
  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [media]);

  useEffect(() => {
    if (thumbnailsContainerRef.current) {
      const container = thumbnailsContainerRef.current;
      const thumbnail = container.children[currentImageIndex] as HTMLElement;

      if (thumbnail) {
        const containerWidth = container.offsetWidth;
        const thumbOffset = thumbnail.offsetLeft;
        const thumbWidth = thumbnail.offsetWidth;
        const scrollTarget = thumbOffset - (containerWidth / 2) + (thumbWidth / 2);

        container.scrollTo({
          left: scrollTarget,
          behavior: 'smooth'
        });
      }
    }
  }, [currentImageIndex]);

  if (!media || media.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-gray-400 opacity-60 h-full ${className}`}>
        <Icon name="ImageOff" size={48} className="mb-4 opacity-50" />
        <span className="font-medium text-lg tracking-tight">{noImageText}</span>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (media.length <= 1) return;
    if (e.key === 'ArrowLeft') {
      setCurrentImageIndex((prev) => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'ArrowRight') {
      setCurrentImageIndex((prev) => prev < media.length - 1 ? prev + 1 : prev);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (media.length > 1) {
      e.stopPropagation();
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (media.length > 1) e.stopPropagation();
    if (!touchStart.current || media.length <= 1) return;
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
      if (currentImageIndex === 0 && deltaX > 0) effectiveDelta *= 0.3;
      if (currentImageIndex === media.length - 1 && deltaX < 0) effectiveDelta *= 0.3;
      setSwipeOffset(effectiveDelta);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (media.length > 1) e.stopPropagation();
    if (!touchStart.current || media.length <= 1) {
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }
    if (isSwiping) {
      const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
      if (deltaX < -50) setCurrentImageIndex((prev) => prev < media.length - 1 ? prev + 1 : prev);
      else if (deltaX > 50) setCurrentImageIndex((prev) => prev > 0 ? prev - 1 : prev);
    }
    setIsSwiping(false);
    setSwipeOffset(0);
    touchStart.current = null;
  };

  return (
    <div
      className={`flex flex-col items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50 ${className}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        className="relative w-full grow flex items-center justify-center mb-4 min-h-[200px] overflow-hidden group"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translateX(calc(-${currentImageIndex * 100}% + ${swipeOffset}px))`,
            transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform'
          }}
        >
          {media.map((m, idx) => (
            <div key={idx} className="flex-none w-full h-full flex flex-col items-center justify-center relative px-2">
              <img
                src={m.url}
                alt={m.caption || altText}
                onClick={() => onImageClick(media, idx)}
                className={`max-w-full max-h-full object-contain rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition-all duration-300 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-40'}`}
              />
              {(m.caption || m.copyright) && (
                <div className={`mt-4 text-center px-4 w-full transition-opacity duration-300 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}>
                  {m.caption && <p className="text-sm font-semibold text-text">{m.caption}</p>}
                  {m.copyright && <p className="text-xs text-gray-500 opacity-80">{m.copyright}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
        {media.length > 1 && (
          <>
            {currentImageIndex > 0 && <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => prev - 1); }} className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md hover:scale-110 z-20 border border-white/10"><Icon name="ChevronLeft" size={24} /></button>}
            {currentImageIndex < media.length - 1 && <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => prev + 1); }} className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md hover:scale-110 z-20 border border-white/10"><Icon name="ChevronRight" size={24} /></button>}
            <span className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-2.5 py-1 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-20 shadow-sm">{currentImageIndex + 1} / {media.length}</span>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="w-full mt-auto pb-2 shrink-0 px-2">
          <div 
            ref={thumbnailsContainerRef}
            className="flex gap-2 mx-auto w-fit max-w-full overflow-x-auto pb-1 snap-x scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            {media.map((m, i) => (
              <img 
                key={i} 
                src={m.url} 
                alt={`${t('thumbnail' as any)} ${i + 1}`} 
                onClick={() => setCurrentImageIndex(i)} 
                className={`w-12 h-12 object-cover rounded-xl cursor-pointer border-2 transition-all duration-300 shrink-0 snap-center ${i === currentImageIndex ? 'border-accent scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100 hover:border-white/50'}`} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
