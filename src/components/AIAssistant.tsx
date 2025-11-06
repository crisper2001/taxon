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


export const AIAssistant: React.FC<AIAssistantProps> = ({ isVisible, onClose, keyData, onEntityClick, t, chatHistory: rawChatHistory, setChatHistory: setRawChatHistory }) => {
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consolidatedDescription = useRef("");
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to reset chat when the key file changes.
  const handleClearHistory = () => {
    setRawChatHistory([]);
    consolidatedDescription.current = "";
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

    const prompt = `You are an expert taxonomist assisting a user in identifying an entity using a Lucid identification key. Your task is to maintain a running description of the entity and map it to the key's features.

**Instructions:**
1.  **Update Description:** Read the "Current Description" and the "New User Message". Synthesize them into an "updated_description". Treat the new message as an addition to the current description unless it's a direct correction. For example, if the current description is "Color is red" and the new message is "and it has spots", the updated description should be "Color is red and it has spots". If the new message is "no, the color is blue", the updated description should be "Color is blue".
2.  **Map Features:** Based ONLY on the "updated_description", identify all matching features from the provided "Feature List".
3.  **JSON Output:** Respond ONLY with a single JSON object with the following structure:
    - \`updated_description\`: (string) The new, consolidated description of the entity.
    - \`features_used\`: (array of objects) Each object represents a feature you used, with keys \`id\`, \`description\` (a human-readable summary, e.g., "Color: Red"), and optionally \`value\` for numeric features.

**Data:**

**Current Description:**
"${consolidatedDescription.current}"

**New User Message:**
"${userInput}"

**Feature List (id, type, description):**
${JSON.stringify(keyData.featureListForAI)}`;

    try {
      const response = await callGeminiAPI(prompt, 'gemini-flash-latest');

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
  if (!keyData) placeholder = t('aiNeedKey');
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
                  <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} />
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
              <div className="flex justify-center items-center gap-2 text-gray-500 animate-fade-in duration-300 ease-out">
                <Icon name="LoaderCircle" className="animate-spin text-accent" />
                <span>{t('aiAnalyzing')}</span>
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
          disabled={!isEnabled || isThinking}
          className="w-full p-3 pr-12 border border-border rounded-xl bg-border disabled:opacity-50 resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow"
          style={{ maxHeight: '120px' }}
        />
        <button type="submit" disabled={!isEnabled || isThinking || !userInput.trim()} className="absolute right-3 bottom-5 w-9 h-9 bg-accent text-white rounded-full flex items-center justify-center disabled:bg-gray-400 disabled:scale-95 transition-all duration-200 hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel-bg focus:ring-accent cursor-pointer disabled:cursor-not-allowed">
          <Icon name="ArrowUp" />
        </button>
      </form>
    </div>
  );
};