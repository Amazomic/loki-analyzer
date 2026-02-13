
export interface LokiConfig {
  url: string;
  token: string;
  query: string;
  limit: number;
  range: string; // Период: 1h, 6h, 24h, 7d и т.д.
}

export interface LogEntry {
  timestamp: string;
  line: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'unknown';
}

export interface AnalysisResult {
  summary: string;
  detectedErrors: DetectedError[];
  recommendations: Recommendation[];
}

export interface DetectedError {
  type: string;
  description: string;
  count: number;
}

export interface Recommendation {
  title: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
}

export enum AppState {
  IDLE = 'IDLE',
  FETCHING = 'FETCHING',
  ANALYZING = 'ANALYZING',
  ERROR = 'ERROR'
}
