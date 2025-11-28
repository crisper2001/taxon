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
    const message = error.response?.data?.error?.message || error.message || "An unknown error occurred.";
    throw new Error(`Gemini API Error: ${message}`);
  }
}
