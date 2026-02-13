
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LogEntry, AnalysisResult } from '../types';
import { AlertTriangle, Lightbulb, Zap, TrendingUp, ShieldAlert, MessageSquareText, BarChart3, Sparkles } from 'lucide-react';

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
    { name: 'Отладка', value: levelCounts.debug || 0, color: '#8b5cf6' },
    { name: 'Неизвестно', value: levelCounts.unknown || 0, color: '#64748b' },
  ].filter(d => d.value > 0);

  const priorityMap: Record<string, string> = {
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий'
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* AI Analysis Header */}
      <div className="flex items-center gap-3 mb-6">
        <Sparkles size={24} className="text-purple-400" />
        <h2 className="text-2xl font-bold text-white tracking-tight">AI Интеллектуальный отчет</h2>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5">
           <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
             <ShieldAlert className="text-red-500" size={24} />
           </div>
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Ошибки</p>
             <h3 className="text-2xl font-bold text-white">{levelCounts.error || 0}</h3>
           </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5">
           <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
             <AlertTriangle className="text-amber-500" size={24} />
           </div>
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Warnings</p>
             <h3 className="text-2xl font-bold text-white">{levelCounts.warn || 0}</h3>
           </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5">
           <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
             <TrendingUp className="text-blue-500" size={24} />
           </div>
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Проанализировано</p>
             <h3 className="text-2xl font-bold text-white">{logs.length}</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts Section */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-6">
            <BarChart3 className="text-blue-400" size={16} />
            Статистика потока
          </h3>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
             {chartData.map(d => (
               <div key={d.name} className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                 <span className="text-[11px] text-slate-400 truncate">{d.name}: <span className="text-white font-bold">{d.value}</span></span>
               </div>
             ))}
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <MessageSquareText className="text-purple-400" size={16} />
              Резюме Gemini
            </h3>
          </div>
          <div className="text-slate-300 leading-relaxed text-sm bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
             {analysis.summary}
          </div>
          
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ключевые инциденты</p>
            {analysis.detectedErrors.slice(0, 2).map((err, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="truncate pr-4">
                  <h4 className="font-bold text-slate-200 text-xs truncate">{err.type}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{err.description}</p>
                </div>
                <div className="text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded text-[10px] shrink-0">
                  x{err.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600/10 to-transparent border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-3 text-white">
              <Zap className="text-amber-400 fill-amber-400/20" size={20} />
              Рекомендации по устранению
            </h3>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.recommendations.map((rec, i) => (
            <div key={i} className="group relative bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                  rec.priority === 'high' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                  'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                }`}>
                  Приоритет: {priorityMap[rec.priority] || rec.priority}
                </div>
                <Lightbulb size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
              </div>
              <h4 className="text-sm font-bold text-white mb-2">{rec.title}</h4>
              <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-3">{rec.action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
