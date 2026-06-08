import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateRecommendations = async (sensorData: any[]) => {
  try {
    const prompt = `다음은 현재 공장의 실시간 센서 데이터입니다:
    ${JSON.stringify(sensorData.slice(-5), null, 2)}
    
    이 데이터를 분석하여 공장 운영 효율을 높이고 사고를 예방하기 위한 AI 추천 조치 3가지를 제안해 주세요.
    각 제안은 다음 JSON 형식을 따라야 합니다:
    [
      {
        "agent": "에이전트 이름 (예: Quality Agent, PM Agent, Energy Agent)",
        "action": "수행할 작업 코드 (예: adjust_temperature, replace_bearing)",
        "target_equipment": "대상 설비 이름",
        "recommended_value": "추천 수치 또는 조치 내용",
        "level": 1~3 (중요도),
        "reasoning": "추천 이유 (상세 설명)"
      }
    ]
    JSON 데이터만 반환하세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: `당신은 IMPIX AI 오케스트레이션 플랫폼의 Supervisor AI입니다. 
        사용자의 질문에 대해 공장 자동화, 품질 관리, 설비 보전, 에너지 최적화 관점에서 전문적으로 답변하세요.
        답변은 한국어로 작성하며, 필요시 기술적인 용어를 사용하되 친절하게 설명하세요.
        데이터 분석 요청이 오면 가상의 실시간 데이터를 바탕으로 통찰력을 제공하세요.`
      }
    });

    return response.text || "죄송합니다. 답변을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "죄송합니다. 요청을 처리하는 중에 오류가 발생했습니다.";
  }
};
