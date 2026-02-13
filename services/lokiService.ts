
import { LogEntry, LokiConfig } from '../types';

const getHeaders = (token: string): HeadersInit => {
  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  if (token) {
    if (token.includes('Basic') || token.includes('Bearer')) {
        headers['Authorization'] = token;
    } else {
        headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const testConnection = async (config: LokiConfig): Promise<boolean> => {
  const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  const endpoint = `${baseUrl}/loki/api/v1/labels`;
  
  try {
    const response = await fetch(endpoint, { 
      headers: getHeaders(config.token),
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.error('Loki connectivity test failed:', error);
    return false;
  }
};

export const fetchLogs = async (config: LokiConfig): Promise<LogEntry[]> => {
  const { url, token, query, limit } = config;
  
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const endpoint = `${baseUrl}/loki/api/v1/query_range`;
  
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
    direction: 'backward',
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, { 
      headers: getHeaders(token) 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Loki API Error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const logs: LogEntry[] = [];
    
    if (data.status === 'success' && data.data.result) {
      data.data.result.forEach((stream: any) => {
        stream.values.forEach((val: [string, string]) => {
          const [nanoTs, line] = val;
          const timestamp = new Date(parseInt(nanoTs) / 1000000).toISOString();
          
          let level: LogEntry['level'] = 'unknown';
          let displayLine = line;

          // Попытка распарсить JSON если строка похожа на объект
          if (line.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(line);
              const extractedLevel = (parsed.level || parsed.lvl || parsed.severity || '').toLowerCase();
              displayLine = parsed.message || parsed.msg || line;
              
              if (['error', 'err', 'fatal', 'panic', 'crit'].some(s => extractedLevel.includes(s))) level = 'error';
              else if (extractedLevel.includes('warn')) level = 'warn';
              else if (extractedLevel.includes('debug')) level = 'debug';
              else if (extractedLevel.includes('info')) level = 'info';
            } catch (e) {
              // Игнорируем ошибку парсинга, используем текстовый поиск
            }
          }

          // Если уровень всё еще не определен, ищем по тексту
          if (level === 'unknown') {
            const lowerLine = line.toLowerCase();
            if (['error', 'fatal', 'crit', 'err', 'exception'].some(s => lowerLine.includes(s))) level = 'error';
            else if (lowerLine.includes('warn')) level = 'warn';
            else if (lowerLine.includes('debug')) level = 'debug';
            else if (lowerLine.includes('info')) level = 'info';
          }

          logs.push({ timestamp, line: displayLine, level });
        });
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Failed to fetch from Loki:', error);
    throw error;
  }
};
