import React from 'react';
import { Modal } from './Modal';
import { Icon } from '../Icon';
import type { KeyData } from '../../types';
import { marked } from 'marked';

// --- KeyInfoModal ---
interface KeyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyData: KeyData | null;
  t: (key: string) => string;
}
export const KeyInfoModal: React.FC<KeyInfoModalProps> = ({ isOpen, onClose, keyData, t }) => {
  if (!keyData) return <Modal isOpen={isOpen} onClose={onClose} title={t('loading')}><div /></Modal>;

  const parsedDescription = (marked.parse(keyData.keyDescription || '') as string).replace(/<a (?![^>]*\btarget=)/g, '<a target="_blank" rel="noopener noreferrer" ');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('keyInfo')}>
      <div className="p-7">
        <h2 className="text-3xl font-black text-accent mb-3 tracking-tight">{keyData.keyTitle}</h2>
        {keyData.keyAuthors && <p className="font-semibold text-gray-500 mb-5 flex items-center gap-2 bg-bg/80 backdrop-blur-sm w-fit px-3 py-1.5 rounded-full border border-white/20 dark:border-white/10 shadow-inner"><Icon name="Users" size={16} /> {keyData.keyAuthors}</p>}
        <div className="text-lg text-text/90 markdown-body [&>p]:mb-3 [&>p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-3 [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_a]:text-accent hover:[&_a]:text-accent-hover [&_h1]:font-bold [&_h1]:text-lg [&_h2]:font-bold [&_h3]:font-semibold break-words" dangerouslySetInnerHTML={{ __html: parsedDescription }} />      </div>
    </Modal>
  );
};
