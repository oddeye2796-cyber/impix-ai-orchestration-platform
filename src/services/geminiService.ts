import { GoogleGenAI } from "@google/genai";
import { getLocale, t } from '../i18n';
import type { Locale } from '../i18n';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const MODEL = "gemini-3-flash-preview";

/**
 * How the model should write back to the operator. The platform is Japanese
 * first, English second, with Korean kept as the original authoring language.
 */
const RESPONSE_LANGUAGE: Record<Locale, string> = {
  ja: 'Japanese (日本語)',
  en: 'English',
  ko: 'Korean (한국어)',
};

const responseLanguage = (): string => RESPONSE_LANGUAGE[getLocale()];

export const generateRecommendations = async (sensorData: any[]) => {
  try {
    const prompt = `You are the recommendation engine of the IMPIX AI orchestration platform for a smart factory.

Here is the current real-time sensor data from the plant:
${JSON.stringify(sensorData.slice(-5), null, 2)}

Analyse this data and propose 3 AI-recommended actions that improve plant operating
efficiency and prevent incidents. Each proposal must follow this JSON shape:
[
  {
    "agent": "agent name (e.g. Quality Agent, PM Agent, Energy Agent)",
    "action": "action code to run (e.g. adjust_temperature, replace_bearing)",
    "target_equipment": "target equipment name",
    "recommended_value": "recommended set-point or action",
    "level": 1-3 (severity),
    "reasoning": "why this is recommended (detailed)"
  }
]

Write every human-readable field ("target_equipment", "recommended_value",
"reasoning") in ${responseLanguage()}. Keep "agent" and "action" as English
identifiers. Return the JSON data only.`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Recommendations Error:", error);
    return [];
  }
};

export const generateChatResponse = async (prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: `You are the Supervisor AI of the IMPIX AI orchestration platform.
Answer the operator's questions with the expertise of factory automation, quality
management, equipment maintenance and energy optimisation.

Always reply in ${responseLanguage()}, regardless of the language the question was
asked in. Use technical vocabulary where it is warranted, but stay approachable and
explain the terms you introduce.
When asked to analyse data, provide insight based on plausible real-time plant data.`
      }
    });

    return response.text || t('죄송합니다. 답변을 생성할 수 없습니다.');
  } catch (error) {
    console.error("Gemini API Error:", error);
    return t('죄송합니다. 요청을 처리하는 중에 오류가 발생했습니다.');
  }
};
