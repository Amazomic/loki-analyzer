
import { LogEntry, LokiConfig } from '../types';

export const fetchLogs = async (config: LokiConfig): Promise<LogEntry[]> => {
  const { url, token, query, limit } = config;
  
  // Basic normalization of URL
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const endpoint = `${baseUrl}/loki/api/v1/query_range`;
  
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
    direction: 'backward',
  });

  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  if (token) {
    // Commonly Loki uses Basic Auth (Username:Password) where one might be the token
    // For simplicity, we assume the token is a Bearer or the user provides the full Header string
    if (token.includes('Basic') || token.includes('Bearer')) {
        headers['Authorization'] = token;
    } else {
        headers['Authorization'] = `Bearer ${token}`;
    }
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

    // Sort by timestamp descending
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Failed to fetch from Loki:', error);
    throw error;
  }
};
