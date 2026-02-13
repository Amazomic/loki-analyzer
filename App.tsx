
import React, { useState, useEffect } from 'react';
import { Settings, Search, Terminal, Activity, AlertCircle, CheckCircle2, RefreshCw, LayoutDashboard, Database, HelpCircle, Sparkles, ShieldCheck, ShieldAlert, Save, Link, Info } from 'lucide-react';
import { LokiConfig, LogEntry, AnalysisResult, AppState } from './types';
import { fetchLogs, testConnection } from './services/lokiService';
import { analyzeLogsWithAI } from './services/geminiService';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [config, setConfig] = useState<LokiConfig>({
    url: '/loki-proxy',
    token: '',
    query: '{job="varlogs"}',
    limit: 100
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'config'>('config');

  const isAiReady = !!process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY !== '';

  useEffect(() => {
    const savedConfig = localStorage.getItem('loki_ai_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Failed to parse saved config");
      }
    }
  }, []);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleTestConnection = async () => {
    clearMessages();
    setState(AppState.FETCHING);
    const isOk = await testConnection(config);
    setState(AppState.IDLE);
    if (isOk) {
      setSuccessMessage("Соединение с Loki успешно установлено через прокси!");
    } else {
      setErrorMessage("Не удалось подключиться к Loki. Проверьте LOKI_BACKEND_URL в docker-compose.");
    }
  };

  const handleSaveConfig = () => {
    clearMessages();
    localStorage.setItem('loki_ai_config', JSON.stringify(config));
    setSuccessMessage("Конфигурация успешно сохранена!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRun = async () => {
    try {
      clearMessages();
      setState(AppState.FETCHING);
      const fetchedLogs = await fetchLogs(config);
      setLogs(fetchedLogs);
      
      if (fetchedLogs.length > 0) {
        if (isAiReady) {
          setState(AppState.ANALYZING);
          const aiResult = await analyzeLogsWithAI(fetchedLogs);
          setAnalysis(aiResult);
          setState(AppState.IDLE);
          setActiveTab('dashboard');
        } else {
          setState(AppState.IDLE);
          setActiveTab('logs');
          setErrorMessage("Логи загружены. AI анализ недоступен (нет API ключа).");
        }
      } else {
        setState(AppState.IDLE);
        setErrorMessage("Логи не найдены.");
      }
    } catch (err: any) {
      console.error(err);
      setState(AppState.ERROR);
      setErrorMessage(err.message || "Ошибка подключения к Loki.");
    }
  };

  const navItems = [
    { id: 'config', label: 'Настройка', icon: Settings },
    { id: 'logs', label: 'Логи', icon: Terminal },
    { id: 'dashboard', label: 'AI Анализ', icon: LayoutDashboard, disabled: !isAiReady && !analysis },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Loki<span className="text-blue-500">AI</span></h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                item.disabled ? 'opacity-30 cursor-not-allowed' :
                activeTab === item.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <item.icon size={18} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Database size={12} />
              Статус Loki
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state === AppState.ERROR ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-sm font-medium">{state === AppState.ERROR ? 'Ошибка' : 'Готов'}</span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${isAiReady ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'} space-y-2`}>
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Модуль</span>
                {isAiReady ? <ShieldCheck size={14} className="text-emerald-500" /> : <ShieldAlert size={14} className="text-amber-500" />}
             </div>
             <p className={`text-xs font-medium ${isAiReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isAiReady ? 'Gemini Активен' : 'Ключ отсутствует'}
             </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-slate-900/50 border-b border-slate-800 px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Раздел</span>
            <span className="text-slate-600">/</span>
            <span className="font-semibold text-slate-100 capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleRun}
              disabled={state === AppState.FETCHING || state === AppState.ANALYZING}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg ${
                state === AppState.FETCHING || state === AppState.ANALYZING
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
              }`}
            >
              {state === AppState.FETCHING || state === AppState.ANALYZING ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {state === AppState.FETCHING ? 'Загрузка...' : state === AppState.ANALYZING ? 'Анализ...' : 'Запустить анализ'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#020617]">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
              <div>
                <h4 className="font-bold text-red-500 text-sm">Внимание</h4>
                <p className="text-red-400 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={18} />
              <div>
                <h4 className="font-bold text-emerald-500 text-sm">Успешно</h4>
                <p className="text-emerald-400 text-sm mt-1">{successMessage}</p>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">Конфигурация Loki</h2>
                <p className="text-slate-400">Настройте подключение к вашему инстансу Loki.</p>
              </div>
              
              <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 space-y-6 shadow-xl">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    Loki URL
                    <div className="group relative">
                        <Info size={14} className="text-slate-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-[10px] text-slate-300 rounded shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            Рекомендуется оставить <b>/loki-proxy</b>. Реальный адрес (192.168.20.96) настраивается в docker-compose через переменную LOKI_BACKEND_URL.
                        </div>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                    placeholder="/loki-proxy"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Токен (Опционально)</label>
                  <input
                    type="password"
                    value={config.token}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    placeholder="Bearer token..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">LogQL Запрос</label>
                    <input
                      type="text"
                      value={config.query}
                      onChange={(e) => setConfig({ ...config, query: e.target.value })}
                      placeholder='{job="varlogs"}'
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Лимит строк</label>
                    <input
                      type="number"
                      value={config.limit}
                      onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) || 100 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                   <button 
                    onClick={handleTestConnection}
                    disabled={state === AppState.FETCHING}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold border border-slate-700 transition-all flex items-center justify-center gap-2"
                   >
                     {state === AppState.FETCHING ? <RefreshCw size={18} className="animate-spin" /> : <Link size={18} />}
                     Проверить подключение
                   </button>
                   <button 
                    onClick={handleSaveConfig}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                   >
                     <Save size={18} />
                     Сохранить
                   </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4 animate-in fade-in duration-500">
               <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                 <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Terminal size={16} className="text-slate-400" />
                     <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Поток логов</span>
                   </div>
                   <div className="text-xs text-slate-500 font-mono">
                     {logs.length} строк получено
                   </div>
                 </div>
                 <div className="p-6 font-mono text-xs leading-relaxed overflow-x-auto h-[70vh] custom-scrollbar">
                   {logs.length > 0 ? (
                     <table className="w-full border-separate border-spacing-y-1">
                       <tbody>
                         {logs.map((log, idx) => (
                           <tr key={idx} className="hover:bg-slate-800/50 transition-colors group">
                             <td className="pr-4 py-1 text-slate-500 align-top whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity">
                               {log.timestamp}
                             </td>
                             <td className="pr-3 py-1 align-top">
                               <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                 log.level === 'error' ? 'bg-red-500/20 text-red-500' :
                                 log.level === 'warn' ? 'bg-amber-500/20 text-amber-500' :
                                 log.level === 'info' ? 'bg-blue-500/20 text-blue-500' :
                                 'bg-slate-700/50 text-slate-500'
                               }`}>
                                 {log.level}
                               </span>
                             </td>
                             <td className="py-1 text-slate-300 break-all opacity-90 group-hover:opacity-100">
                               {log.line}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                       <Terminal size={48} />
                       <p className="text-lg">Логи не загружены.</p>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'dashboard' && analysis && (
            <Dashboard logs={logs} analysis={analysis} />
          )}

          {activeTab === 'dashboard' && !analysis && state === AppState.IDLE && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-4">
               <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 animate-pulse">
                 <Sparkles size={32} strokeWidth={1.5} className="text-slate-600" />
               </div>
               <div>
                 <p className="text-xl font-medium">Нет данных анализа</p>
                 <p className="text-slate-600 max-w-sm mx-auto mt-2">Загрузите логи, чтобы увидеть рекомендации AI.</p>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
