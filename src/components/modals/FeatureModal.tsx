import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { ImageViewer } from '../common/ImageViewer';
import type { KeyData, Media, FeatureNode } from '../../types';
import { Icon } from '../Icon';
import { Markdown } from '../common/Markdown';
import { useSwipe } from '../../hooks/useSwipe';

// --- FeatureModal ---
interface FeatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureId: string;
    keyData: KeyData | null;
    t: (key: string) => string;
    onImageClick: (media: Media[], startIndex: number) => void;
}
export const FeatureModal: React.FC<FeatureModalProps> = ({ isOpen, onClose, featureId, keyData, t, onImageClick }) => {
    const [activeFeatureId, setActiveFeatureId] = useState(featureId);
    const [mobileTab, setMobileTab] = useState<'image' | 'details'>('image');

    const { swipeOffset, isSwiping, handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipe(
        () => { if (mobileTab === 'image') setMobileTab('details'); },
        () => { if (mobileTab === 'details') setMobileTab('image'); },
        mobileTab === 'image',
        mobileTab === 'details'
    );

    useEffect(() => {
        if (isOpen) {
            setActiveFeatureId(featureId);
            setMobileTab('image');
        }
    }, [isOpen, featureId]);

    const feature = keyData?.allFeatures.get(activeFeatureId);
    const media = useMemo(() => keyData?.featureMedia.get(activeFeatureId) || [], [keyData, activeFeatureId]);

    const featureNode = useMemo(() => {
        if (!keyData || !activeFeatureId) return null;
        const findNode = (nodes: FeatureNode[]): FeatureNode | null => {
            for (const n of nodes) {
                if (n.id === activeFeatureId) return n;
                if (n.children && n.children.length > 0) {
                    const found = findNode(n.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findNode(keyData.featureTree);
    }, [keyData, activeFeatureId]);

    const tabIndex = mobileTab === 'image' ? 0 : 1;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={feature?.name || t('loading')} size="lg">
            <div className="flex flex-col h-[75vh] bg-bg/80 backdrop-blur-sm rounded-b-3xl overflow-hidden relative">
                <div className="flex md:contents flex-col grow min-h-0 overflow-hidden relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className={`entity-modal-mobile-view grow ${isSwiping ? 'is-swiping' : ''}`} style={{ '--mobile-tab-offset': `-${tabIndex * 100}%`, '--swipe-offset': `${swipeOffset}px` } as React.CSSProperties}>
                        <ImageViewer
                            media={media}
                            altText={feature?.name || ''}
                            noImageText={t('noImageAvailable')}
                            onImageClick={onImageClick}
                            className="entity-modal-panel is-image md:border-r border-white/10 dark:border-white/5 bg-panel-bg/50"
                        />
                        <div className="entity-modal-desktop-right-pane md:bg-panel-bg/50">
                            <div className="entity-modal-panel is-details max-md:bg-panel-bg/50 flex flex-col p-4 md:p-6 overflow-y-auto">
                                {feature && (
                                    <div className="flex flex-col gap-4">
                                        {feature.description && (
                                            <div className="bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0">
                                                <div className="w-full font-bold text-accent flex items-center gap-2 mb-3 text-left tracking-tight">
                                                    <Icon name="FileText" size={18} />
                                                    <span className="grow text-base">{t('kbDescription')}</span>
                                                </div>
                                                <Markdown content={feature.description} className="text-sm opacity-90" />
                                            </div>
                                        )}
                                        <div className="bg-bg/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-inner shrink-0">
                                            <div className="w-full font-bold text-accent flex items-center gap-2 mb-3 text-left tracking-tight">
                                                <Icon name="Info" size={18} />
                                                <span className="grow text-base">{t('kbMetadata')}</span>
                                            </div>
                                            <div className="text-sm opacity-90 flex flex-col gap-2 text-text">
                                                {!feature.isState ? (
                                                    <>
                                                        <p><span className="font-semibold opacity-70">{t('kbType')}:</span> {feature.type === 'state' ? t('kbTypeState') : t('kbTypeNumeric')}</p>
                                                        {feature.type === 'numeric' && (feature.base_unit && feature.base_unit !== 'none' || feature.unit_prefix && feature.unit_prefix !== 'none') && (() => {
                                                            const prefixMap: Record<string, string> = { 'kilo': 'unitKilo', 'hecto': 'unitHecto', 'deca': 'unitDeca', 'deci': 'unitDeci', 'centi': 'unitCenti', 'milli': 'unitMilli', 'micro': 'unitMicro' };
                                                            const baseMap: Record<string, string> = { 'metre': 'unitMetre', 'square metre': 'unitSquareMetre', 'cubic metre': 'unitCubicMetre', 'litre': 'unitLitre', 'degrees celcius': 'unitCelsius', 'degrees planar': 'unitDegree' };
                                                            const pStr = feature.unit_prefix && prefixMap[feature.unit_prefix] ? t(prefixMap[feature.unit_prefix] as any) : '';
                                                            const bStr = feature.base_unit && baseMap[feature.base_unit] ? t(baseMap[feature.base_unit] as any) : '';
                                                            let finalStr = '';
                                                            if (pStr && bStr) {
                                                                const pMatch = pStr.match(/^(.*?)\s*\((.*?)\)$/);
                                                                const bMatch = bStr.match(/^(.*?)\s*\((.*?)\)$/);
                                                                if (pMatch && bMatch) {
                                                                    finalStr = `${pMatch[1]}${bMatch[1].charAt(0).toLowerCase() + bMatch[1].slice(1)} (${pMatch[2]}${bMatch[2]})`;
                                                                } else {
                                                                    finalStr = `${pStr} ${bStr}`;
                                                                }
                                                            } else {
                                                                finalStr = pStr || bStr;
                                                            }
                                                            return <p><span className="font-semibold opacity-70">{t('kbBaseUnit')}:</span> {finalStr}</p>;
                                                        })()}
                                                        {feature.type === 'state' && featureNode && featureNode.children.length > 0 && (
                                                            <p><span className="font-semibold opacity-70">{t('kbStates')}:</span> {featureNode.children.map(c => c.name).join(', ')}</p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {feature.parentName && <p><span className="font-semibold opacity-70">{t('kbParent')}:</span> {feature.parentName}</p>}
                                                        <p><span className="font-semibold opacity-70">{t('value' as any)}:</span> {t('scoreCommon')}, {t('scoreRare')}, {t('scoreUncertain')}, {t('scoreCommonMisinterpret')}, {t('scoreRareMisinterpret')}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Mobile Bottom Bar */}
                <div className="flex md:hidden items-center justify-around bg-panel-bg/85 backdrop-blur-xl border border-white/20 dark:border-white/10 p-2 shrink-0 z-20 shadow-lg rounded-3xl m-2 mb-3">
                    <button onClick={() => setMobileTab('image')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 ${mobileTab === 'image' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50'}`}>
                        <Icon name="Image" size={22} />
                        <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('preview')}</span>
                    </button>
                    <button onClick={() => setMobileTab('details')} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl transition-all duration-300 ${mobileTab === 'details' ? 'text-accent bg-accent/10 shadow-inner scale-105' : 'text-gray-500 hover:text-accent hover:bg-hover-bg/50'}`}>
                        <Icon name="FileText" size={22} />
                        <span className="text-[10px] font-bold text-center leading-none tracking-tight">{t('kbDescription')}</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};