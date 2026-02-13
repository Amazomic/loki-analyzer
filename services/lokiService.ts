
import { LogEntry, LokiConfig } from '../types';

/**
 * Проверяет, нужно ли использовать прокси.
 */
const resolveUrl = (inputUrl: string): string => {
  const targetLoki = process.env.LOKI_URL || 'http://192.168.20.96:3100';
  const cleanInput = inputUrl.replace(/\/+$/, '');
  const cleanTarget = targetLoki.replace(/\/+$/, '');

  if (cleanInput === cleanTarget || inputUrl === '/loki-proxy') {
    return '/loki-proxy';
  }
  return inputUrl;
};

/**
 * Превращает строку периода (1h, 6h) в метку времени начала для Loki (наносекунды)
 */
const getStartTimestamp = (range: string): string => {
  const now = Date.now();
  let ms = 0;
  const match = range.match(/^(\d+)([hmds])$/);
  
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': ms = value * 1000; break;
      case 'm': ms = value * 60 * 1000; break;
      case 'h': ms = value * 60 * 60 * 1000; break;
      case 'd': ms = value * 24 * 60 * 60 * 1000; break;
    }
  } else {
    ms = 6 * 60 * 60 * 1000; // По умолчанию 6 часов
  }
  
  return ((now - ms) * 1000000).toString();
};

export const testConnection = async (config: LokiConfig): Promise<boolean> => {
  const url = resolveUrl(config.url);
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const endpoint = `${baseUrl}/loki/api/v1/labels`;
  
  try {
    const response = await fetch(endpoint, { 
      headers: { 'Accept': 'application/json' },
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
    start: getStartTimestamp(config.range || '6h')
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });
    
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
