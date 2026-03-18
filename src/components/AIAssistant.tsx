import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { callGeminiAPI } from '../services/GeminiService';
import type { KeyData, GeminiResponse, GeminiFeatureMatch, Entity, StateScore, NumericScore, RawChatMessage, AiMessageVersion } from '../types';
import { marked } from 'marked';
import Spot from './Spot';

interface AIAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  keyData: KeyData | null;
  onEntityClick: (id: string) => void;
  t: (key: string) => string;
  lang: string;
  geminiApiKey: string;
  chatHistory: RawChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<RawChatMessage[]>>;
}

// Rendered message structure
interface ChatMessage {
  sender: 'user' | 'ai';
  content: string;
  data?: GeminiResponse;
  versions?: AiMessageVersion[];
  currentVersionIndex?: number;
}

const findMatchingEntities = (features: GeminiFeatureMatch[], keyData: KeyData): Entity[] => {
  if (!features || features.length === 0) {
    return Array.from(keyData.allEntities.values());
  }

  const matchingEntityIds = new Set<string>(keyData.allEntities.keys());

  for (const featureMatch of features) {
    const featureInfo = keyData.allFeatures.get(featureMatch.id);
    if (!featureInfo) continue;

    for (const entityId of matchingEntityIds) {
      const scores = keyData.entityScores.get(entityId);
      if (!scores || !scores.has(featureMatch.id)) {
        matchingEntityIds.delete(entityId);
        continue;
      }

      const score = scores.get(featureMatch.id)!;

      if (featureInfo.type === 'state') {
        if ((score as StateScore).value === '0') {
          matchingEntityIds.delete(entityId);
        }
      } else if (featureInfo.type === 'numeric' && featureMatch.value) {
        const userValue = parseFloat(featureMatch.value);
        const numericScore = score as NumericScore;
        if (isNaN(userValue) || userValue < numericScore.min || userValue > numericScore.max) {
          matchingEntityIds.delete(entityId);
        }
      }
    }
  }

  return Array.from(matchingEntityIds).map(id => keyData.allEntities.get(id)!);
};

