import type { GeminiResponse } from '../types';
// FIX: Import `Type` for response schema and align with @google/genai guidelines.
import { GoogleGenAI, Type } from "@google/genai";

// --- Gemini API Service ---

export async function callGeminiAPI(
  prompt: string,
  model: string
): Promise<GeminiResponse> {

  // FIX: Per @google/genai guidelines, API key must be obtained exclusively from `process.env.API_KEY`.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        // FIX: Use responseSchema to ensure structured JSON output as per @google/genai guidelines.
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
    // FIX: With a response schema, the response text is guaranteed to be a clean JSON string,
    // so extracting from a markdown block is no longer necessary.
    return JSON.parse(responseText) as GeminiResponse;
  } catch (error: any) {
    const message = error.response?.data?.error?.message || error.message || "An unknown error occurred.";
    throw new Error(`Gemini API Error: ${message}`);
  }
}
