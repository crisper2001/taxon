import React, { useState, useEffect } from 'react';
import { Icon } from '../Icon';
import type { Media } from '../../types';

interface ImageViewerProps {
  media: Media[];
  altText: string;
  noImageText: string;
  onImageClick: (media: Media[], startIndex: number) => void;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ media, altText, noImageText, onImageClick, className = '' }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Reset index when media array changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [media]);

  if (!media || media.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-gray-500 gap-2 ${className}`}>
        <Icon name="ImageOff" size={48} />
        <span>{noImageText}</span>
      </div>
    );
  }

  const currentMedia = media[currentImageIndex];

  return (
    <div className={`flex flex-col items-center justify-between ${className}`}>
      <div className="relative w-full grow flex items-center justify-center mb-4 min-h-[200px] group">
        <img src={currentMedia.url} alt={altText} onClick={() => onImageClick(media, currentImageIndex)} className="max-w-full max-h-full object-contain cursor-pointer" />
        {media.length > 1 && (
          <>
            <button onClick={() => setCurrentImageIndex((prev) => (prev - 1 + media.length) % media.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><Icon name="ChevronLeft" /></button>
            <button onClick={() => setCurrentImageIndex((prev) => (prev + 1) % media.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><Icon name="ChevronRight" /></button>
            <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">{currentImageIndex + 1} / {media.length}</span>
          </>
        )}
      </div>
      {currentMedia && (
        <div className="text-center text-sm text-gray-500 w-full">
          {currentMedia.caption && <p className="font-semibold text-text">{currentMedia.caption}</p>}
          {currentMedia.copyright && <p>{currentMedia.copyright}</p>}
        </div>
      )}
      {media.length > 1 && (
        <div className="w-full overflow-x-auto mt-4 pb-2">
          <div className="flex gap-2 justify-center w-max mx-auto">
            {media.map((m, i) => <img key={i} src={m.url} alt={`Thumbnail ${i + 1}`} onClick={() => setCurrentImageIndex(i)} className={`w-12 h-12 object-cover rounded cursor-pointer border-2 shrink-0 ${i === currentImageIndex ? 'border-accent' : 'border-transparent'}`} />)}
          </div>
        </div>
      )}
    </div>
  );
};