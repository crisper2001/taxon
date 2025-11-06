import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../Icon';
import type { Media } from '../../types';

// --- ImageLightboxModal ---
interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: Media[] | null;
  startIndex: number;
}
export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ isOpen, onClose, media, startIndex = 0 }) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(startIndex);

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
      setCurrentIndex((prev) => (prev + 1) % media.length);
    }
  }, [media]);

  const handlePrev = useCallback(() => {
    if (media) {
      setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
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

  if (!isRendered || !media || media.length === 0) return null;
  const currentMedia = media[currentIndex];

  return (
    <div onClick={onClose} className={`fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'bg-opacity-80' : 'bg-opacity-0'}`}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white text-4xl hover:opacity-75 z-20">&times;</button>

      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {media.length > 1 && (
          <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/70 z-20 transition-opacity"><Icon name="ChevronLeft" size={32} /></button>
        )}

        <div className="relative flex flex-col items-center justify-center grow h-full py-24">
          <img
            src={currentMedia.url}
            alt={currentMedia.caption || "Full scale view"}
            className={`max-w-[90vw] max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300 ${isVisible ? 'scale-100' : 'scale-95'}`}
          />
          {(currentMedia.caption || currentMedia.copyright) && (
            <div className="absolute bottom-24 text-white text-center mt-4 p-2 bg-black/40 rounded-lg max-w-[80vw]">
              {currentMedia.caption && <p className="font-semibold">{currentMedia.caption}</p>}
              {currentMedia.copyright && <p className="text-sm opacity-80">{currentMedia.copyright}</p>}
            </div>
          )}
        </div>

        {media.length > 1 && (
          <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/70 z-20 transition-opacity"><Icon name="ChevronRight" size={32} /></button>
        )}

        {media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 justify-center p-2 bg-black/50 rounded-lg flex-wrap max-w-[80vw] overflow-y-auto max-h-[15vh]">
            {media.map((m, i) =>
              <img
                key={i}
                src={m.url}
                onClick={() => setCurrentIndex(i)}
                className={`w-16 h-16 object-cover rounded cursor-pointer border-2 ${i === currentIndex ? 'border-accent' : 'border-transparent hover:border-gray-400'}`}
                alt={`Thumbnail ${i + 1}`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
