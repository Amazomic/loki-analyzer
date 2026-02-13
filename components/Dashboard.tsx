
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LogEntry, AnalysisResult } from '../types';
import { CheckCircle2, AlertTriangle, Lightbulb, Zap, TrendingUp, ShieldAlert, MessageSquareText, BarChart3, Activity } from 'lucide-react';

interface DashboardProps {
  logs: LogEntry[];
  analysis: AnalysisResult;
}

const Dashboard: React.FC<DashboardProps> = ({ logs, analysis }) => {
  const levelCounts = logs.reduce((acc: any, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {});

  const chartData = [
    { name: 'Ошибки', value: levelCounts.error || 0, color: '#ef4444' },
    { name: 'Предупреждения', value: levelCounts.warn || 0, color: '#f59e0b' },
    { name: 'Инфо', value: levelCounts.info || 0, color: '#3b82f6' },
    { name: 'Debug', value: levelCounts.debug || 0, color: '#8b5cf6' },
    { name: 'Unknown', value: levelCounts.unknown || 0, color: '#64748b' },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in zoom-in-95 duration-700 pb-20">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center gap-5 backdrop-blur-sm group hover:border-red-500/30 transition-all">
           <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
             <ShieldAlert className="text-red-500" size={28} />
           </div>
           <div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Критические</p>
             <h3 className="text-3xl font-black text-white">{levelCounts.error || 0}</h3>
           </div>
        </div>
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center gap-5 backdrop-blur-sm group hover:border-amber-500/30 transition-all">
           <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
             <AlertTriangle className="text-amber-500" size={28} />
           </div>
           <div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Варнинги</p>
             <h3 className="text-3xl font-black text-white">{levelCounts.warn || 0}</h3>
           </div>
        </div>
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center gap-5 backdrop-blur-sm group hover:border-blue-500/30 transition-all">
           <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
             <TrendingUp className="text-blue-500" size={28} />
           </div>
           <div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Обработано</p>
             <h3 className="text-3xl font-black text-white">{logs.length}</h3>
           </div>
        </div>
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center gap-5 backdrop-blur-sm group hover:border-indigo-500/30 transition-all">
           <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
             <Activity className="text-indigo-500" size={28} />
           </div>
           <div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Состояние</p>
             <h3 className="text-lg font-black text-white">Стабильно</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Charts Section */}
        <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800/50 shadow-2xl space-y-8 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black flex items-center gap-3 text-white">
              <BarChart3 className="text-blue-500" size={24} />
              Распределение уровней
            </h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px', padding: '12px' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50">
             {chartData.map(d => (
               <div key={d.name} className="flex flex-col gap-1">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                   <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{d.name}</span>
                 </div>
                 <span className="text-lg font-black text-white ml-4">{d.value}</span>
               </div>
             ))}
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800/50 shadow-2xl space-y-8 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black flex items-center gap-3 text-white">
              <MessageSquareText className="text-purple-500" size={24} />
              AI Инсайт
            </h3>
            <div className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              Gemini 3 Flash
            </div>
          </div>
          
          <div className="flex-1 bg-slate-950/50 p-8 rounded-3xl border border-slate-800/50 text-slate-300 leading-relaxed text-sm overflow-y-auto max-h-48 custom-scrollbar italic font-medium">
             "{analysis.summary}"
          </div>
          
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Выявленные паттерны ошибок</p>
            <div className="space-y-3">
              {analysis.detectedErrors.slice(0, 3).map((err, i) => (
                <div key={i} className="group flex items-start justify-between bg-slate-950/80 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-slate-200 text-sm group-hover:text-blue-400 transition-colors">{err.type}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{err.description}</p>
                  </div>
                  <div className="text-red-500 font-black bg-red-500/10 px-3 py-1 rounded-xl text-xs border border-red-500/20 shadow-lg shadow-red-500/5">
                    x{err.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-slate-900/40 rounded-[3rem] border border-slate-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-10 bg-gradient-to-r from-blue-600/10 via-transparent to-transparent border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
              <Zap className="text-amber-400 fill-amber-400/20" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Рекомендации по устранению</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Пошаговый план действий для стабилизации системы.</p>
            </div>
          </div>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {analysis.recommendations.map((rec, i) => (
            <div key={i} className="group relative bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/50 rounded-[2rem] p-8 transition-all duration-500 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-6">
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${
                  rec.priority === 'high' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                  'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                }`}>
                  {rec.priority === 'high' ? 'Критично' : rec.priority === 'medium' ? 'Средне' : 'Низкий'} приоритет
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center group-hover:bg-blue-600 group-hover:rotate-12 transition-all duration-500 shadow-xl border border-slate-800">
                  <Lightbulb size={18} className="text-slate-500 group-hover:text-white" />
                </div>
              </div>
              <h4 className="text-lg font-black text-white mb-3 group-hover:text-blue-400 transition-colors">{rec.title}</h4>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">{rec.action}</p>
              
              <div className="mt-8 pt-6 border-t border-slate-800/50">
                <button className="flex items-center gap-2 text-[10px] font-black text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-[0.2em]">
                  Просмотреть детали <TrendingUp size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
