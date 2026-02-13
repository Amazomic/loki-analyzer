
import React from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LogEntry, AnalysisResult } from '../types';
import { AlertTriangle, Lightbulb, Zap, TrendingUp, ShieldAlert, MessageSquareText, BarChart3, Activity, ArrowRight } from 'lucide-react';

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
    { name: 'Варнинги', value: levelCounts.warn || 0, color: '#f59e0b' },
    { name: 'Инфо', value: levelCounts.info || 0, color: '#3b82f6' },
    { name: 'Debug', value: levelCounts.debug || 0, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-700 pb-20">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 shadow-xl flex items-center gap-5 backdrop-blur-sm">
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${levelCounts.error > 0 ? 'bg-red-500/10' : 'bg-slate-800/50'}`}>
             <ShieldAlert className={levelCounts.error > 0 ? 'text-red-500' : 'text-slate-500'} size={28} />
           </div>
           <div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Errors</p>
             <h3 className="text-3xl font-black text-white">{levelCounts.error || 0}</h3>
           </div>
        </div>
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 shadow-xl flex items-center gap-5 backdrop-blur-sm">
           <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center">
             <AlertTriangle className="text-amber-500" size={28} />
           </div>
           <div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Warnings</p>
             <h3 className="text-3xl font-black text-white">{levelCounts.warn || 0}</h3>
           </div>
        </div>
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 shadow-xl flex items-center gap-5 backdrop-blur-sm">
           <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
             <TrendingUp className="text-blue-500" size={28} />
           </div>
           <div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Processed</p>
             <h3 className="text-3xl font-black text-white">{logs.length}</h3>
           </div>
        </div>
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 shadow-xl flex items-center gap-5 backdrop-blur-sm">
           <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
             <Activity className="text-emerald-500" size={28} />
           </div>
           <div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Health Score</p>
             <h3 className="text-lg font-black text-emerald-500">
               {levelCounts.error > (logs.length * 0.1) ? 'Critical' : 'Stable'}
             </h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Charts */}
        <div className="bg-slate-900/30 p-8 rounded-[2rem] border border-slate-800/50 shadow-2xl backdrop-blur-md">
          <h3 className="text-lg font-bold flex items-center gap-3 text-white mb-6">
            <BarChart3 className="text-blue-500" size={20} />
            Распределение по типам
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-4">
             {chartData.map(d => (
               <div key={d.name} className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                 <span className="text-xs text-slate-400 font-medium">{d.name}: <span className="text-white font-bold">{d.value}</span></span>
               </div>
             ))}
          </div>
        </div>

        {/* AI Analysis Summary */}
        <div className="bg-slate-900/30 p-8 rounded-[2rem] border border-slate-800/50 shadow-2xl backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-3 text-white">
              <MessageSquareText className="text-purple-500" size={20} />
              AI Заключение
            </h3>
            <span className="text-[9px] font-black text-slate-500 border border-slate-800 px-2 py-1 rounded bg-slate-950/50 tracking-tighter uppercase">SRE Mode Active</span>
          </div>
          
          <div className="flex-1 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/50 text-slate-300 leading-relaxed text-sm italic font-medium">
             "{analysis.summary}"
          </div>
          
          <div className="mt-6 space-y-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Основные инциденты</p>
            {analysis.detectedErrors.map((err, i) => (
              <div key={i} className="flex items-center justify-between bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="font-bold text-red-400 text-xs truncate uppercase tracking-tighter">{err.type}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{err.description}</p>
                </div>
                <div className="text-red-500 font-black text-xs px-2 py-1 bg-red-500/10 rounded-lg">
                  {err.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      <div className="bg-slate-900/30 rounded-[2.5rem] border border-slate-800/50 shadow-2xl overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/5">
              <Zap className="text-amber-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Технические рекомендации</h3>
              <p className="text-slate-500 text-xs mt-1">Решения, предложенные на основе анализа аномалий.</p>
            </div>
          </div>
        </div>
        
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analysis.recommendations.map((rec, i) => (
            <div key={i} className="group relative bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 rounded-3xl p-7 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  rec.priority === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                  rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  'bg-blue-500/10 text-blue-500 border-blue-500/20'
                }`}>
                  {rec.priority === 'high' ? 'Критично' : rec.priority === 'medium' ? 'Важно' : 'Совет'}
                </span>
                <Lightbulb size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
              </div>
              
              <h4 className="text-md font-bold text-white mb-2 leading-tight">{rec.title}</h4>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">{rec.action}</p>
              
              <div className="pt-4 border-t border-slate-800/50">
                <button className="flex items-center gap-2 text-[10px] font-black text-blue-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest">
                  Подробнее <ArrowRight size={12} />
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
