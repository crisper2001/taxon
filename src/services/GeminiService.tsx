import type { GeminiResponse } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

// --- Gemini API Service ---

export async function callGeminiAPI(
  prompt: string,
  model: string,
  apiKey: string,
): Promise<GeminiResponse> {

  if (!apiKey) {
    throw new Error("API key is not configured. Please add it in the preferences menu.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
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
          },
          required: ['updated_description', 'features_used'],
        },
      }
    });

    const responseText = response.text;
    return JSON.parse(responseText) as GeminiResponse;
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
