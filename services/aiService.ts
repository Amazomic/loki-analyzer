
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, AnalysisResult, LokiConfig } from "../types";

export const analyzeLogsWithAI = async (logs: LogEntry[], config: LokiConfig): Promise<AnalysisResult> => {
  const logContent = logs.slice(0, 50).map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.line}`).join('\n');
  const prompt = `Проанализируй эти логи из инстанса Loki. Твоя задача — выявить закономерности, повторяющиеся ошибки и предоставить конкретные шаги по устранению неполадок. 
    
    ВАЖНО: Весь твой ответ (summary, description, title, action) должен быть СТРОГО НА РУССКОМ ЯЗЫКЕ.
    
    ОТВЕТЬ В ФОРМАТЕ JSON:
    {
      "summary": "обзор",
      "detectedErrors": [{"type": "тип", "description": "описание", "count": 1}],
      "recommendations": [{"title": "заголовок", "action": "действие", "priority": "high|medium|low"}]
    }

    ЛОГИ ДЛЯ АНАЛИЗА:
    ${logContent}`;

  if (config.aiProvider === 'gemini') {
    const apiKey = config.aiKey || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    const response = await ai.models.generateContent({
      model: config.aiModel || "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            detectedErrors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  count: { type: Type.NUMBER }
                },
                required: ["type", "description", "count"]
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  action: { type: Type.STRING },
                  priority: { type: Type.STRING }
                },
                required: ["title", "action", "priority"]
              }
            }
          },
          required: ["summary", "detectedErrors", "recommendations"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI вернул пустой анализ");
    return JSON.parse(text) as AnalysisResult;
  } else {
    const endpoint = config.aiProvider === 'openai' 
      ? 'https://api.openai.com/v1/chat/completions' 
      : 'https://openrouter.ai/api/v1/chat/completions';
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.aiKey}`
    };

    if (config.aiProvider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Loki AI Analyzer';
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.aiModel || (config.aiProvider === 'openai' ? 'gpt-4o-mini' : 'google/gemini-2.0-flash-lite:preview'),
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Ошибка API ${config.aiProvider}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    return JSON.parse(content) as AnalysisResult;
  }
};
