
import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Terminal, Activity, AlertCircle, RefreshCw, Database, Sparkles, ShieldCheck, Link, ChevronRight, Info, XCircle, Check, X, Search, ListFilter, Clock, LayoutDashboard, Key, Cpu, RefreshCcw } from 'lucide-react';
import { LokiConfig, LogEntry, AnalysisResult, AppState, AIProvider } from './types';
import { fetchLogs, testConnection } from './services/lokiService';
import { analyzeLogsWithAI, fetchAvailableModels } from './services/aiService';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const defaultLokiUrl = process.env.LOKI_URL || 'http://192.168.20.96:3100';

  const [config, setConfig] = useState<LokiConfig>({
    url: defaultLokiUrl,
    token: '',
    query: '{host="test_web.185",service_name="/akuz_web"}',
    limit: 100,
    range: '6h',
    aiProvider: 'gemini',
    aiKey: '',
    aiModel: 'gemini-3-flash-preview'
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const isSystemAiReady = !!process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY !== '';
  const isUserAiReady = config.aiKey.length > 0;
  const canAnalyze = isSystemAiReady || isUserAiReady || config.aiProvider === 'openrouter';

  useEffect(() => {
    const savedConfig = localStorage.getItem('loki_ai_full_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) { console.error("Config load error"); }
    }
  }, []);

  const loadModels = useCallback(async (provider: AIProvider, key: string) => {
    setIsLoadingModels(true);
    const models = await fetchAvailableModels(provider, key);
    setAvailableModels(models);
    setIsLoadingModels(false);
    
    // Если текущая модель не в списке, выбираем первую доступную
    if (models.length > 0 && !models.find(m => m.id === config.aiModel)) {
      setConfig(prev => ({ ...prev, aiModel: models[0].id }));
    }
  }, [config.aiModel]);

  useEffect(() => {
    if (isSettingsOpen) {
      loadModels(config.aiProvider, config.aiKey);
    }
  }, [isSettingsOpen, config.aiProvider, config.aiKey, loadModels]);

  const saveToStorage = (newConfig: LokiConfig) => {
    const { query, limit, range, ...settings } = newConfig;
    localStorage.setItem('loki_ai_full_config', JSON.stringify(settings));
  };

  const handleApplySettings = async () => {
    setConnectionStatus('testing');
    const isOk = await testConnection(config);
    if (isOk) {
      setConnectionStatus('success');
      saveToStorage(config);
      setTimeout(() => {
        setConnectionStatus('idle');
        setIsSettingsOpen(false);
      }, 1000);
    } else {
      setConnectionStatus('error');
      setTimeout(() => setConnectionStatus('idle'), 3000);
    }
  };

  const handleFetchOnly = async () => {
    try {
      setErrorMessage(null);
      setState(AppState.FETCHING);
      const fetchedLogs = await fetchLogs(config);
      setLogs(fetchedLogs);
      setState(AppState.IDLE);
    } catch (err: any) {
      setState(AppState.ERROR);
      setErrorMessage(err.message || "Ошибка получения логов.");
    }
  };

  const handleAiAnalyze = async () => {
    try {
      setErrorMessage(null);
      let currentLogs = logs;
      
      if (logs.length === 0) {
        setState(AppState.FETCHING);
        currentLogs = await fetchLogs(config);
        setLogs(currentLogs);
      }

      if (currentLogs.length > 0) {
        setState(AppState.ANALYZING);
        const aiResult = await analyzeLogsWithAI(currentLogs, config);
        setAnalysis(aiResult);
        setState(AppState.IDLE);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setState(AppState.IDLE);
        setErrorMessage("Логи не найдены для анализа.");
      }
    } catch (err: any) {
      setState(AppState.ERROR);
      setErrorMessage(err.message || "Ошибка анализа.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 text-sm">
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in" onClick={() => setIsSettingsOpen(false)} />
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 rounded-lg">
                  <Settings size={20} className="text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Настройки системы</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Loki Section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Источник данных (Loki)</h4>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Endpoint URL</label>
                  <div className="relative">
                    <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input
                      type="text"
                      value={config.url}
                      onChange={(e) => setConfig({ ...config, url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl pl-11 pr-4 py-3 focus:outline-none transition-all font-mono text-sm text-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* AI Section */}
              <div className="space-y-4 pt-4 border-t border-slate-800/50">
                <h4 className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Интеллект (AI Provider)</h4>
                
                <div className="grid grid-cols-3 gap-2">
                  {(['gemini', 'openai', 'openrouter'] as AIProvider[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setConfig({...config, aiProvider: p})}
                      className={`py-2 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                        config.aiProvider === p 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">API Ключ</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <input
                        type="password"
                        value={config.aiKey}
                        onChange={(e) => setConfig({ ...config, aiKey: e.target.value })}
                        placeholder={config.aiProvider === 'gemini' && isSystemAiReady ? "Используется системный ключ" : "Введите ваш ключ"}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl pl-11 pr-4 py-3 focus:outline-none transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Модель</label>
                      {isLoadingModels && <RefreshCcw size={12} className="animate-spin text-blue-500" />}
                    </div>
                    <div className="relative">
                      <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <select
                        value={config.aiModel}
                        onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl pl-11 pr-4 py-3 focus:outline-none transition-all text-xs appearance-none cursor-pointer"
                      >
                        {availableModels.length > 0 ? (
                          availableModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))
                        ) : (
                          <option value={config.aiModel}>{config.aiModel || 'Загрузка...'}</option>
                        )}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 rotate-90" size={14} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 shrink-0">
                 <button 
                  onClick={handleApplySettings}
                  disabled={connectionStatus === 'testing'}
                  className={`w-full px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg ${
                    connectionStatus === 'testing' ? 'bg-slate-800 text-slate-400 cursor-not-allowed' :
                    connectionStatus === 'success' ? 'bg-emerald-600 text-white shadow-emerald-500/20' :
                    connectionStatus === 'error' ? 'bg-red-600 text-white shadow-red-500/20' :
                    'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                 >
                   {connectionStatus === 'testing' ? <RefreshCw size={18} className="animate-spin" /> : 
                    connectionStatus === 'success' ? <Check size={18} /> : 
                    connectionStatus === 'error' ? <XCircle size={18} /> : 
                    <Check size={18} />}
                   {connectionStatus === 'testing' ? 'Проверка...' : 
                    connectionStatus === 'success' ? 'Настройки сохранены' : 
                    connectionStatus === 'error' ? 'Ошибка связи с Loki' : 
                    'Применить настройки'}
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 border-b border-slate-800 px-6 py-3 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity size={22} className="text-white" />
              </div>
              <h1 className="font-bold text-xl tracking-tight text-white">Loki<span className="text-blue-500">AI</span></h1>
            </div>

            <div className="hidden md:flex items-center gap-4 border-l border-slate-800 pl-6">
              <div className="flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800">
                 <Database size={13} className="text-blue-500" />
                 <span className="text-slate-400 max-w-[150px] truncate">{config.url.replace(/^https?:\/\//, '')}</span>
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
              </div>
              <div className={`flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-lg border ${canAnalyze ? 'bg-purple-500/5 border-purple-500/20 text-purple-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                 <ShieldCheck size={13} />
                 <span className="uppercase max-w-[200px] truncate">{config.aiProvider}: {config.aiModel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-slate-800 group active:scale-95 bg-slate-900 shadow-sm"
              title="Настройки"
            >
              <Settings size={20} className="group-hover:rotate-45 transition-transform duration-500" />
            </button>

            <button 
              onClick={handleAiAnalyze}
              disabled={state === AppState.FETCHING || state === AppState.ANALYZING || !canAnalyze}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                state === AppState.ANALYZING || !canAnalyze
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 active:scale-95'
              }`}
            >
              {state === AppState.ANALYZING ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} />
              )}
              {state === AppState.ANALYZING ? 'Анализ...' : 'Анализировать AI'}
            </button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        {!canAnalyze && (
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-amber-500 shrink-0" size={18} />
              <p className="text-amber-400 text-xs font-medium">AI не настроен. Укажите API ключ в настройках (Gemini, OpenAI или OpenRouter).</p>
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="text-xs font-bold text-amber-500 hover:underline">Открыть настройки</button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
            <p className="text-red-400 text-xs font-medium">{errorMessage}</p>
          </div>
        )}

        {analysis && (
          <section className="animate-in slide-in-from-top-4 duration-700">
            <Dashboard logs={logs} analysis={analysis} />
          </section>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-lg">
                <Terminal size={20} className="text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Журнал событий</h2>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row gap-5 items-end shadow-xl backdrop-blur-sm">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">LogQL Query</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                <input 
                  type="text"
                  value={config.query}
                  onChange={(e) => setConfig({...config, query: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl pl-11 pr-4 py-3 focus:outline-none transition-all font-mono text-xs text-slate-300 shadow-inner"
                  placeholder='{job="varlogs"}'
                />
              </div>
            </div>
            
            <div className="w-full lg:w-48 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Период</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                <select 
                  value={config.range}
                  onChange={(e) => setConfig({...config, range: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl pl-11 pr-4 py-3 focus:outline-none transition-all text-xs text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="15m">15 минут</option>
                  <option value="1h">1 час</option>
                  <option value="6h">6 часов</option>
                  <option value="12h">12 часов</option>
                  <option value="24h">24 часа</option>
                  <option value="7d">7 дней</option>
                </select>
              </div>
            </div>

            <div className="w-full lg:w-36 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Лимит строк</label>
              <div className="relative">
                <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                <input 
                  type="number"
                  value={config.limit}
                  onChange={(e) => setConfig({...config, limit: parseInt(e.target.value) || 100})}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl pl-11 pr-4 py-3 focus:outline-none transition-all text-xs shadow-inner"
                />
              </div>
            </div>

            <button 
              onClick={handleFetchOnly}
              disabled={state === AppState.FETCHING}
              className="bg-slate-100 hover:bg-white text-slate-950 px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 h-[48px] w-full lg:w-auto justify-center shadow-lg"
            >
              {state === AppState.FETCHING ? <RefreshCw size={18} className="animate-spin" /> : <Terminal size={18} />}
              Показать логи
            </button>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
            <div className="p-3 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Поток данных</span>
              </div>
              <div className="text-[9px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                {logs.length} RECORDS
              </div>
            </div>
            <div className="flex-1 p-3 font-mono text-[10px] leading-tight overflow-x-auto custom-scrollbar bg-slate-950/20">
              {logs.length > 0 ? (
                <table className="w-full border-separate border-spacing-y-0.5">
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="pr-3 py-0.5 text-slate-600 align-top whitespace-nowrap tabular-nums opacity-60 group-hover:opacity-100 transition-opacity">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="pr-3 py-0.5 align-top">
                          <span className={`px-1 py-0 rounded text-[8px] font-black uppercase tracking-tighter border ${
                            log.level === 'error' ? 'text-red-400 bg-red-400/10 border-red-500/20' :
                            log.level === 'warn' ? 'text-amber-400 bg-amber-400/10 border-amber-500/20' :
                            'text-slate-500 bg-slate-800/50 border-slate-700/30'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="py-0.5 text-slate-400 group-hover:text-slate-100 break-all transition-colors font-mono">
                          {log.line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 py-32 space-y-4">
                  <div className="relative">
                    <Database size={48} className="opacity-10" />
                    <Search className="absolute -bottom-1 -right-1 text-slate-800" size={20} />
                  </div>
                  <p className="text-xs font-medium opacity-50">Данные не загружены.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-10 py-10 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <Activity size={16} />
          <span className="font-bold text-[10px] uppercase tracking-[0.2em]">Loki AI Engine v2.3</span>
        </div>
        <p className="text-[9px] text-slate-500 font-medium">© 2024 Анализатор логов. Обработка: {config.aiProvider.toUpperCase()}.</p>
      </footer>
    </div>
  );
};

export default App;
