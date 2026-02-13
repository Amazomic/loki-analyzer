
import React, { useState, useEffect } from 'react';
import { Settings, Search, Terminal, Activity, AlertCircle, RefreshCw, LayoutDashboard, Database, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { LokiConfig, LogEntry, AnalysisResult, AppState } from './types';
import { fetchLogs, testConnection } from './services/lokiService';
import { analyzeLogsWithAI } from './services/geminiService';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [config, setConfig] = useState<LokiConfig>(() => {
    const saved = localStorage.getItem('loki_config');
    return saved ? JSON.parse(saved) : {
      url: '/loki-proxy',
      token: '',
      query: '{job="varlogs"}',
      limit: 100
    };
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [connStatus, setConnStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'config'>('config');

  useEffect(() => {
    localStorage.setItem('loki_config', JSON.stringify(config));
  }, [config]);

  const handleTestConnection = async () => {
    setState(AppState.TESTING);
    setErrorMessage(null);
    const isOnline = await testConnection(config);
    setConnStatus(isOnline ? 'online' : 'offline');
    setState(AppState.IDLE);
    if (!isOnline) {
      setErrorMessage("Не удалось подключиться к Loki. Проверьте адрес и настройки сети.");
    }
  };

  const handleRunAnalysis = async () => {
    try {
      setErrorMessage(null);
      setState(AppState.FETCHING);
      
      const fetchedLogs = await fetchLogs(config);
      setLogs(fetchedLogs);
      
      if (fetchedLogs.length > 0) {
        setState(AppState.ANALYZING);
        const aiResult = await analyzeLogsWithAI(fetchedLogs);
        setAnalysis(aiResult);
        setState(AppState.SUCCESS);
        setActiveTab('dashboard');
      } else {
        setState(AppState.IDLE);
        setErrorMessage("Логи не найдены. Проверьте LogQL запрос или наличие данных в Loki.");
      }
    } catch (err: any) {
      console.error('Operation failed:', err);
      setState(AppState.ERROR);
      setErrorMessage(err.message || "Ошибка при выполнении анализа.");
    }
  };

  const navItems = [
    { id: 'config', label: 'Настройка', icon: Settings },
    { id: 'logs', label: 'Просмотр логов', icon: Terminal },
    { id: 'dashboard', label: 'AI Аналитика', icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900/50 border-r border-slate-800/50 flex flex-col backdrop-blur-xl">
        <div className="p-8 border-b border-slate-800/50 flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">Loki<span className="text-blue-500">AI</span></h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Log Analyzer</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                activeTab === item.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner' 
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800/50">
          <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50 space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Статус Loki</span>
              <Database size={12} />
            </div>
            <div className="flex items-center gap-3">
              {connStatus === 'online' ? (
                <Wifi size={16} className="text-green-500" />
              ) : connStatus === 'offline' ? (
                <WifiOff size={16} className="text-red-500" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-slate-500 animate-spin" />
              )}
              <span className={`text-sm font-bold ${connStatus === 'online' ? 'text-green-500' : connStatus === 'offline' ? 'text-red-500' : 'text-slate-500'}`}>
                {connStatus === 'online' ? 'В сети' : connStatus === 'offline' ? 'Оффлайн' : 'Ожидание...'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-slate-900/20 border-b border-slate-800/50 px-10 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm font-medium">Раздел</span>
            <span className="text-slate-700">/</span>
            <span className="font-bold text-white text-sm tracking-wide capitalize bg-slate-800/50 px-3 py-1 rounded-lg">
              {navItems.find(n => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleRunAnalysis}
              disabled={state !== AppState.IDLE && state !== AppState.SUCCESS && state !== AppState.ERROR}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-xl ${
                state === AppState.FETCHING || state === AppState.ANALYZING || state === AppState.TESTING
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed scale-95'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95'
              }`}
            >
              {state === AppState.FETCHING || state === AppState.ANALYZING || state === AppState.TESTING ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
              {state === AppState.FETCHING ? 'Получение логов...' : state === AppState.ANALYZING ? 'AI Анализ...' : state === AppState.TESTING ? 'Проверка...' : 'Запустить анализ'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-gradient-to-b from-slate-950 to-[#020617] custom-scrollbar">
          {errorMessage && (
            <div className="mb-8 p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="text-red-500" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-red-400 text-sm">Внимание! Ошибка</h4>
                <p className="text-red-400/70 text-sm mt-1 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="space-y-3">
                <h2 className="text-4xl font-extrabold text-white tracking-tight">Настройки источника</h2>
                <p className="text-slate-400 text-lg">Сконфигурируйте подключение к вашему инстансу Grafana Loki.</p>
              </div>
              
              <div className="bg-slate-900/40 rounded-[2rem] p-10 border border-slate-800/50 space-y-8 shadow-2xl backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Wifi size={12} /> Адрес Loki API
                    </label>
                    <input
                      type="text"
                      placeholder="http://localhost:3100"
                      value={config.url}
                      onChange={(e) => setConfig({ ...config, url: e.target.value })}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono text-blue-400 placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Settings size={12} /> Токен авторизации (Опционально)
                    </label>
                    <input
                      type="password"
                      placeholder="Bearer token..."
                      value={config.token}
                      onChange={(e) => setConfig({ ...config, token: e.target.value })}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-slate-300 placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Search size={12} /> Фильтр LogQL
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder='{job="my-app", level="error"}'
                      value={config.query}
                      onChange={(e) => setConfig({ ...config, query: e.target.value })}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono text-indigo-400 placeholder:text-slate-700"
                    />
                    <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                  <p className="text-[10px] text-slate-600 font-medium italic">Совет: Используйте метки для точного выбора нужных логов для анализа.</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-1/3 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Количество строк</label>
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      value={config.limit}
                      onChange={(e) => setConfig({ ...config, limit: Math.max(1, parseInt(e.target.value) || 100) })}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-bold text-white"
                    />
                  </div>
                  
                  <div className="flex-1 flex gap-4 pt-6">
                    <button 
                      onClick={handleTestConnection}
                      disabled={state === AppState.TESTING}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-700/50"
                    >
                      {state === AppState.TESTING ? <RefreshCw size={16} className="animate-spin" /> : <Wifi size={16} />}
                      Проверить соединение
                    </button>
                    <button 
                      onClick={handleRunAnalysis}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                      Начать анализ AI
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
               <div className="bg-slate-900/40 rounded-[2rem] border border-slate-800/50 overflow-hidden shadow-2xl backdrop-blur-sm">
                 <div className="px-8 py-5 bg-slate-800/30 border-b border-slate-800/50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <Terminal size={18} className="text-blue-400" />
                     <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Сырые данные логов</span>
                   </div>
                   <div className="text-[10px] font-bold text-slate-500 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800">
                     Всего: {logs.length} записей
                   </div>
                 </div>
                 <div className="p-8 font-mono text-[11px] leading-relaxed overflow-x-auto h-[65vh] custom-scrollbar">
                   {logs.length > 0 ? (
                     <table className="w-full border-separate border-spacing-y-2">
                       <tbody>
                         {logs.map((log, idx) => (
                           <tr key={idx} className="hover:bg-slate-800/30 transition-all group rounded-xl">
                             <td className="pr-6 py-2 text-slate-600 align-top whitespace-nowrap opacity-50 font-medium">
                               {new Date(log.timestamp).toLocaleTimeString()}
                             </td>
                             <td className="pr-4 py-2 align-top w-20">
                               <span className={`inline-block w-full text-center py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                                 log.level === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                 log.level === 'warn' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                 log.level === 'info' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                 'bg-slate-800 text-slate-500 border border-slate-700/50'
                               }`}>
                                 {log.level}
                               </span>
                             </td>
                             <td className="py-2 text-slate-400 break-all group-hover:text-slate-200 transition-colors">
                               {log.line}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-6 opacity-40">
                       <Terminal size={64} />
                       <p className="text-xl font-medium">Очередь пуста. Загрузите данные.</p>
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
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-8 opacity-40 animate-pulse">
               <Activity size={80} />
               <div className="text-center space-y-2">
                 <h3 className="text-2xl font-bold">Анализ не проведен</h3>
                 <p className="text-slate-500">Перейдите в настройки и нажмите "Начать анализ AI"</p>
               </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
};

export default App;
