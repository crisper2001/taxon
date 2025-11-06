import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { ImageViewer } from '../common/ImageViewer';
import type { KeyData, Media } from '../../types';

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
            <ImageViewer
                media={media}
                altText={feature?.name || ''}
                noImageText={t('noImageAvailable')}
                onImageClick={onImageClick}
                className="p-4 max-h-[80vh]"
            />
        </Modal>
    );
};
