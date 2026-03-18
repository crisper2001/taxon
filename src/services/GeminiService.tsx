import type { GeminiResponse } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

// --- Gemini API Service ---

export async function callGeminiAPI(
  prompt: string,
  model: string,
  apiKey: string,
  systemInstruction?: string,
  history?: { role: 'user' | 'model', parts: any[] }[],
  image?: { mimeType: string, data: string }
): Promise<GeminiResponse> {

  if (!apiKey) {
    throw new Error("API key is not configured. Please add it in the preferences menu.");
  }
  const ai = new GoogleGenAI({ apiKey });

  // Construct the current user message parts
  const currentParts: any[] = [{ text: prompt }];
  if (image) {
    currentParts.push({
      inlineData: { data: image.data, mimeType: image.mimeType }
    });
  }

  // Combine history (if any) with the current new prompt
  const contents = history 
    ? [...history, { role: 'user', parts: currentParts }]
    : [{ role: 'user', parts: currentParts }];

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updated_description: { type: Type.STRING },
            answer: { type: Type.STRING },
            features_used: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
                required: ['id', 'description'],
              },
            },
            entities_used: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                },
                required: ['id', 'name'],
              },
            },
          },
          required: ['updated_description', 'features_used', 'entities_used'],
        },
      }
    });

    // Extract text manually to bypass the .text getter which triggers the "thoughtSignature" warning
    let responseText = '';
    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      responseText = response.candidates[0].content.parts.map((p: any) => p.text).filter(Boolean).join('');
    }
    if (!responseText) {
      responseText = response.text;
    }

    try {
      return JSON.parse(responseText || '{}') as GeminiResponse;
    } catch (parseError) {
      throw new Error("Failed to parse the AI's response into the expected JSON format. Please try rephrasing your prompt.");
    }
  } catch (error: any) {
    let message = error.response?.data?.error?.message || error.message || "An unknown error occurred.";

    if (error.status === 403 || message.toLowerCase().includes('api key not valid') || message.toLowerCase().includes('forbidden')) {
      message = "Invalid API key. Please check your API key in the preferences.";
    } else if (error.status === 429 || message.toLowerCase().includes('quota') || message.toLowerCase().includes('too many requests') || message.toLowerCase().includes('exhausted')) {
      message = "API quota exceeded. Please try again later or check your billing account.";
    }

    throw new Error(`Gemini API Error: ${message}`);
  }
}
