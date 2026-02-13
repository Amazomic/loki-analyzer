
import { LogEntry, LokiConfig } from '../types';

/**
 * Проверяет, нужно ли использовать прокси.
 * Если адрес совпадает с тем, что настроен в Docker, мы идем через /loki-proxy,
 * чтобы избежать CORS ошибок в браузере.
 */
const resolveUrl = (inputUrl: string): string => {
  const targetLoki = process.env.LOKI_URL || 'http://192.168.20.96:3100';
  
  // Убираем слеши в конце для сравнения
  const cleanInput = inputUrl.replace(/\/+$/, '');
  const cleanTarget = targetLoki.replace(/\/+$/, '');

  if (cleanInput === cleanTarget || inputUrl === '/loki-proxy') {
    return '/loki-proxy';
  }
  return inputUrl;
};

export const testConnection = async (config: LokiConfig): Promise<boolean> => {
  const url = resolveUrl(config.url);
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const endpoint = `${baseUrl}/loki/api/v1/labels`;
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  if (config.token) {
    headers['Authorization'] = config.token.includes(' ') ? config.token : `Bearer ${config.token}`;
  }

  try {
    const response = await fetch(endpoint, { 
      headers,
      signal: AbortSignal.timeout(5000) 
    });
    return response.ok;
  } catch (error) {
    console.error('Loki connection test failed:', error);
    return false;
  }
};

export const fetchLogs = async (config: LokiConfig): Promise<LogEntry[]> => {
  const url = resolveUrl(config.url);
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const endpoint = `${baseUrl}/loki/api/v1/query_range`;
  
  const params = new URLSearchParams({
    query: config.query,
    limit: config.limit.toString(),
    direction: 'backward',
  });

  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  if (config.token) {
    headers['Authorization'] = config.token.includes(' ') ? config.token : `Bearer ${config.token}`;
  }

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Loki error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const logs: LogEntry[] = [];
    
    if (data.status === 'success' && data.data.result) {
      data.data.result.forEach((stream: any) => {
        stream.values.forEach((val: [string, string]) => {
          const [nanoTs, line] = val;
          const timestamp = new Date(parseInt(nanoTs) / 1000000).toISOString();
          
          let level: LogEntry['level'] = 'unknown';
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('error') || lowerLine.includes('fatal') || lowerLine.includes('crit')) level = 'error';
          else if (lowerLine.includes('warn')) level = 'warn';
          else if (lowerLine.includes('debug')) level = 'debug';
          else if (lowerLine.includes('info')) level = 'info';

          logs.push({ timestamp, line, level });
        });
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Failed to fetch from Loki:', error);
    throw error;
  }
};
