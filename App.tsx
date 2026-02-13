
import React, { useState, useEffect } from 'react';
import { Settings, Terminal, Activity, AlertCircle, CheckCircle2, RefreshCw, LayoutDashboard, Database, Sparkles, ShieldCheck, ShieldAlert, Save, Link, ChevronRight, Info } from 'lucide-react';
import { LokiConfig, LogEntry, AnalysisResult, AppState } from './types';
import { fetchLogs, testConnection } from './services/lokiService';
import { analyzeLogsWithAI } from './services/geminiService';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const defaultLokiUrl = process.env.LOKI_URL || 'http://192.168.20.96:3100';

  const [config, setConfig] = useState<LokiConfig>({
    url: defaultLokiUrl,
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
        const parsed = JSON.parse(savedConfig);
        // Если в сохраненных данных старый прокси-путь, меняем на наглядный URL
        if (parsed.url === '/loki-proxy') parsed.url = defaultLokiUrl;
        setConfig(parsed);
      } catch (e) {
        console.error("Failed to parse saved config");
      }
    }
  }, [defaultLokiUrl]);

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
      setSuccessMessage("Связь с сервером Loki установлена!");
    } else {
      setErrorMessage(`Не удалось подключиться к ${config.url}. Проверьте доступность сервера.`);
    }
  };

  const handleSaveConfig = () => {
    clearMessages();
    localStorage.setItem('loki_ai_config', JSON.stringify(config));
    setSuccessMessage("Настройки сохранены");
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
          setErrorMessage("Логи загружены, но AI анализ недоступен без ключа API.");
        }
      } else {
        setState(AppState.IDLE);
        setErrorMessage("Логи не найдены. Проверьте запрос LogQL.");
      }
    } catch (err: any) {
      console.error(err);
      setState(AppState.ERROR);
      setErrorMessage(err.message || "Ошибка подключения.");
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
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
            { id: 'config', label: 'Подключение', icon: Settings },
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
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Статус системы</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Database size={12} /> {config.url.replace(/^https?:\/\//, '')}
                </p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={12} className={isAiReady ? 'text-emerald-500' : 'text-slate-600'} /> AI: {isAiReady ? 'Активен' : 'Выключен'}
                </p>
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-slate-900/50 border-b border-slate-800 px-8 flex items-center justify-between backdrop-blur-md z-10">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Система</span>
            <ChevronRight size={14} className="text-slate-700" />
            <span className="font-bold text-slate-100">{activeTab === 'config' ? 'Настройки подключения' : activeTab === 'logs' ? 'Журнал событий' : 'AI Дашборд'}</span>
          </div>

          <button 
            onClick={handleRun}
            disabled={state === AppState.FETCHING || state === AppState.ANALYZING}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
              state === AppState.FETCHING || state === AppState.ANALYZING
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 active:scale-95'
            }`}
          >
            {state === AppState.FETCHING || state === AppState.ANALYZING ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {state === AppState.FETCHING ? 'Загрузка данных...' : state === AppState.ANALYZING ? 'Анализ AI...' : 'Запустить анализ'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#020617] custom-scrollbar">
          {errorMessage && (
            <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
              <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-8 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={20} />
              <p className="text-emerald-400 text-sm font-medium">{successMessage}</p>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <h2 className="text-4xl font-black text-white tracking-tight">Сервер Loki</h2>
                <p className="text-slate-400 text-lg">Укажите адрес вашего инстанса для получения логов.</p>
              </div>
              
              <div className="bg-slate-900/50 rounded-3xl p-8 md:p-10 border border-slate-800 shadow-2xl space-y-8 relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Адрес сервера Loki</label>
                      <div className="relative">
                         <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                         <input
                          type="text"
                          value={config.url}
                          onChange={(e) => setConfig({ ...config, url: e.target.value })}
                          placeholder="http://192.168.20.96:3100"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-mono text-sm text-blue-400"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-1">
                         <Info size={12} className="text-slate-600" />
                         <p className="text-[10px] text-slate-500 italic">Браузерные запросы будут автоматически проксироваться через Docker</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Токен авторизации</label>
                      <input
                        type="password"
                        value={config.token}
                        onChange={(e) => setConfig({ ...config, token: e.target.value })}
                        placeholder="Bearer или API Key (необязательно)"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">LogQL Запрос</label>
                      <input
                        type="text"
                        value={config.query}
                        onChange={(e) => setConfig({ ...config, query: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Лимит строк</label>
                      <input
                        type="number"
                        value={config.limit}
                        onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) || 100 })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row gap-4">
                   <button 
                    onClick={handleTestConnection}
                    disabled={state === AppState.FETCHING}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold border border-slate-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                   >
                     {state === AppState.FETCHING ? <RefreshCw size={18} className="animate-spin" /> : <Link size={18} className="text-slate-400" />}
                     Проверить связь
                   </button>
                   <button 
                    onClick={handleSaveConfig}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                   >
                     <Save size={18} />
                     Сохранить настройки
                   </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="animate-in fade-in duration-500 h-full flex flex-col">
               <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[500px]">
                 <div className="p-5 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-blue-500" />
                     <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Сырой поток логов</span>
                   </div>
                   <div className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
                     {logs.length} ЗАПИСЕЙ
                   </div>
                 </div>
                 <div className="flex-1 overflow-auto p-6 font-mono text-[11px] leading-relaxed custom-scrollbar bg-slate-950/40">
                   {logs.length > 0 ? (
                     <table className="w-full border-separate border-spacing-y-1">
                       <tbody>
                         {logs.map((log, idx) => (
                           <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                             <td className="pr-6 py-1 text-slate-600 align-top whitespace-nowrap tabular-nums">
                               {new Date(log.timestamp).toLocaleTimeString()}
                             </td>
                             <td className="pr-4 py-1 align-top">
                               <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                                 log.level === 'error' ? 'text-red-400 bg-red-400/10' :
                                 log.level === 'warn' ? 'text-amber-400 bg-amber-400/10' :
                                 'text-slate-500 bg-slate-800/50'
                               }`}>
                                 {log.level}
                               </span>
                             </td>
                             <td className="py-1 text-slate-400 group-hover:text-slate-200 break-all transition-colors">
                               {log.line}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-700 py-32 space-y-4">
                       <Database size={48} className="opacity-10" />
                       <p className="text-sm font-medium">Нет данных для отображения. Запустите анализ.</p>
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
                  <div className="absolute inset-0 bg-blue-600 blur-[80px] opacity-20 animate-pulse" />
                  <Sparkles size={80} className="text-slate-800 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-slate-300">Готов к анализу</h3>
                  <p className="text-slate-500 max-w-sm">Нажмите кнопку запуска сверху, чтобы Gemini AI построил отчет по вашим логам.</p>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
