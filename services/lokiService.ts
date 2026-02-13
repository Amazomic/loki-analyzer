
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
      signal: AbortSignal.timeout(5000) // 5 second timeout
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
      throw new Error(`Ошибка Loki (${response.status}): ${errorText || response.statusText}`);
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
          if (lowerLine.includes('error') || lowerLine.includes('fatal') || lowerLine.includes('crit') || lowerLine.includes('err')) level = 'error';
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
