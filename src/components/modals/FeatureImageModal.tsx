import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { ImageViewer } from '../common/ImageViewer';
import type { KeyData, Media } from '../../types';
import { marked } from 'marked';
import { Icon } from '../Icon';

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
    const parsedDescription = feature?.description ? (marked.parse(feature.description) as string).replace(/<a (?![^>]*\btarget=)/g, '<a target="_blank" rel="noopener noreferrer" ') : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={feature?.name || t('loading')}>
            <div className="flex flex-col max-h-[80vh] overflow-hidden bg-bg rounded-b-3xl">
                <ImageViewer
                    media={media}
                    altText={feature?.name || ''}
                    noImageText={t('noImageAvailable')}
                    onImageClick={onImageClick}
                    className={`p-5 ${parsedDescription ? 'h-[50vh] shrink-0 border-b border-white/10' : 'max-h-[80vh]'} bg-bg/80 backdrop-blur-sm overflow-hidden`}
                />
                {parsedDescription && (
                    <div className="p-6 overflow-y-auto bg-panel-bg/90 backdrop-blur-xl shrink-0 max-h-[30vh] border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                        <div className="w-full font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2 text-left p-1 tracking-tight">
                            <Icon name="FileText" size={16} />
                            <span className="grow">{t('kbDescription')}</span>
                        </div>
                        <div className="text-sm pl-2 pr-2 text-text opacity-90 leading-relaxed markdown-body [&>p]:mb-3 [&>p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-3 [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_a]:text-accent hover:[&_a]:text-accent-hover [&_h1]:font-bold [&_h1]:text-lg [&_h2]:font-bold [&_h3]:font-semibold break-words" dangerouslySetInnerHTML={{ __html: parsedDescription }} />
                    </div>
                )}
            </div>
        </Modal>
    );
};
