
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function refineTaskDescription(title: string, currentDescription: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Please refine this task description to be more actionable and professional. 
               Task Title: ${title}
               Current Description: ${currentDescription}
               Keep it under 30 words.`,
  });
  return response.text;
}

export async function suggestDuration(title: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `How many minutes should a task titled "${title}" realistically take? Return ONLY a number representing minutes.`,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  minutes: { type: Type.NUMBER }
              },
              required: ["minutes"]
          }
      }
    });
    try {
        const data = JSON.parse(response.text);
        return data.minutes || 25;
    } catch (e) {
        return 25;
    }
}
