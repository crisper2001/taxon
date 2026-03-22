import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { ImageViewer } from '../common/ImageViewer';
import type { KeyData, Media } from '../../types';
import { Icon } from '../Icon';
import { Markdown } from '../common/Markdown';

// --- FeatureImageModal ---
interface FeatureImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureId: string;
    keyData: KeyData | null;
    t: (key: string) => string;
    onImageClick: (media: Media[], startIndex: number) => void;
}
export const FeatureImageModal: React.FC<FeatureImageModalProps> = ({ isOpen, onClose, featureId, keyData, t, onImageClick }) => {
    const [activeFeatureId, setActiveFeatureId] = useState(featureId);

    useEffect(() => {
        if (isOpen) {
            setActiveFeatureId(featureId);
        }
    }, [isOpen, featureId]);

    const feature = keyData?.allFeatures.get(activeFeatureId);
    const media = useMemo(() => keyData?.featureMedia.get(activeFeatureId) || [], [keyData, activeFeatureId]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={feature?.name || t('loading')}>
            <div className="flex flex-col max-h-[80vh] overflow-hidden bg-bg rounded-b-3xl">
                <ImageViewer
                    media={media}
                    altText={feature?.name || ''}
                    noImageText={t('noImageAvailable')}
                    onImageClick={onImageClick}
                    className={`p-5 ${feature?.description ? 'h-[50vh] shrink-0 border-b border-white/10' : 'max-h-[80vh]'} bg-bg/80 backdrop-blur-sm overflow-hidden`}
                />
                {feature?.description && (
                    <div className="p-6 overflow-y-auto bg-panel-bg/90 backdrop-blur-xl shrink-0 max-h-[30vh] border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                        <div className="w-full font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2 text-left p-1 tracking-tight">
                            <Icon name="FileText" size={16} />
                            <span className="grow">{t('kbDescription')}</span>
                        </div>
                        <Markdown content={feature.description} className="text-sm pl-2 pr-2 opacity-90" />
                    </div>
                )}
            </div>
        </Modal>
    );
};
