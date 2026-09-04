/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SensorData } from '../types';
import { getLocale, t } from '../i18n';
import type { Locale } from '../i18n';
import { AiResult, getApiKey, isDemoMode } from './aiConfig';
import { demoChatResponse, demoRecommendations } from './demoResponses';

const MODEL = 'gemini-3-flash-preview';

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

/**
 * The SDK is ~1 MB of the bundle and is only needed once a live call is made,
 * so it is pulled in on demand rather than at startup. Demo-mode visitors —
 * the default on the public deployment — never download it at all.
 */
let clientPromise: Promise<any> | null = null;
let clientKey = '';

async function getClient() {
  const apiKey = getApiKey();
  if (clientPromise && clientKey === apiKey) return clientPromise;
  clientKey = apiKey;
  clientPromise = import('@google/genai').then(({ GoogleGenAI }) => new GoogleGenAI({ apiKey }));
  return clientPromise;
}

/** Turns an unknown throw into copy the operator can act on. */
function describeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/api[_ -]?key|401|403|permission|unauthenticated/i.test(raw)) {
    return t('API 키가 유효하지 않습니다. 설정에서 키를 다시 확인해 주세요.');
  }
  if (/429|quota|rate/i.test(raw)) {
    return t('요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (/network|fetch|failed to fetch|timeout/i.test(raw)) {
    return t('네트워크에 연결할 수 없습니다. 연결 상태를 확인해 주세요.');
  }
  return t('AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.');
}

export async function generateRecommendations(
  sensorData: SensorData[],
): Promise<AiResult<any[]>> {
  if (isDemoMode()) {
    return { status: 'ok', data: demoRecommendations(sensorData), source: 'demo' };
  }

  try {
    const ai = await getClient();
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
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '[]');
    if (!Array.isArray(parsed)) throw new Error('Unexpected response shape');
    return { status: 'ok', data: parsed, source: 'live' };
  } catch (error) {
    console.error('Gemini Recommendations Error:', error);
    return { status: 'error', message: describeError(error) };
  }
}

export async function generateChatResponse(
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  sensorData: SensorData[] = [],
): Promise<AiResult<string>> {
  if (isDemoMode()) {
    return { status: 'ok', data: demoChatResponse(prompt, sensorData), source: 'demo' };
  }

  try {
    const ai = await getClient();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: `You are the Supervisor AI of the IMPIX AI orchestration platform.
Answer the operator's questions with the expertise of factory automation, quality
management, equipment maintenance and energy optimisation.

Always reply in ${responseLanguage()}, regardless of the language the question was
asked in. Use technical vocabulary where it is warranted, but stay approachable and
explain the terms you introduce.
When asked to analyse data, provide insight based on plausible real-time plant data.`,
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error('Empty response');
    return { status: 'ok', data: text, source: 'live' };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return { status: 'error', message: describeError(error) };
  }
}
