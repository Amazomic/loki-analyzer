
import React, { useState, useEffect } from 'react';
import { Settings, Search, Terminal, Activity, AlertCircle, CheckCircle2, RefreshCw, BarChart3, LayoutDashboard, Database, HelpCircle } from 'lucide-react';
import { LokiConfig, LogEntry, AnalysisResult, AppState } from './types';
import { fetchLogs } from './services/lokiService';
import { analyzeLogsWithAI } from './services/geminiService';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [config, setConfig] = useState<LokiConfig>({
    url: 'http://localhost:3100',
    token: '',
    query: '{job="varlogs"}',
    limit: 100
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'config'>('config');

  const handleRun = async () => {
    try {
      setErrorMessage(null);
      setState(AppState.FETCHING);
      const fetchedLogs = await fetchLogs(config);
      setLogs(fetchedLogs);
      
      if (fetchedLogs.length > 0) {
        setState(AppState.ANALYZING);
        const aiResult = await analyzeLogsWithAI(fetchedLogs);
        setAnalysis(aiResult);
        setState(AppState.IDLE);
        setActiveTab('dashboard');
      } else {
        setState(AppState.IDLE);
        setErrorMessage("No logs found matching the filter.");
      }
    } catch (err: any) {
      console.error(err);
      setState(AppState.ERROR);
      setErrorMessage(err.message || "An unknown error occurred.");
    }
  };

  const navItems = [
    { id: 'config', label: 'Setup', icon: Settings },
    { id: 'logs', label: 'Log Explorer', icon: Terminal },
    { id: 'dashboard', label: 'AI Analysis', icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">LokiEye <span className="text-blue-500">AI</span></h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
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

        <div className="p-4 border-t border-slate-800">
          <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Database size={12} />
              Loki Status
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state === AppState.ERROR ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-sm font-medium">{state === AppState.ERROR ? 'Connection Error' : 'Ready'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-slate-900/50 border-b border-slate-800 px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Section</span>
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
                <Search size={16} />
              )}
              {state === AppState.FETCHING ? 'Fetching...' : state === AppState.ANALYZING ? 'Analyzing...' : 'Analyze Logs'}
            </button>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#020617]">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
              <div>
                <h4 className="font-bold text-red-500 text-sm">Operation Failed</h4>
                <p className="text-red-400 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">Loki Configuration</h2>
                <p className="text-slate-400">Connect your Grafana Loki instance to start monitoring.</p>
              </div>
              
              <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 space-y-6 shadow-xl">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Loki Endpoint</label>
                  <input
                    type="text"
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                    placeholder="https://logs.example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">API Token / Basic Auth</label>
                  <input
                    type="password"
                    value={config.token}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    placeholder="Enter your bearer token or auth header"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">LogQL Filter</label>
                    <input
                      type="text"
                      value={config.query}
                      onChange={(e) => setConfig({ ...config, query: e.target.value })}
                      placeholder='{app="api"}'
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Limit</label>
                    <input
                      type="number"
                      value={config.limit}
                      onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) || 100 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                   <button 
                    onClick={handleRun}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                   >
                     Test Connection & Analyze
                   </button>
                </div>
              </div>

              <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 flex items-start gap-4">
                <HelpCircle className="text-blue-400 mt-1 shrink-0" />
                <div className="text-sm text-blue-200/80 leading-relaxed">
                  <p className="font-semibold text-blue-300 mb-1">How it works</p>
                  1. We fetch logs using LogQL from your Loki instance.<br/>
                  2. We filter for common error patterns and stack traces.<br/>
                  3. Gemini AI analyzes the context and provides specific recommendations.
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
                     <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Raw Logs</span>
                   </div>
                   <div className="text-xs text-slate-500 font-mono">
                     Showing {logs.length} entries
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
                       <p className="text-lg">No logs loaded. Click 'Analyze Logs' to fetch data.</p>
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
            <div className="h-full flex flex-col items-center justify-center text-slate-500 animate-pulse">
               <Activity size={64} strokeWidth={1} />
               <p className="mt-6 text-xl">Run an analysis to see insights here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
