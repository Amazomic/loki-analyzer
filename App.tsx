
import React, { useState, useEffect } from 'react';
import { Settings, Terminal, Activity, AlertCircle, CheckCircle2, RefreshCw, LayoutDashboard, Database, Sparkles, ShieldCheck, Link, ChevronRight, Info, XCircle, Check, X, Search, ListFilter } from 'lucide-react';
import { LokiConfig, LogEntry, AnalysisResult, AppState } from './types';
import { fetchLogs, testConnection } from './services/lokiService';
import { analyzeLogsWithAI } from './services/geminiService';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const defaultLokiUrl = process.env.LOKI_URL || 'http://192.168.20.96:3100';

  const [config, setConfig] = useState<LokiConfig>({
    url: defaultLokiUrl,
    token: '', // Keep in state for service compatibility, but remove from UI
    query: '{job="varlogs"}',
    limit: 100
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs'>('logs');

  const isAiReady = !!process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY !== '';

  useEffect(() => {
    const savedConfig = localStorage.getItem('loki_ai_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.url === '/loki-proxy') parsed.url = defaultLokiUrl;
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse saved config");
      }
    }
  }, [defaultLokiUrl]);

  const handleApplyConnection = async () => {
    setConnectionStatus('testing');
    const isOk = await testConnection(config);
    
    if (isOk) {
      setConnectionStatus('success');
      localStorage.setItem('loki_ai_config', JSON.stringify({ url: config.url }));
      setTimeout(() => {
        setConnectionStatus('idle');
        setIsSettingsOpen(false);
      }, 1200);
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
      // Save query settings to local storage
      localStorage.setItem('loki_ai_query_config', JSON.stringify({ query: config.query, limit: config.limit }));
    } catch (err: any) {
      console.error(err);
      setState(AppState.ERROR);
      setErrorMessage(err.message || "Ошибка получения логов.");
    }
  };

  const handleAiAnalyze = async () => {
    try {
      setErrorMessage(null);
      let currentLogs = logs;
      
      // If no logs, fetch them first
      if (logs.length === 0) {
        setState(AppState.FETCHING);
        currentLogs = await fetchLogs(config);
        setLogs(currentLogs);
      }

      if (currentLogs.length > 0) {
        if (isAiReady) {
          setState(AppState.ANALYZING);
          const aiResult = await analyzeLogsWithAI(currentLogs);
          setAnalysis(aiResult);
          setState(AppState.IDLE);
          setActiveTab('dashboard');
        } else {
          setState(AppState.IDLE);
          setErrorMessage("AI анализ недоступен без ключа API.");
        }
      } else {
        setState(AppState.IDLE);
        setErrorMessage("Логи не найдены для анализа.");
      }
    } catch (err: any) {
      console.error(err);
      setState(AppState.ERROR);
      setErrorMessage(err.message || "Ошибка анализа.");
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30 text-sm">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-white">Loki<span className="text-blue-500">AI</span></h1>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {[
            { id: 'logs', label: 'Просмотр логов', icon: Terminal },
            { id: 'dashboard', label: 'Аналитика AI', icon: LayoutDashboard, disabled: !isAiReady && !analysis },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                item.disabled ? 'opacity-20 cursor-not-allowed' :
                activeTab === item.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-blue-500/80">Сервис</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                  <Database size={12} className="shrink-0" /> {config.url.replace(/^https?:\/\//, '')}
                </p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={12} className={isAiReady ? 'text-emerald-500' : 'text-slate-600'} /> AI: {isAiReady ? 'Активен' : 'Выключен'}
                </p>
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Settings Modal (Connection Only) */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in" onClick={() => setIsSettingsOpen(false)} />
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/10 rounded-lg">
                    <Settings size={20} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Хост Loki</h3>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Loki URL</label>
                  <div className="relative">
                    <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input
                      type="text"
                      value={config.url}
                      onChange={(e) => setConfig({ ...config, url: e.target.value })}
                      placeholder="http://192.168.20.96:3100"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-mono text-sm text-blue-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-1">
                     <Info size={12} className="text-slate-600 shrink-0" />
                     <p className="text-[10px] text-slate-500 italic">Настройки проксирования заданы в Docker-контейнере</p>
                  </div>
                </div>

                <div className="pt-4">
                   <button 
                    onClick={handleApplyConnection}
                    disabled={connectionStatus === 'testing'}
                    className={`w-full px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg ${
                      connectionStatus === 'testing' ? 'bg-slate-800 text-slate-400 cursor-not-allowed' :
                      connectionStatus === 'success' ? 'bg-emerald-600 text-white shadow-emerald-500/20' :
                      connectionStatus === 'error' ? 'bg-red-600 text-white shadow-red-500/20' :
                      'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                   >
                     {connectionStatus === 'testing' ? (
                       <RefreshCw size={18} className="animate-spin" />
                     ) : connectionStatus === 'success' ? (
                       <Check size={18} />
                     ) : connectionStatus === 'error' ? (
                       <XCircle size={18} />
                     ) : (
                       <Link size={18} />
                     )}
                     
                     {connectionStatus === 'testing' ? 'Проверка...' : 
                      connectionStatus === 'success' ? 'Связь установлена' : 
                      connectionStatus === 'error' ? 'Ошибка связи' : 
                      'Применить хост'}
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <header className="h-16 bg-slate-900/50 border-b border-slate-800 px-8 flex items-center justify-between backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Система</span>
            <ChevronRight size={14} className="text-slate-700" />
            <span className="font-bold text-slate-100">{activeTab === 'logs' ? 'Журнал событий' : 'AI Дашборд'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700 group active:scale-95"
              title="Настройки хоста Loki"
            >
              <Settings size={20} className="group-hover:rotate-45 transition-transform duration-500" />
            </button>

            <button 
              onClick={handleAiAnalyze}
              disabled={state === AppState.FETCHING || state === AppState.ANALYZING}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-lg ${
                state === AppState.FETCHING || state === AppState.ANALYZING
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 active:scale-95'
              }`}
            >
              {state === AppState.ANALYZING ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {state === AppState.ANALYZING ? 'Анализ...' : 'Анализировать AI'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#020617] custom-scrollbar">
          {errorMessage && (
            <div className="max-w-6xl mx-auto mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
              <p className="text-red-400 text-xs font-medium">{errorMessage}</p>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="animate-in fade-in duration-500 h-full flex flex-col space-y-6">
               {/* Log Filters Panel */}
               <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">LogQL Query</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        type="text"
                        value={config.query}
                        onChange={(e) => setConfig({...config, query: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none transition-all font-mono text-xs text-slate-300"
                        placeholder='{job="varlogs"}'
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-32 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Лимит</label>
                    <div className="relative">
                      <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        type="number"
                        value={config.limit}
                        onChange={(e) => setConfig({...config, limit: parseInt(e.target.value) || 100})}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all text-xs"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleFetchOnly}
                    disabled={state === AppState.FETCHING}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-slate-700 active:scale-95 disabled:opacity-50 h-[42px]"
                  >
                    {state === AppState.FETCHING ? <RefreshCw size={16} className="animate-spin" /> : <Terminal size={16} />}
                    Показать
                  </button>
               </div>

               {/* Logs Table */}
               <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[400px]">
                 <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Поток данных</span>
                   </div>
                   <div className="text-[9px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
                     {logs.length} RECORDS
                   </div>
                 </div>
                 <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed custom-scrollbar bg-slate-950/40">
                   {logs.length > 0 ? (
                     <table className="w-full border-separate border-spacing-y-1">
                       <tbody>
                         {logs.map((log, idx) => (
                           <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                             <td className="pr-6 py-1 text-slate-600 align-top whitespace-nowrap tabular-nums opacity-60">
                               {new Date(log.timestamp).toLocaleTimeString()}
                             </td>
                             <td className="pr-4 py-1 align-top">
                               <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                 log.level === 'error' ? 'text-red-400 bg-red-400/10' :
                                 log.level === 'warn' ? 'text-amber-400 bg-amber-400/10' :
                                 'text-slate-500 bg-slate-800/50'
                               }`}>
                                 {log.level}
                               </span>
                             </td>
                             <td className="py-1 text-slate-400 group-hover:text-slate-200 break-all transition-colors font-mono">
                               {log.line}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-700 py-32 space-y-4">
                       <Database size={40} className="opacity-10" />
                       <p className="text-xs font-medium">Очередь пуста. Введите запрос и нажмите «Показать»</p>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'dashboard' && analysis && (
            <Dashboard logs={logs} analysis={analysis} />
          )}

          {activeTab === 'dashboard' && !analysis && (
             <div className="h-full flex flex-col items-center justify-center py-32 space-y-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-600 blur-[80px] opacity-10 animate-pulse" />
                  <Sparkles size={64} className="text-slate-800 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-slate-400">Нет данных анализа</h3>
                  <p className="text-slate-600 text-xs max-w-xs mx-auto">Нажмите «Анализировать AI» в шапке, чтобы получить отчет.</p>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