const ChatMessageBubble: React.FC<{
  msg: ChatMessage;
  index: number;
  keyData: KeyData | null;
  t: (key: string) => string;
  isLatestAi?: boolean;
  isLatestUser?: boolean;
  onRegenerate?: () => void;
  onEditSubmit?: (index: number, newText: string) => void;
  onVersionChange?: (index: number, newVersionIndex: number) => void;
  isThinking?: boolean;
} > = ({ msg, index, keyData, t, isLatestAi, isLatestUser, onRegenerate, onEditSubmit, onVersionChange, isThinking }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  // Truncate AI messages if they exceed 500 characters
  const isLong = msg.sender === 'ai' && msg.content.length > 500;
  const [isExpanded, setIsExpanded] = useState(!isLong);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus and resize when entering edit mode
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
      editTextareaRef.current.selectionStart = editTextareaRef.current.value.length;
      editTextareaRef.current.selectionEnd = editTextareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(msg.content);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue.trim() !== msg.content.trim() && onEditSubmit) {
      setIsEditing(false);
      onEditSubmit(index, editValue);
    } else if (editValue.trim() === msg.content.trim()) {
      setIsEditing(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
  };

  const handleCopy = () => {
    // Strip out HTML tags (like the clickable-entity spans) to copy plain clean text/Markdown
    const textToCopy = msg.content.replace(/<[^>]*>?/gm, '');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const hasFeatures = msg.data?.features_used && msg.data.features_used.length > 0;
  const hasEntities = msg.data?.entities_used && msg.data.entities_used.length > 0;
  const hasConsideredData = hasFeatures || hasEntities;

  return (
    <div className={`chat-message flex flex-col animate-fade-in-up duration-300 ease-out space-y-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`msg-content flex flex-col max-w-[90%] p-3 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-accent text-white rounded-br-lg' : 'bg-header-bg rounded-bl-lg'}`}>
        
        {/* Text Content */}
        {isEditing ? (
          <div className="flex flex-col w-full min-w-[200px] sm:min-w-[250px]">
            <textarea
              ref={editTextareaRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={handleEditKeyDown}
              className="w-full bg-black/10 text-white border-none rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-sans"
              rows={1}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={handleCancelEdit} className="text-xs px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 transition-colors font-medium">{t('cancel')}</button>
              <button onClick={handleSaveEdit} disabled={!editValue.trim() || isThinking} className="text-xs px-3 py-1.5 rounded-md bg-white text-accent hover:bg-gray-100 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed">{t('save')}</button>
            </div>
          </div>
        ) : (
          <div className={`relative ${!isExpanded ? 'max-h-48 overflow-hidden' : ''}`}>
            <div className="markdown-body text-base [&>p]:mb-2 [&>p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-2 [&_strong]:font-semibold [&_em]:italic [&_a]:underline [&_h1]:font-bold [&_h1]:text-lg [&_h2]:font-bold [&_h3]:font-semibold break-words" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }} />
            {!isExpanded && (
              <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-header-bg to-transparent pointer-events-none" />
            )}
          </div>
        )}

        {/* Read More Toggle */}
        {isLong && !isEditing && (
          <div className="mt-1">
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-accent font-semibold hover:underline focus:outline-none">
              {isExpanded ? t('readLess') : t('readMore')}
            </button>
          </div>
        )}

        {/* Action Bar */}
        {msg.sender === 'user' && isLatestUser && !isEditing && onEditSubmit && (
          <div className="mt-1 flex justify-end">
            <button 
              onClick={() => setIsEditing(true)} 
              disabled={isThinking}
              title={t('edit')} 
              className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-all cursor-pointer focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="Pencil" className="w-3.5 h-3.5" />
              <span>{t('edit')}</span>
            </button>
          </div>
        )}
        {msg.sender === 'ai' && msg.content && (
          <div className="mt-2 flex items-center justify-between">
            <div>
              {msg.versions && msg.versions.length > 1 && (
                 <div className="flex items-center gap-2 text-xs text-text opacity-70 bg-bg px-2 py-1 rounded-md border border-border shadow-sm">
                    <button 
                      onClick={() => onVersionChange && onVersionChange(index, msg.currentVersionIndex! - 1)}
                      disabled={msg.currentVersionIndex === 0 || isThinking}
                      className="hover:text-accent disabled:opacity-30 cursor-pointer flex items-center justify-center transition-colors"
                      title="Previous version"
                    ><Icon name="ChevronLeft" size={14} /></button>
                    <span className="font-medium select-none min-w-[2rem] text-center">{msg.currentVersionIndex! + 1} / {msg.versions.length}</span>
                    <button 
                      onClick={() => onVersionChange && onVersionChange(index, msg.currentVersionIndex! + 1)}
                      disabled={msg.currentVersionIndex === msg.versions.length - 1 || isThinking}
                      className="hover:text-accent disabled:opacity-30 cursor-pointer flex items-center justify-center transition-colors"
                      title="Next version"
                    ><Icon name="ChevronRight" size={14} /></button>
                 </div>
              )}
            </div>
            <div className="flex gap-3">
              {isLatestAi && onRegenerate && (
                <button 
                  onClick={onRegenerate} 
                  disabled={isThinking}
                  title={t('regenerate')} 
                  className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 hover:text-accent transition-all cursor-pointer focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Icon name="RefreshCw" className={`w-3.5 h-3.5 ${isThinking ? 'animate-spin' : ''}`} />
                  <span>{t('regenerate')}</span>
                </button>
              )}
              <button onClick={handleCopy} title={t('copy')} className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 hover:text-accent transition-all cursor-pointer focus:outline-none"><Icon name={isCopied ? "Check" : "Copy"} className="w-3.5 h-3.5" /><span>{isCopied ? t('copied') : t('copy')}</span></button>
            </div>
          </div>
        )}
      </div>

      {/* Togglable Features & Entities Considered (Separated from main bubble) */}
      {hasConsideredData && (
        <div className={`flex flex-col max-w-[90%] w-full ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
          <button 
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-accent transition-colors py-1 px-2 rounded-md hover:bg-hover-bg focus:outline-none"
          >
            <Icon name="List" className="w-3.5 h-3.5" />
            <span>{t('aiConsideredData')}</span>
            <Icon name="ChevronRight" className={`w-3.5 h-3.5 transition-transform duration-300 ${isDetailsExpanded ? 'rotate-90' : ''}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out w-full ${isDetailsExpanded ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <div className="p-3 bg-panel-bg border border-border rounded-xl shadow-sm text-sm w-full overflow-y-auto">
              {hasFeatures && (
                <div className="mb-2 last:mb-0"><h4 className="text-xs font-semibold mb-1 opacity-80 uppercase tracking-wider">{t('aiFeaturesConsidered')}</h4><ul className="list-disc list-inside text-xs space-y-1 opacity-90">{msg.data!.features_used.map(f => { const feature = keyData!.allFeatures.get(f.id); const featureName = feature ? (feature.parentName ? `${feature.parentName}: ${feature.name}` : feature.name) : f.description; return <li key={f.id}>{featureName}</li>; })}</ul></div>
              )}
              {hasEntities && (
                <div className="mb-2 last:mb-0"><h4 className="text-xs font-semibold mb-1 opacity-80 uppercase tracking-wider">{t('aiEntitiesConsidered')}</h4><ul className="list-disc list-inside text-xs space-y-1 opacity-90">{msg.data!.entities_used.map(e => (<li key={e.id}>{e.name}</li>))}</ul></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ isVisible, onClose, keyData, onEntityClick, t, lang, geminiApiKey, chatHistory: rawChatHistory, setChatHistory: setRawChatHistory }) => {
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consolidatedDescription = useRef("");
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const mentionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [mentionState, setMentionState] = useState<{ active: boolean; search: string; startIndex: number }>({ active: false, search: '', startIndex: -1 });
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const allMentionableItems = useMemo(() => {
    if (!keyData) return [];
    const entities = Array.from(keyData.allEntities.values()).map(e => ({ type: 'entity' as const, id: e.id, name: e.name }));
    const features = Array.from(keyData.allFeatures.values()).map(f => {
      const name = f.parentName ? `${f.parentName}: ${f.name}` : f.name;
      return { type: 'feature' as const, id: f.id, name };
    });
    return [...entities, ...features].sort((a, b) => b.name.length - a.name.length);
  }, [keyData]);

  const mentionOptions = useMemo(() => {
    if (!mentionState.active || !keyData) return [];
    
    const search = mentionState.search.toLowerCase();
    const entities = Array.from(keyData.allEntities.values()).map(e => ({ type: 'entity' as const, id: e.id, name: e.name }));
    const features = Array.from(keyData.allFeatures.values()).map(f => {
      const name = f.parentName ? `${f.parentName}: ${f.name}` : f.name;
      return { type: 'feature' as const, id: f.id, name };
    });
    
    const all = [...entities, ...features];
    if (!search) return all.slice(0, 30);
    
    return all.filter(item => item.name.toLowerCase().includes(search)).slice(0, 30);
  }, [mentionState.active, mentionState.search, keyData]);

  useEffect(() => {
    if (mentionState.active && mentionRefs.current[mentionSelectedIndex]) {
      mentionRefs.current[mentionSelectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [mentionSelectedIndex, mentionState.active]);

  // Effect to reset chat when the key file changes.
  const handleClearHistory = () => {
    if (confirm(t('confirmClearHistory'))) {
      setRawChatHistory([]);
      consolidatedDescription.current = "";
    }
  };

  // Derive translated chat history from raw data.
  // This memo re-runs when language (t) or data (rawChatHistory) changes.
  const chatHistory: ChatMessage[] = useMemo(() => {
    if (!keyData) return [];
    return rawChatHistory.map(msg => {
      if (msg.sender === 'user') {
        return { sender: 'user', content: msg.content || '', data: undefined };
      }

      let content = '';
      switch (msg.aiType) {
        case 'ready':
          content = t('aiReady');
          break;
        case 'error':
          content = msg.errorText || t('aiError');
          break;
        case 'no_features':
          content = t('aiNoFeatures');
          break;
        case 'response': {
          if (msg.data?.answer && msg.data.answer.trim().length > 0) {
            content = msg.data.answer;
          } else {
            const features = msg.data?.features_used || [];
            if (features.length > 0) {
              const matchingEntities = findMatchingEntities(features, keyData);
              const count = matchingEntities.length;
              const matchesText = matchingEntities
                .map(e => `<span class="clickable-entity text-accent font-semibold cursor-pointer hover:underline" data-id="${e.id}">${e.name}</span>`)
                .join(', ');

              if (count === 1) {
                content = `${t('aiSingleMatch')} ${matchesText}.`;
              } else if (count > 1) {
                content = `${t('aiMultipleMatches').replace('{count}', String(count))} ${matchesText}.`;
              } else {
                content = t('aiNoMatch');
              }
            } else {
              content = t('aiNoFeatures');
            }
          }
          break;
        }
        default:
          content = '';
      }
      return { 
        sender: 'ai', 
        content, 
        data: msg.data,
        versions: msg.versions,
        currentVersionIndex: msg.currentVersionIndex
      };
    });
  }, [rawChatHistory, t, keyData]);

  useEffect(() => {
    chatHistoryRef.current?.scrollTo(0, chatHistoryRef.current.scrollHeight);
  }, [chatHistory]);

  const handleEntityClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const clickable = target.closest('.clickable-entity');
    if (clickable && clickable.getAttribute('data-id')) {
      onEntityClick(clickable.getAttribute('data-id')!);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setUserInput(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1) {
      const searchStr = textBeforeCursor.slice(lastAt + 1);
      if (!searchStr.includes('\n') && searchStr.length < 50) {
        setMentionState({ active: true, search: searchStr, startIndex: lastAt });
        setMentionSelectedIndex(0);
      } else {
        setMentionState({ active: false, search: '', startIndex: -1 });
      }
    } else {
      setMentionState({ active: false, search: '', startIndex: -1 });
    }
  };

  const insertMention = (item: { name: string }) => {
    const before = userInput.slice(0, mentionState.startIndex);
    const after = userInput.slice(textareaRef.current?.selectionStart || userInput.length);
    const newVal = `${before}@${item.name} ${after}`;
    setUserInput(newVal);
    setMentionState({ active: false, search: '', startIndex: -1 });
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = before.length + item.name.length + 2;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
      }
    }, 0);
  };

  const sendMessage = async (overrideText?: string, overrideHistory?: RawChatMessage[], regenerateAiIndex?: number) => {
    const text = overrideText !== undefined ? overrideText : userInput;
    if (!text.trim() || isThinking || !keyData) return;

    let currentHistory = overrideHistory || rawChatHistory;

    if (overrideText === undefined) {
      const userMessage: RawChatMessage = { sender: 'user', content: text };
      currentHistory = [...currentHistory, userMessage];
      setRawChatHistory(currentHistory);
      setUserInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset height
    }

    setIsThinking(true);
    setError(null);

    // Pre-search the user input for any mentioned entity names to provide only relevant profiles
    const lowerInput = text.toLowerCase();

    // Find entities and features referenced in the most recent AI response to maintain conversational context
    const lastAiMessage = currentHistory.slice().reverse().find(m => m.sender === 'ai' && m.data);
    const previousEntityNames = (lastAiMessage?.data?.entities_used || []).map(e => e.name.toLowerCase());
    const previousFeatureIds = (lastAiMessage?.data?.features_used || []).map(f => f.id);

    const relevantEntityProfiles = Array.from(keyData.entityProfiles.values())
      .filter(ep => lowerInput.includes(ep.name.toLowerCase()) || previousEntityNames.includes(ep.name.toLowerCase()))
      .map(ep => ({
        name: ep.name,
        characteristics: ep.characteristics.map(c => `${c.parent ? c.parent + ': ' : ''}${c.text}`)
      }));

    // Pre-search the feature list using keyword matching to reduce payload size
    const fullSearchContext = (consolidatedDescription.current + " " + text).toLowerCase();
    const relevantFeatures = keyData.featureListForAI.filter(f => {
      if (previousFeatureIds.includes(f.id)) return true; // keep previously used features context
      
      // Include CJK full-width punctuation in the split (e.g., 、 。 ！ ？ 「 」 【 】)
      const words = f.description.toLowerCase().split(/[\s:\-,()。、！？「」【】]+/);
      return words.some(word => {
        // Include Korean Hangul (\uAC00-\uD7AF, \u3130-\u318F)
        const isCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uF900-\uFAFF\uFF66-\uFF9F\uAC00-\uD7AF\u3130-\u318F]/.test(word);
        return (isCJK ? word.length >= 1 : word.length > 3) && fullSearchContext.includes(word);
      });
    });
    const featuresToSend = relevantFeatures.length > 0 ? relevantFeatures : keyData.featureListForAI;

    const languageNames: Record<string, string> = {
      'en': 'English',
      'pt-br': 'Portuguese (Brazil)',
      'es': 'Spanish',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'fr': 'French',
      'de': 'German',
      'la': 'Latin',
      'it': 'Italian'
    };
    const targetLanguage = languageNames[lang] || 'English';

    const systemInstruction = `You are an expert taxonomist assisting a user with a Lucid identification key.

**Key Metadata:**
- Title: ${keyData.keyTitle}
- Authors: ${keyData.keyAuthors}
- Description: ${keyData.keyDescription}

**Instructions:**
1. Determine if the user is describing a specimen for identification OR asking an informational question about the key, its features, or its entities.
2. **If Identifying a Specimen:**
   - Read the "Current Description" and the "New User Message". Synthesize them into an "updated_description" (e.g. adding new traits, or replacing corrected ones).
   - Map the traits based ONLY on the "updated_description" to the provided "Feature List". Populate "features_used".
   - Leave "answer" and "entities_used" empty.
3. **If Asking a Question:**
   - Provide a helpful, professional, and concise response based STRICTLY on the Key Metadata, Feature List, or Entity Profiles in the "answer" field.
   - **Structure:** Start with a direct answer, followed by supporting details using bullet points if applicable.
   - **Constraints:** Do not invent or hallucinate information outside of the provided data. Only answer questions related to taxonomy, specimen identification, or the provided key data. If the answer is not in the data or the question is off-topic, politely state that you cannot answer it based on the available information. Use Markdown to format your response.
   - Set "updated_description" to exactly match the "Current Description".
   - Populate "features_used" and "entities_used" with any features or entities you explicitly referenced to answer the question, or that are still the main subject of the ongoing conversation. Carry over relevant "features_used" and "entities_used" from your previous answers unless the user's new message implies they should be discarded or changes the subject.
4. **Language:** Always formulate your conversational "answer" and the "updated_description" in ${targetLanguage}.
5. **JSON Output:** Respond ONLY with a single JSON object with this structure:
    - \`updated_description\`: (string) The running description of the entity.
    - \`features_used\`: (array of objects) With \`id\`, \`description\`, and optionally \`value\`.
    - \`entities_used\`: (array of objects) With \`id\` and \`name\` of entities explicitly mentioned.
    - \`answer\`: (string) Your conversational answer to a question (leave empty if identifying).
`;
    const prompt = `**Data:**

**Current Description:**
"${consolidatedDescription.current}"

**New User Message:**
"${text}"

**Feature List (id, type, description):**
${JSON.stringify(featuresToSend)}

**Entity Profiles (name, characteristics):**
${relevantEntityProfiles.length > 0 ? JSON.stringify(relevantEntityProfiles) : `No specific entities cited. Available entities in this key: ${Array.from(keyData.allEntities.values()).map(e => e.name).join(', ')}`}`;

    // Format previous chat history for the API to provide multi-turn context.
    // We exclude the very last message (the current user prompt) to prevent duplicate roles in the API request.
    const historyPayload = currentHistory.slice(0, -1)
      .filter(msg => msg.content || msg.data) // Filter out pure error or loading states
      .map(msg => ({
        role: (msg.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ 
          text: msg.sender === 'user' 
            ? msg.content! 
            : JSON.stringify(msg.data) // Pass the AI's previous JSON responses back to it
        }]
      }));

    try {
      const response = await callGeminiAPI(prompt, 'gemini-3.1-flash-lite-preview', geminiApiKey, systemInstruction, historyPayload);

      // Stop "thinking" indicator
      setIsThinking(false);

      // Delay showing the response to make it feel less abrupt
      setTimeout(() => {
        consolidatedDescription.current = response.updated_description;
        if (regenerateAiIndex !== undefined && regenerateAiIndex !== -1) {
          setRawChatHistory(prev => {
            const newHistory = [...prev];
            const targetMsg = newHistory[regenerateAiIndex];
            const newVersion: AiMessageVersion = { aiType: 'response', data: response };
            const versions = targetMsg.versions ? [...targetMsg.versions] : [{ aiType: targetMsg.aiType!, data: targetMsg.data, errorText: targetMsg.errorText }];
            versions.push(newVersion);
            newHistory[regenerateAiIndex] = {
              ...targetMsg,
              aiType: 'response',
              data: response,
              errorText: undefined,
              versions,
              currentVersionIndex: versions.length - 1
            };
            return newHistory;
          });
        } else {
          const aiMessage: RawChatMessage = { 
            sender: 'ai', 
            aiType: 'response', 
            data: response,
            versions: [{ aiType: 'response', data: response }],
            currentVersionIndex: 0
          };
          setRawChatHistory(prev => [...prev, aiMessage]);
        }
      }, 500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('aiError');
      setError(errorMessage);
      
      if (regenerateAiIndex !== undefined && regenerateAiIndex !== -1) {
        setRawChatHistory(prev => {
          const newHistory = [...prev];
          const targetMsg = newHistory[regenerateAiIndex];
          const newVersion: AiMessageVersion = { aiType: 'error', errorText: errorMessage };
          const versions = targetMsg.versions ? [...targetMsg.versions] : [{ aiType: targetMsg.aiType!, data: targetMsg.data, errorText: targetMsg.errorText }];
          versions.push(newVersion);
          newHistory[regenerateAiIndex] = {
            ...targetMsg,
            aiType: 'error',
            data: undefined,
            errorText: errorMessage,
            versions,
            currentVersionIndex: versions.length - 1
          };
          return newHistory;
        });
      } else {
        setRawChatHistory(prev => [...prev, { 
          sender: 'ai', 
          aiType: 'error', 
          errorText: errorMessage,
          versions: [{ aiType: 'error', errorText: errorMessage }],
          currentVersionIndex: 0 
        }]);
      }
      setIsThinking(false);
    }
  };

  const handleRegenerate = () => {
    const lastUserMsgIndex = rawChatHistory.map(m => m.sender).lastIndexOf('user');
    const lastAiMsgIndex = rawChatHistory.map(m => m.sender).lastIndexOf('ai');
    if (lastUserMsgIndex === -1 || lastAiMsgIndex === -1 || isThinking || !keyData) return;

    const lastUserMsg = rawChatHistory[lastUserMsgIndex];
    const historyForPrompt = rawChatHistory.slice(0, lastUserMsgIndex + 1);
    
    const lastValidAiMessage = historyForPrompt.slice().reverse().find(m => m.sender === 'ai' && m.data);
    consolidatedDescription.current = lastValidAiMessage?.data?.updated_description || "";

    sendMessage(lastUserMsg.content, historyForPrompt, lastAiMsgIndex);
  };

  const handleEditSubmit = (index: number, newContent: string) => {
    if (isThinking || !keyData) return;

    const newHistory = rawChatHistory.slice(0, index); // exclude the message itself
    
    const lastAiMessage = newHistory.slice().reverse().find(m => m.sender === 'ai' && m.data);
    consolidatedDescription.current = lastAiMessage?.data?.updated_description || "";

    const updatedUserMessage: RawChatMessage = { sender: 'user', content: newContent };
    const historyForPrompt = [...newHistory, updatedUserMessage];

    setRawChatHistory(historyForPrompt);
    sendMessage(newContent, historyForPrompt);
  };

  const handleVersionChange = (index: number, newVersionIndex: number) => {
    setRawChatHistory(prev => {
      const newHistory = [...prev];
      const msg = newHistory[index];
      if (msg.versions && msg.versions[newVersionIndex]) {
        const version = msg.versions[newVersionIndex];
        newHistory[index] = {
          ...msg,
          aiType: version.aiType,
          data: version.data,
          errorText: version.errorText,
          currentVersionIndex: newVersionIndex
        };
        
        if (index === newHistory.length - 1) {
           const prevData = version.data;
           if (prevData?.updated_description) {
              consolidatedDescription.current = prevData.updated_description;
           } else {
              const lastValid = newHistory.slice(0, index).reverse().find(m => m.sender === 'ai' && m.data);
              consolidatedDescription.current = lastValid?.data?.updated_description || "";
           }
        }
      }
      return newHistory;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.active && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev + 1) % mentionOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev - 1 + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionOptions[mentionSelectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionState({ active: false, search: '', startIndex: -1 });
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Renders the highlighted text behind the transparent textarea
  const renderHighlights = () => {
    if (!userInput) return null;
    let elements: React.ReactNode[] = [];
    let remaining = userInput;
    let keyCounter = 0;

    while (remaining) {
      const atIndex = remaining.indexOf('@');
      if (atIndex === -1) {
        elements.push(<span key={keyCounter++}>{remaining}</span>);
        break;
      }
      if (atIndex > 0) {
        elements.push(<span key={keyCounter++}>{remaining.slice(0, atIndex)}</span>);
      }
      remaining = remaining.slice(atIndex); // Starts with '@'

      let matchedName = null;
      let matchedType = null;
      for (const item of allMentionableItems) {
        if (remaining.substring(1).toLowerCase().startsWith(item.name.toLowerCase())) {
          const nextChar = remaining.charAt(1 + item.name.length);
          // Ensure the match ends at a natural word boundary
          if (!nextChar || /^[\s,.'";:!?()\[\]{}]+$/.test(nextChar)) {
            matchedName = item.name;
            matchedType = item.type;
            break;
          }
        }
      }

      if (matchedName) {
        const matchText = remaining.slice(0, 1 + matchedName.length);
        // Note: Avoid changing font-weight or horizontal padding here, otherwise the transparent cursor will visually misalign with the text beneath!
        const colorClass = matchedType === 'entity' ? 'bg-accent/20 text-accent' : 'bg-green-500/20 text-green-600';
        elements.push(<span key={keyCounter++} className={`rounded-sm ${colorClass}`}>{matchText}</span>);
        remaining = remaining.slice(1 + matchedName.length);
      } else {
        elements.push(<span key={keyCounter++}>@</span>);
        remaining = remaining.slice(1);
      }
    }
    return elements;
  };

  const handleClose = () => {
    onClose();
  };

  const isEnabled = !!keyData;
  let placeholder = t('aiWaiting');
  if (!geminiApiKey) placeholder = t('aiNeedApi');
  else if (!keyData) placeholder = t('aiNeedKey');
  else placeholder = t('aiDescribe');


  return (
    <div className={`panel flex flex-col h-full w-full bg-panel-bg border-l border-border shadow-lg overflow-hidden`} >
      {rawChatHistory.length === 0 || !keyData ? (
        // Unified Welcome Screen when chat is empty
        <div className="flex flex-col items-center justify-center h-full text-center text-text animate-fade-in p-6 relative bg-gradient-to-b from-panel-bg to-bg">
          <div className="absolute top-3 right-3">
            <button onClick={handleClose} title={t('closePanel')} className="p-2 rounded-md hover:bg-hover-bg cursor-pointer opacity-70 hover:opacity-100 transition-opacity"><Icon name="PanelRightClose" size={20} /></button>
          </div>
          <div className="flex flex-col items-center max-w-sm">
            <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="body" className="w-12 mb-4 text-accent" />
            <h3 className="text-2xl font-bold mb-3">{t('assistant')}</h3>
            <p className="text-sm opacity-80 leading-relaxed">{keyData ? t('aiReady') : t('aiNeedKey')}</p>
          </div>
        </div>
      ) : (
        // Standard chat view
        <>
          <div className="panel-header flex items-center justify-between p-3 border-b border-border bg-header-bg shrink-0">
            <button onClick={handleClearHistory} title={t('clearHistory')} className="p-1 rounded hover:bg-hover-bg cursor-pointer"><Icon name="Trash2" /></button>
            <div className="panel-title font-bold flex items-center gap-2 text-md text-accent text-lg">
              <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="head" className="w-7" />
              {t('assistant')}
            </div>
            <button onClick={handleClose} title={t('closePanel')} className="p-1 rounded hover:bg-hover-bg cursor-pointer"><Icon name="PanelRightClose" /></button>
          </div>
          <div ref={chatHistoryRef} onClick={handleEntityClick} className="panel-content grow p-4 overflow-y-auto space-y-4">
            {(() => {
              const lastUserIndex = chatHistory.map(m => m.sender).lastIndexOf('user');
              return chatHistory.map((msg, index) => {
                const isLatestAi = msg.sender === 'ai' && index === chatHistory.length - 1;
                const isLatestUser = msg.sender === 'user' && index === lastUserIndex;
                return (
                  <ChatMessageBubble 
                    key={index} 
                    msg={msg} 
                    index={index}
                    keyData={keyData} 
                    t={t} 
                    isLatestAi={isLatestAi}
                    isLatestUser={isLatestUser}
                    onRegenerate={handleRegenerate}
                    onEditSubmit={handleEditSubmit}
                    onVersionChange={handleVersionChange}
                    isThinking={isThinking}
                  />
                );
              });
            })()}
            {isThinking && chatHistory.length > 0 && chatHistory[chatHistory.length - 1].sender === 'user' && (
              <div className="chat-message flex animate-fade-in-up duration-300 ease-out justify-start">
                <div className="msg-content w-3/4 p-4 rounded-2xl shadow-sm bg-header-bg rounded-bl-lg">
                  <div className="flex items-center gap-2 mb-3 text-accent opacity-70">
                    <Icon name="LoaderCircle" className="animate-spin w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">{t('aiAnalyzing')}</span>
                  </div>
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-border rounded w-full"></div>
                    <div className="h-3 bg-border rounded w-5/6"></div>
                    <div className="h-3 bg-border rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <form onSubmit={handleSubmit} className="p-3 pt-1 relative flex flex-col bg-panel-bg shrink-0">
        {mentionState.active && mentionOptions.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 bg-panel-bg border border-border rounded-xl shadow-lg mb-2 max-h-48 overflow-y-auto z-10 flex flex-col py-1 animate-fade-in-up">
            {mentionOptions.map((opt, idx) => (
              <button
                key={`${opt.type}-${opt.id}`}
                ref={el => { mentionRefs.current[idx] = el; }}
                type="button"
                className={`text-left px-3 py-2 text-sm transition-colors ${idx === mentionSelectedIndex ? 'bg-accent/10 text-accent' : 'hover:bg-hover-bg text-text'}`}
                onClick={() => insertMention(opt)}
              >
                <span className="text-[10px] font-bold opacity-50 uppercase mr-2 inline-block w-8">{opt.type === 'entity' ? 'Ent' : 'Feat'}</span>
                {opt.name}
              </button>
            ))}
          </div>
        )}
        <div className={`relative flex items-end w-full border-2 border-border rounded-2xl bg-bg shadow-sm transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20 ${(!isEnabled || isThinking || !geminiApiKey) ? 'opacity-60 grayscale-[30%]' : ''}`}>
          <div className="relative w-full overflow-hidden flex flex-col justify-end">
            <div 
              ref={backdropRef}
              className="absolute inset-0 w-full h-full p-3 text-sm pointer-events-none whitespace-pre-wrap break-words overflow-y-auto font-sans text-text"
              style={{ maxHeight: '120px' }}
              aria-hidden="true"
            >
              {!userInput ? <span className="text-gray-400">{placeholder}</span> : renderHighlights()}
            </div>
            <textarea
              ref={textareaRef}
              rows={1}
              value={userInput}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
              onScroll={(e) => { if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop; }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
              placeholder={placeholder}
              disabled={!isEnabled || isThinking || !geminiApiKey}
              className="w-full p-3 text-sm bg-transparent resize-none overflow-y-auto focus:outline-none z-10 font-sans placeholder-transparent"
              style={{ maxHeight: '120px', color: 'inherit', WebkitTextFillColor: 'transparent', caretColor: 'currentColor' }}
              spellCheck="false"
            />
          </div>
          <div className="pr-1.5 pb-1.5 shrink-0 flex items-center justify-center">
            <button type="submit" disabled={!isEnabled || isThinking || !userInput.trim() || !geminiApiKey} className="w-8 h-8 bg-accent text-white rounded-lg flex items-center justify-center disabled:bg-gray-400 disabled:scale-95 transition-all duration-200 hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg focus:ring-accent cursor-pointer disabled:cursor-not-allowed">
              <Icon name="ArrowUp" size={18} />
            </button>
          </div>
        </div>
      </form>
      <div className="text-xs text-center text-gray-500 pb-2 px-4 opacity-80">
        {t('aiDisclaimer') !== 'aiDisclaimer' ? t('aiDisclaimer') : 'AI answers might contain incorrect information. Please verify important details.'}
      </div>
    </div>
  );
};