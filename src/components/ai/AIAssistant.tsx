import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon, Spot, Markdown } from '../common';
import { callGeminiAPI } from '../../services';
import type { KeyData, GeminiFeatureMatch, RawChatMessage, AiMessageVersion, DraftKeyData, ChatMessage } from '../../types';
import { ConfirmModal } from '../modals';
import { processImage } from '../../utils/imageUtils';
import { findMatchingEntities } from '../../utils/aiUtils';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInputForm } from './ChatInputForm';

export interface AIAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  keyData: KeyData | null;
  onEntityClick: (id: string) => void;
  onImageClick?: (url: string) => void;
  t: (key: string) => string;
  lang: string;
  geminiApiKey: string;
  chatHistory: RawChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<RawChatMessage[]>>;
  appMode: 'identify' | 'build';
  getCurrentDraft?: () => any;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ isVisible, onClose, keyData, onEntityClick, onImageClick, t, lang, geminiApiKey, chatHistory: rawChatHistory, setChatHistory: setRawChatHistory, appMode, getCurrentDraft }) => {
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consolidatedDescription = useRef("");
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(true);

  const [selectedImage, setSelectedImage] = useState<{ file: File, base64: string, mimeType: string, url: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  // Restore consolidated description when switching modes or loading history
  useEffect(() => {
    const lastValidAiMessage = rawChatHistory.slice().reverse().find(m => m.sender === 'ai' && m.data);
    if (lastValidAiMessage?.data?.updated_description) {
      consolidatedDescription.current = lastValidAiMessage.data.updated_description;
    } else {
      consolidatedDescription.current = "";
    }
  }, [rawChatHistory, appMode]);

  // Clears the current mode's chat history and revokes any active image blob URLs
  const handleClearHistory = () => {
    rawChatHistory.forEach(msg => {
      if ((msg as any).imageUrl && (msg as any).imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL((msg as any).imageUrl);
      }
    });
    setRawChatHistory([]);
    consolidatedDescription.current = "";
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.url);
      setSelectedImage(null);
    }
  };

  const processAndSetImage = async (file: File) => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.url);
    }
    const processed = await processImage(file);
    setSelectedImage({ file, ...processed });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEnabled || isThinking || !geminiApiKey) return;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (!isEnabled || isThinking || !geminiApiKey) return;

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    processAndSetImage(file);
  };

  // Derive translated chat history from raw data.
  // This memo re-runs when language (t) or data (rawChatHistory) changes.
  const chatHistory: ChatMessage[] = useMemo(() => {
    if (appMode === 'identify' && !keyData) return [];
    return rawChatHistory.map((msg, index, arr) => {
      if (msg.sender === 'user') {
        return { sender: 'user', content: msg.content || '', data: undefined, imageUrl: (msg as any).imageUrl };
      }

      let content = '';
      switch (msg.aiType) {
        case 'ready':
          content = appMode === 'build' ? t('aiBuildReady' as any) : t('aiReady');
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
          } else if (appMode === 'build' && (msg.data?.suggested_features?.length || msg.data?.suggested_entities?.length)) {
            content = '';
          } else {
            const features = msg.data?.features_used || [];
            if (features.length > 0) {
              const matchingEntities = findMatchingEntities(features, keyData);
              const count = matchingEntities.length;
              const matchesText = matchingEntities
                .map(e => `<span class="clickable-entity text-accent font-semibold cursor-pointer hover:underline" data-id="${e.id}">${e.name}</span>`)
                .join(', ');

              let baseText = '';
              if (count === 1) {
                baseText = t('aiSingleMatch');
              } else if (count > 1) {
                baseText = t('aiMultipleMatches').replace('{count}', String(count));
              } else {
                baseText = t('aiNoMatch');
              }

              const prevMsg = index > 0 ? arr[index - 1] : null;
              const hasImage = prevMsg?.sender === 'user' && !!(prevMsg as any).imageUrl;
              const hasText = prevMsg?.sender === 'user' && !!prevMsg.content?.trim();

              if (hasImage) {
                baseText = baseText
                  .replace('your description', hasText ? 'the image and your description' : 'the image')
                  .replace('sua descrição', hasText ? 'na imagem e na sua descrição' : 'na imagem')
                  .replace('tu descripción', hasText ? 'en la imagen y tu descripción' : 'en la imagen');
              }

              content = count > 0 ? `${baseText} ${matchesText}.` : baseText;
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
        draftSnapshot: msg.draftSnapshot,
        versions: msg.versions,
        currentVersionIndex: msg.currentVersionIndex
      };
    });
  }, [rawChatHistory, t, keyData, appMode]);

  const featuresToSend = useMemo(() => {
    if (!keyData) return [];
    const featureNodeMap = new Map<string, any>();
    const traverse = (nodes: any[]) => {
      for (const n of nodes) {
        featureNodeMap.set(n.id, n);
        if (n.children) traverse(n.children);
      }
    };
    traverse(keyData.featureTree);

    return keyData.featureListForAI.map(f => {
      const node = featureNodeMap.get(f.id);
      if (node && node.children && node.children.length > 0 && node.children[0].isState) {
        return { ...f, states: node.children.map((c: any) => ({ id: c.id, name: c.name })) };
      }
      return f;
    });
  }, [keyData]);

  useEffect(() => {
    if (shouldScrollToBottom.current) {
      chatHistoryRef.current?.scrollTo(0, chatHistoryRef.current.scrollHeight);
    }
    shouldScrollToBottom.current = true;
  }, [chatHistory]);

  const handleEntityClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const clickable = target.closest('.clickable-entity');
    if (clickable && clickable.getAttribute('data-id')) {
      onEntityClick(clickable.getAttribute('data-id')!);
    }
  }

  const sendMessage = async (overrideText?: string, overrideHistory?: RawChatMessage[], regenerateAiIndex?: number) => {
    const text = overrideText !== undefined ? overrideText : userInput;
    if ((!text.trim() && !selectedImage) || isThinking || (appMode === 'identify' && !keyData)) return;

    let currentHistory = overrideHistory || rawChatHistory;
    const currentImage = selectedImage;

    if (overrideText === undefined) {
      const userMessage: RawChatMessage = { sender: 'user', content: text, ...(currentImage ? { imageUrl: currentImage.url } : {}) } as any;
      currentHistory = [...currentHistory, userMessage];
      setRawChatHistory(currentHistory);
      setUserInput('');
      setSelectedImage(null);
    }

    setIsThinking(true);
    setError(null);

    // Pre-search the user input for any mentioned entity names to provide only relevant profiles
    const lowerInput = text.toLowerCase();

    // Find entities and features referenced in the most recent AI response to maintain conversational context
    const lastAiMessage = currentHistory.slice().reverse().find(m => m.sender === 'ai' && m.data);
    const previousEntityNames = (lastAiMessage?.data?.entities_used || []).map(e => e.name.toLowerCase());
    const previousFeaturesUsed = lastAiMessage?.data?.features_used || [];

    // Compute the entities that are currently matching based on the previously mapped features
    const matchingEntities = keyData ? findMatchingEntities(previousFeaturesUsed as GeminiFeatureMatch[], keyData) : [];
    const matchingEntityIds = matchingEntities.map(e => e.id);
    const isSmallMatchSet = matchingEntities.length > 0 && matchingEntities.length <= 10;

    const relevantEntityProfiles = keyData ? Array.from(keyData.entityProfiles.entries())
      .filter(([id, ep]) =>
        lowerInput.includes(ep.name.toLowerCase()) ||
        previousEntityNames.includes(ep.name.toLowerCase()) ||
        (isSmallMatchSet && matchingEntityIds.includes(id))
      )
      .map(([id, ep]) => ({
        name: ep.name,
        characteristics: ep.characteristics.map(c => `${c.parent ? c.parent + ': ' : ''}${c.text}`)
      })) : [];

    const languageNames: Record<string, string> = {
      'en': 'English',
      'pt-br': 'Portuguese (Brazil)',
      'pt-pt': 'Portuguese (Portugal)',
      'es': 'Spanish',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'fr': 'French',
      'de': 'German',
      'la': 'Latin',
      'it': 'Italian',
      'el': 'Greek',
      'hi': 'Hindi',
      'ar': 'Arabic',
      'he': 'Hebrew'
    };
    const targetLanguage = languageNames[lang] || 'English';

    const draft = getCurrentDraft?.();
    const compactFeatures = draft?.features.map((f: any) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      base_unit: f.base_unit,
      unit_prefix: f.unit_prefix,
      states: f.states?.map((s: any) => ({ id: s.id, name: s.name, values: s.values?.map((v: any) => ({ id: v.id, name: v.name })) }))
    })) || [];
    const compactEntities = draft?.entities.map((e: any) => ({ id: e.id, name: e.name })) || [];

    const systemInstruction = appMode === 'identify' ? `You are an expert taxonomist assisting a user with a Lucid identification key.

**Key Metadata:**
- Title: ${keyData?.keyTitle}
- Authors: ${keyData?.keyAuthors}
- Description: ${keyData?.keyDescription}

**Instructions:**
1. Determine if the user is describing a specimen for identification OR asking an informational question. Treat all inputs as "Identifying a Specimen" UNLESS the user is explicitly asking a direct question.
2. **If Identifying a Specimen:**
   - Read the "Current Description" and "New User Message". Synthesize them into an "updated_description". ACCUMULATE traits (e.g., if the user adds a new location or feature, keep the previous ones too). Only replace traits if the user corrects them, and completely clear previous traits ONLY if the user explicitly wants to start over.
   - Map the traits based ONLY on the "updated_description" (which now includes your visual analysis) to the provided "Feature List". Semantically match user descriptions to the most appropriate feature states. Populate "features_used" with ALL currently active features. DO NOT drop previous features unless corrected/started over.
   - Try your best to identify the exact entities based on the description and images, and include your best matches from the Entity Profiles in "entities_used".
   - **CRITICAL:** When identifying, you MUST leave "answer" as an empty string (""). You MUST leave "suggested_features" and "suggested_entities" as empty arrays ([]). Do NOT provide conversational text. The system handles the interaction.
3. **If Asking a Question:**
   - Provide a helpful, professional, and concise response based STRICTLY on the Key Metadata, Feature List, or Entity Profiles in the "answer" field.
   - **Summarize Entity Details:** When asked about an entity, provide a brief, high-level summary of its most distinctive traits. Do NOT list every single characteristic unless the user explicitly asks for all details.
   - **Structure:** Start with a direct answer, followed by supporting details using bullet points if applicable.
   - **Constraints:** Do not invent or hallucinate information outside of the provided data. Only answer questions related to taxonomy, specimen identification, or the provided key data. If the answer is not in the data or the question is off-topic, politely state that you cannot answer it based on the available information. Use Markdown to format your response.
   - Set "updated_description" to exactly match the "Current Description".
   - Populate "features_used" and "entities_used" with any features or entities you explicitly referenced to answer the question, or that are still the main subject of the ongoing conversation. Carry over relevant "features_used" and "entities_used" from your previous answers unless the user's new message implies they should be discarded or changes the subject.
4. **Language:** Always formulate your conversational "answer" and the "updated_description" in ${targetLanguage}.
5. **JSON Output:** Respond ONLY with a single JSON object with this structure:
    - \`updated_description\`: (string) The running description of the entity.
    - \`features_used\`: (array of objects) With \`id\`, \`description\`, and optionally \`value\`. For categorical features, ALWAYS use the specific state's \`id\` instead of the parent feature's \`id\`.
    - \`entities_used\`: (array of objects) With \`id\` and \`name\` of entities explicitly mentioned.
    - \`answer\`: (string) Your conversational answer to a question (MUST be empty if identifying a specimen).
    - \`suggested_features\`: (array) ALWAYS empty [] in this mode.
    - \`suggested_entities\`: (array) ALWAYS empty [] in this mode.
` : `You are an expert taxonomist assisting a user in building an identification key from scratch.

**Instructions:**
1. The user will ask for suggestions for taxonomic features or entities, or describe a domain.
2. Provide helpful suggestions using the "suggested_features" and "suggested_entities" arrays.
3. For features, provide a "name", "description", "type" ("state" or "numeric"). If "state", provide a "states" array with "name" and "description" for each categorical state.
4. For entities, provide a "name", "description", and optionally "scores" mapping the entity to features.
5. In "scores", use "feature_name", "state_name" (if categorical), and "score_value" (e.g. "Common", "Rare", "Uncertain" for states, or a numeric range like "10-20" for numeric features).
6. Respond with a helpful conversational answer in the "answer" field explaining your suggestions.
7. Leave "updated_description", "features_used", and "entities_used" empty.
8. **Language:** Always formulate your "answer", names, descriptions, and states in ${targetLanguage}.
9. **JSON Output:** Respond ONLY with a single JSON object matching the required schema.
10. **Context (Current Draft):**
Features: ${JSON.stringify(compactFeatures)}
Entities: ${JSON.stringify(compactEntities)}
11. **Suggesting vs Editing:**
- To suggest a NEW item, omit the "id" field in your JSON.
- To EDIT an existing item (e.g. to add descriptions, change names, or add states/scores), include its exact "id" from the Context. When editing a categorical feature, include the "id" of any existing states you want to preserve or modify.
- To REMOVE an item, state, or state value, include its "id" and set "action" to "delete".
- To modify a state's score types (values), include the "values" array in the state. By default, states have Common, Rare, Uncertain, etc. You can provide a new array of values to override them, or use "action": "delete" on specific value objects.
- To CLEAR ALL SCORES from an entity, you MUST set "clear_scores": true (Example: {"id": "ent1", "clear_scores": true}). Do NOT delete scores one by one.
- To remove a single specific score, provide it in the "scores" array with "action": "delete".
- For numeric features, you can optionally include "base_unit" (e.g., metre, square metre, cubic metre, litre, degrees celcius, degrees planar, none) and "unit_prefix" (e.g., kilo, hecto, deca, deci, centi, milli, micro, none). To remove them, set to "none".`;

    const prompt = appMode === 'identify' ? `**Data:**

**Current Description:**
"${consolidatedDescription.current}"

**New User Message:**
"${[text, currentImage ? '[Image Attached]' : ''].filter(Boolean).join(' ')}"

**Feature List (id, type, description, states?):**
${JSON.stringify(featuresToSend)}

**Currently Matching Entities:**
${matchingEntities.length > 0 ? (matchingEntities.length <= 100 ? matchingEntities.map(e => e.name).join(', ') : `${matchingEntities.length} matches`) : 'None'}

**Relevant Entity Profiles (name, characteristics):**
${relevantEntityProfiles.length > 0 ? JSON.stringify(relevantEntityProfiles) : `No specific profiles loaded. Available entities in this key: ${keyData ? Array.from(keyData.allEntities.values()).map((e: any) => e.name).join(', ') : ''}`}` : `**User Request:**
"${[text, currentImage ? '[Image Attached]' : ''].filter(Boolean).join(' ')}"`;

    // Format previous chat history for the API to provide multi-turn context.
    // We exclude the very last message (the current user prompt) to prevent duplicate roles in the API request.
    const historyPayload = currentHistory.slice(0, -1)
      .filter(msg => msg.content || msg.data || (msg as any).imageUrl) // Filter out pure error or loading states
      .map(msg => ({
        role: (msg.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{
          text: msg.sender === 'user'
            ? ([msg.content, (msg as any).imageUrl ? '[Image Attached]' : ''].filter(Boolean).join(' ') || ' ')
            : (JSON.stringify(msg.data) || '{}') // Pass the AI's previous JSON responses back to it
        }]
      }));

    const imagePayload = currentImage ? { mimeType: currentImage.mimeType, data: currentImage.base64 } : undefined;
    const model = currentImage ? 'gemini-flash-latest' : 'gemini-3.1-flash-lite-preview';

    console.log("=== AI Request Debug ===");
    console.log("System Instruction:", systemInstruction);
    console.log("History Payload:", JSON.stringify(historyPayload, null, 2));
    console.log("Prompt:", prompt);

    try {
      let response;
      try {
        response = await callGeminiAPI(prompt, model, geminiApiKey, systemInstruction, historyPayload, imagePayload);
      } catch (err) {
        try {
          if (model !== 'gemini-3.1-flash-lite-preview') {
            response = await callGeminiAPI(prompt, 'gemini-3.1-flash-lite-preview', geminiApiKey, systemInstruction, historyPayload, imagePayload);
          } else {
            throw err;
          }
        } catch (fallbackErr) {
          try {
            response = await callGeminiAPI(prompt, 'gemini-2.5-flash-lite', geminiApiKey, systemInstruction, historyPayload, imagePayload);
          } catch (secondFallbackErr) {
            response = await callGeminiAPI(prompt, 'gemini-2.5-flash', geminiApiKey, systemInstruction, historyPayload, imagePayload);
          }
        }
      }

      console.log("=== AI Response Debug ===");
      console.log("Response:", JSON.stringify(response, null, 2));

      // Stop "thinking" indicator
      setIsThinking(false);

      // Delay showing the response to make it feel less abrupt
      setTimeout(() => {
        consolidatedDescription.current = response.updated_description;
        const currentSnapshot = getCurrentDraft?.();
        if (regenerateAiIndex !== undefined && regenerateAiIndex !== -1) {
          setRawChatHistory(prev => {
            const newHistory = [...prev];
            const targetMsg = newHistory[regenerateAiIndex];
            const newVersion: AiMessageVersion = { aiType: 'response', data: response, draftSnapshot: currentSnapshot };
            const versions = targetMsg.versions ? [...targetMsg.versions] : [{ aiType: targetMsg.aiType!, data: targetMsg.data, errorText: targetMsg.errorText, draftSnapshot: targetMsg.draftSnapshot }];
            versions.push(newVersion);
            newHistory[regenerateAiIndex] = {
              ...targetMsg,
              aiType: 'response',
              data: response,
              draftSnapshot: currentSnapshot,
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
            draftSnapshot: currentSnapshot,
            versions: [{ aiType: 'response', data: response, draftSnapshot: currentSnapshot }],
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
    if (lastUserMsgIndex === -1 || lastAiMsgIndex === -1 || isThinking || (appMode === 'identify' && !keyData)) return;

    const lastUserMsg = rawChatHistory[lastUserMsgIndex];
    const historyForPrompt = rawChatHistory.slice(0, lastUserMsgIndex + 1);

    const lastValidAiMessage = historyForPrompt.slice().reverse().find(m => m.sender === 'ai' && m.data);
    consolidatedDescription.current = lastValidAiMessage?.data?.updated_description || "";

    sendMessage(lastUserMsg.content, historyForPrompt, lastAiMsgIndex);
  };

  const handleEditSubmit = (index: number, newContent: string) => {
    if (isThinking || (appMode === 'identify' && !keyData)) return;

    const newHistory = rawChatHistory.slice(0, index); // exclude the message itself

    const lastAiMessage = newHistory.slice().reverse().find(m => m.sender === 'ai' && m.data);
    consolidatedDescription.current = lastAiMessage?.data?.updated_description || "";

    const updatedUserMessage: RawChatMessage = { sender: 'user', content: newContent };
    const historyForPrompt = [...newHistory, updatedUserMessage];

    setRawChatHistory(historyForPrompt);
    sendMessage(newContent, historyForPrompt);
  };

  const handleVersionChange = (index: number, newVersionIndex: number) => {
    shouldScrollToBottom.current = false;
    setRawChatHistory(prev => {
      const newHistory = [...prev];
      const msg = newHistory[index];
      if (msg.versions && msg.versions[newVersionIndex]) {
        const version = msg.versions[newVersionIndex];
        newHistory[index] = {
          ...msg,
          aiType: version.aiType,
          data: version.data,
          draftSnapshot: version.draftSnapshot,
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

  const handleClose = () => {
    onClose();
  };

  const isEnabled = appMode === 'build' || !!keyData;


  return (
    <div
      className={`panel flex flex-col h-full w-full bg-panel-bg/90 border border-white/20 dark:border-white/10 rounded-2xl md:rounded-3xl transition-all duration-300 overflow-hidden relative ${isVisible ? 'shadow-lg opacity-100 backdrop-blur-xl' : 'shadow-none opacity-0 pointer-events-none'}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-bg/80 backdrop-blur-sm border-4 border-dashed border-accent flex flex-col items-center justify-center pointer-events-none">
          <Icon name="Image" size={48} className="mb-4 animate-bounce text-accent" />
          <h3 className="text-xl font-bold text-accent">{t('dropImageHere')}</h3>
        </div>
      )}

      <div className="panel-header flex items-center justify-between p-3.5 border-b border-black/5 dark:border-white/5 bg-header-bg/85 backdrop-blur-md shadow-sm shrink-0 z-10">
        <button onClick={() => setIsConfirmClearOpen(true)} disabled={rawChatHistory.length === 0} title={t('clearHistory')} className="p-1.5 rounded-full hover:bg-hover-bg cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Icon name="Trash2" size={18} /></button>
        <div className="panel-title font-bold flex items-center gap-2 text-accent text-lg tracking-tight">
          <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="head" className="w-6 h-6" />
          {t('assistant')}
        </div>
        <button onClick={handleClose} title={t('closePanel')} className="p-1.5 rounded-full hover:bg-hover-bg cursor-pointer transition-colors"><Icon name="PanelRightClose" size={20} /></button>
      </div>

      {rawChatHistory.length === 0 || !isEnabled ? (
        // Unified Welcome Screen when chat is empty
        <div className="flex flex-col items-center justify-center h-full text-center text-text animate-fade-in p-6">
          <div className="flex flex-col items-center max-w-sm">
            <Spot primaryColor="currentColor" secondaryColor="#f8fafb" mode="body" className="w-14 mb-5 text-accent drop-shadow-md" />
            <h3 className="text-3xl font-bold mb-3 tracking-tight  text-accent">{t('assistant')}</h3>
            <p className="text-base opacity-70 leading-relaxed">{isEnabled ? (appMode === 'build' ? t('aiBuildReady' as any) : t('aiReady')) : t('aiNeedKey')}</p>
          </div>
        </div>
      ) : (
        // Standard chat view
        <div ref={chatHistoryRef} onClick={handleEntityClick} className="panel-content grow p-4 overflow-y-auto space-y-5">
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
                  onImageClick={onImageClick}
                  appMode={appMode}
                />
              );
            });
          })()}
          {isThinking && chatHistory.length > 0 && chatHistory[chatHistory.length - 1].sender === 'user' && (
            <div className="chat-message flex animate-fade-in-up duration-300 ease-out justify-start mb-2">
              <div className="msg-content w-3/4 p-4 rounded-3xl shadow-sm bg-header-bg/90 backdrop-blur-md rounded-bl-sm border border-white/20 dark:border-white/10">
                <div className="flex items-center gap-2 mb-3 opacity-70">
                  <Icon name="LoaderCircle" className="animate-spin w-4 h-4 text-accent" />
                  <span className="text-xs font-medium uppercase tracking-wider text-accent">{t('aiAnalyzing')}</span>
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
      )}
      <ChatInputForm
        userInput={userInput}
        setUserInput={setUserInput}
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
        processAndSetImage={processAndSetImage}
        onSubmit={() => sendMessage()}
        t={t}
        isEnabled={isEnabled}
        isThinking={isThinking}
        geminiApiKey={geminiApiKey}
        appMode={appMode}
        keyData={keyData}
      />
      <div className="text-[11px] text-center text-gray-500 pb-3 px-4 opacity-70">
        {t('aiDisclaimer')}
      </div>

      <ConfirmModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={handleClearHistory}
        title={t('clearHistory')}
        message={
          <div className="flex items-start gap-3 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            <Icon name="TriangleAlert" size={24} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{t('confirmClearHistory')}</p>
          </div>
        }
        confirmText={t('clearHistory')}
        cancelText={t('cancel')}
        isDestructive={true}
      />
    </div>
  );
};
