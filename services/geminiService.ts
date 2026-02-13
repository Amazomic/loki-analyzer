
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, AnalysisResult } from "../types";

export const analyzeLogsWithAI = async (logs: LogEntry[]): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const logContent = logs.slice(0, 50).map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.line}`).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these logs from a Loki instance. Focus on identifying patterns, recurring errors, and providing specific troubleshooting steps. 
    
    LOGS:
    ${logContent}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "A high-level summary of the logs." },
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
  if (!text) throw new Error("AI returned empty analysis");
  
  return JSON.parse(text) as AnalysisResult;
};
