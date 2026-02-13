
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, AnalysisResult } from "../types";

export const analyzeLogsWithAI = async (logs: LogEntry[]): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const logContent = logs.slice(0, 50).map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.line}`).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Проанализируй эти логи из инстанса Loki. Твоя задача — выявить закономерности, повторяющиеся ошибки и предоставить конкретные шаги по устранению неполадок. 
    
    ВАЖНО: Весь твой ответ (summary, description, title, action) должен быть СТРОГО НА РУССКОМ ЯЗЫКЕ.
    
    ЛОГИ ДЛЯ АНАЛИЗА:
    ${logContent}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "Краткий обзор состояния логов на русском языке." },
          detectedErrors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "Тип ошибки (на русском)." },
                description: { type: Type.STRING, description: "Описание проблемы (на русском)." },
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
                title: { type: Type.STRING, description: "Заголовок рекомендации (на русском)." },
                action: { type: Type.STRING, description: "Конкретное действие для исправления (на русском)." },
                priority: { type: Type.STRING, enum: ["low", "medium", "high"] }
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
};
