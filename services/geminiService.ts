
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, AnalysisResult } from "../types";

export const analyzeLogsWithAI = async (logs: LogEntry[]): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Берем последние 50 логов для контекста
  const logContent = logs.slice(0, 50).map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.line}`).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Вы — опытный SRE-инженер и эксперт по распределенным системам. 
    Проанализируйте следующие логи из Grafana Loki.
    
    ЗАДАЧА:
    1. Кратко опишите общее состояние системы (Summary).
    2. Выявите повторяющиеся паттерны ошибок или аномалии.
    3. Дайте конкретные технические рекомендации по устранению (Recommendations) с указанием приоритета.
    
    ОТВЕТ ДОЛЖЕН БЫТЬ НА РУССКОМ ЯЗЫКЕ.
    
    ЛОГИ:
    ${logContent}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "Общий итог анализа состояния системы." },
          detectedErrors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "Категория ошибки (например, DB_CONNECTION_ERROR)" },
                description: { type: Type.STRING, description: "Краткое описание проблемы" },
                count: { type: Type.NUMBER, description: "Количество вхождений" }
              },
              required: ["type", "description", "count"]
            }
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Краткое название рекомендации" },
                action: { type: Type.STRING, description: "Конкретное действие, которое нужно предпринять" },
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
  if (!text) throw new Error("AI не вернул данных анализа");
  
  try {
    return JSON.parse(text) as AnalysisResult;
  } catch (e) {
    console.error("Ошибка парсинга ответа AI:", text);
    throw new Error("Некорректный формат ответа от AI сервиса");
  }
};
