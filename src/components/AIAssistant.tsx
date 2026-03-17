import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { callGeminiAPI } from '../services/GeminiService';
import type { KeyData, GeminiResponse, GeminiFeatureMatch, Entity, StateScore, NumericScore, RawChatMessage } from '../types';
import { marked } from 'marked';
import Spot from './Spot';

interface AIAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  keyData: KeyData | null;
  onEntityClick: (id: string) => void;
  t: (key: string) => string;
  geminiApiKey: string;
  chatHistory: RawChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<RawChatMessage[]>>;
}

// Rendered message structure
interface ChatMessage {
  sender: 'user' | 'ai';
  content: string;
  data?: GeminiResponse;
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


export const AIAssistant: React.FC<AIAssistantProps> = ({ isVisible, onClose, keyData, onEntityClick, t, geminiApiKey, chatHistory: rawChatHistory, setChatHistory: setRawChatHistory }) => {
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consolidatedDescription = useRef("");
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      return { sender: 'ai', content, data: msg.data };
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

  const sendMessage = async () => {
    if (!userInput.trim() || isThinking || !keyData) return;

    const userMessage: RawChatMessage = { sender: 'user', content: userInput };
    setRawChatHistory(prev => [...prev, userMessage]);
    setUserInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset height
    setIsThinking(true);
    setError(null);

    // Pre-search the user input for any mentioned entity names to provide only relevant profiles
    const lowerInput = userInput.toLowerCase();
    const relevantEntityProfiles = Array.from(keyData.entityProfiles.values())
      .filter(ep => lowerInput.includes(ep.name.toLowerCase()))
      .map(ep => ({
        name: ep.name,
        characteristics: ep.characteristics.map(c => `${c.parent ? c.parent + ': ' : ''}${c.text}`)
      }));

    // Pre-search the feature list using keyword matching to reduce payload size
    const fullSearchContext = (consolidatedDescription.current + " " + userInput).toLowerCase();
    const relevantFeatures = keyData.featureListForAI.filter(f => {
      const words = f.description.toLowerCase().split(/[\s:\-,()]+/);
      return words.some(word => word.length > 3 && fullSearchContext.includes(word));
    });
    const featuresToSend = relevantFeatures.length > 0 ? relevantFeatures : keyData.featureListForAI;

    const prompt = `You are an expert taxonomist assisting a user with a Lucid identification key.

**Key Metadata:**
- Title: ${keyData.keyTitle}
- Authors: ${keyData.keyAuthors}
- Description: ${keyData.keyDescription}

**Instructions:**
1. Determine if the user is describing a specimen for identification OR asking an informational question about the key, its features, or its entities.
2. **If Identifying a Specimen:**
   - Read the "Current Description" and the "New User Message". Synthesize them into an "updated_description" (e.g. adding new traits, or replacing corrected ones).
   - Map the traits based ONLY on the "updated_description" to the provided "Feature List". Populate "features_used".
   - Leave "answer" empty.
3. **If Asking a Question:**
   - Provide a helpful, conversational response based STRICTLY on the Key Metadata, Feature List, or Entity Profiles in the "answer" field. Do not invent or hallucinate information outside of the provided data. If the answer is not in the data, state that you don't know. Use Markdown to format your response (e.g., **bold**, *italics*, bullet points) for readability.
   - Set "updated_description" to exactly match the "Current Description".
   - Leave "features_used" as an empty array.
4. **Language:** Always formulate your conversational "answer" and the "updated_description" in the same language the user used in the "New User Message".
5. **JSON Output:** Respond ONLY with a single JSON object with this structure:
    - \`updated_description\`: (string) The running description of the entity.
    - \`features_used\`: (array of objects) With \`id\`, \`description\`, and optionally \`value\`.
    - \`answer\`: (string) Your conversational answer to a question (leave empty if identifying).

**Data:**

**Current Description:**
"${consolidatedDescription.current}"

**New User Message:**
"${userInput}"

**Feature List (id, type, description):**
${JSON.stringify(featuresToSend)}

**Entity Profiles (name, characteristics):**
${relevantEntityProfiles.length > 0 ? JSON.stringify(relevantEntityProfiles) : `No specific entities cited. Available entities in this key: ${Array.from(keyData.allEntities.values()).map(e => e.name).join(', ')}`}`;

    try {
      const response = await callGeminiAPI(prompt, 'gemini-flash-latest', geminiApiKey);

      // Stop "thinking" indicator
      setIsThinking(false);

      // Delay showing the response to make it feel less abrupt
      setTimeout(() => {
        consolidatedDescription.current = response.updated_description;
        const aiMessage: RawChatMessage = { sender: 'ai', aiType: 'response', data: response };
        setRawChatHistory(prev => [...prev, aiMessage]);
      }, 500);
    } catch (err: any) {
      const errorMessage = err.message || t('aiError');
      setError(errorMessage);
      setRawChatHistory(prev => [...prev, { sender: 'ai', aiType: 'error', errorText: errorMessage }]);
      setIsThinking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const isEnabled = !!keyData;
  let placeholder = t('aiWaiting');
  if (!geminiApiKey) placeholder = t('aiNeedsKey');
  else if (!keyData) placeholder = t('aiNeedKey');
  else placeholder = t('aiDescribe');


  return (
    <div className={`panel flex flex-col h-full w-full bg-panel-bg border-l border-border shadow-lg overflow-hidden`} >
      {rawChatHistory.length === 0 || !keyData ? (
        // Unified Welcome Screen when chat is empty
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 animate-fade-in p-4 relative">
          <div className="absolute top-3 right-3">
            <button onClick={handleClose} title={t('closePanel')} className="p-1 rounded-md hover:bg-hover-bg cursor-pointer"><Icon name="PanelRightClose" /></button>
          </div>
          <div className="flex flex-col items-center">
            <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="body" className="w-12 mb-4 text-accent" />
            <h3 className="text-xl font-semibold mb-2 text-accent">{t('assistant')}</h3>
            <p className="max-w-xs text-sm">{keyData ? t('aiReady') : t('aiNeedKey')}</p>
          </div>
        </div>
      ) : (
        // Standard chat view
        <>
          <div className="panel-header flex items-center justify-between p-3 border-b border-border bg-header-bg shrink-0">
            <button onClick={handleClearHistory} title={t('clearHistory')} className="p-1 rounded hover:bg-hover-bg cursor-pointer"><Icon name="Trash2" /></button>
            <div className="panel-title font-semibold flex items-center gap-2 text-md text-accent text-lg">
              <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="head" className="w-7" />
              {t('assistant')}
            </div>
            <button onClick={handleClose} title={t('closePanel')} className="p-1 rounded hover:bg-hover-bg cursor-pointer"><Icon name="PanelRightClose" /></button>
          </div>
          <div ref={chatHistoryRef} onClick={handleEntityClick} className="panel-content grow p-4 overflow-y-auto space-y-4">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`chat-message flex animate-fade-in-up duration-300 ease-out ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`msg-content max-w-[90%] p-3 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-accent text-white rounded-br-lg' : 'bg-header-bg rounded-bl-lg'}`}>
                  <div className="markdown-body text-base [&>p]:mb-2 [&>p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-2 [&_strong]:font-semibold [&_em]:italic [&_a]:underline [&_h1]:font-bold [&_h1]:text-lg [&_h2]:font-bold [&_h3]:font-semibold break-words" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }} />
                  {msg.data && msg.data.features_used.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/70">
                      <h4 className="text-sm font-semibold mb-1 opacity-80">{t('aiFeaturesConsidered')}</h4>
                      <ul className="list-disc list-inside text-sm space-y-1 opacity-90">
                        {msg.data.features_used.map(f => {
                          const feature = keyData!.allFeatures.get(f.id);
                          const featureName = feature ? (feature.parentName ? `${feature.parentName}: ${feature.name}` : feature.name) : f.description;
                          return <li key={f.id}>{featureName}</li>;
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
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
      <form onSubmit={handleSubmit} className="p-2 relative">
        <textarea
          ref={textareaRef}
          rows={1}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
          placeholder={placeholder}
          disabled={!isEnabled || isThinking || !geminiApiKey}
          className="w-full p-3 pr-12 border border-border rounded-xl bg-border disabled:opacity-50 resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow"
          style={{ maxHeight: '120px' }}
        />
        <button type="submit" disabled={!isEnabled || isThinking || !userInput.trim() || !geminiApiKey} className="absolute right-3 bottom-5 w-9 h-9 bg-accent text-white rounded-full flex items-center justify-center disabled:bg-gray-400 disabled:scale-95 transition-all duration-200 hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel-bg focus:ring-accent cursor-pointer disabled:cursor-not-allowed">
          <Icon name="ArrowUp" />
        </button>
      </form>
      <div className="text-xs text-center text-gray-500 pb-2 px-4 opacity-80">
        {t('aiDisclaimer') !== 'aiDisclaimer' ? t('aiDisclaimer') : 'AI answers might contain incorrect information. Please verify important details.'}
      </div>
    </div>
  );
};