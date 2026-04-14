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
  const rawContents = history
    ? [...history, { role: 'user', parts: currentParts }]
    : [{ role: 'user', parts: currentParts }];

  // Collapse adjacent messages of the same role to prevent API 500 errors
  const contents = rawContents.reduce((acc: any[], curr) => {
    if (acc.length > 0 && acc[acc.length - 1].role === curr.role) {
      acc[acc.length - 1].parts.push(...curr.parts);
    } else {
      acc.push({ role: curr.role, parts: [...curr.parts] });
    }
    return acc;
  }, []);

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
            suggested_features: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING },
                  action: { type: Type.STRING, description: "Set to 'delete' to remove this feature" },
                  base_unit: { type: Type.STRING, description: "Base unit for numeric features (e.g. metre, square metre, cubic metre, litre, degrees celcius, degrees planar, none)" },
                  unit_prefix: { type: Type.STRING, description: "Unit prefix for numeric features (e.g. kilo, hecto, deca, deci, centi, milli, micro, none)" },
                  states: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        action: { type: Type.STRING, description: "Set to 'delete' to remove this state" },
                        values: {
                          type: Type.ARRAY,
                          description: "Score types for this state",
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              name: { type: Type.STRING },
                              action: { type: Type.STRING, description: "Set to 'delete' to remove this value" }
                            },
                            required: ['name']
                          }
                        }
                      },
                      required: ['name']
                    }
                  }
                },
                required: ['name', 'type']
              }
            },
            suggested_entities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  action: { type: Type.STRING, description: "Set to 'delete' to remove this entity" },
                  clear_scores: { type: Type.BOOLEAN, description: "CRITICAL: Set to true to completely wipe/clear all scores from this entity." },
                  scores: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        feature_name: { type: Type.STRING },
                        state_name: { type: Type.STRING },
                        score_value: { type: Type.STRING },
                        action: { type: Type.STRING, description: "Set to 'delete' to remove this specific score" }
                      },
                      required: ['feature_name']
                    }
                  }
                },
                required: ['name']
              }
            }
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
