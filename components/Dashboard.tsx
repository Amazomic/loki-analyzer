
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LogEntry, AnalysisResult } from '../types';
// Fix: Added BarChart3 to the lucide-react imports
import { CheckCircle2, AlertTriangle, Lightbulb, Zap, TrendingUp, ShieldAlert, MessageSquareText, BarChart3 } from 'lucide-react';

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
    { name: 'Errors', value: levelCounts.error || 0, color: '#ef4444' },
    { name: 'Warnings', value: levelCounts.warn || 0, color: '#f59e0b' },
    { name: 'Info', value: levelCounts.info || 0, color: '#3b82f6' },
    { name: 'Debug', value: levelCounts.debug || 0, color: '#8b5cf6' },
    { name: 'Unknown', value: levelCounts.unknown || 0, color: '#64748b' },
  ].filter(d => d.value > 0);

  const errorData = analysis.detectedErrors.map(e => ({
    name: e.type.length > 20 ? e.type.substring(0, 20) + '...' : e.type,
    count: e.count
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in zoom-in-95 duration-700">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5">
           <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center">
             <ShieldAlert className="text-red-500" size={32} />
           </div>
           <div>
             <p className="text-slate-400 text-sm font-medium">Critical Errors</p>
             <h3 className="text-3xl font-bold text-white">{levelCounts.error || 0}</h3>
           </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5">
           <div className="w-14 h-14 bg-amber-500/10 rounded-xl flex items-center justify-center">
             <AlertTriangle className="text-amber-500" size={32} />
           </div>
           <div>
             <p className="text-slate-400 text-sm font-medium">Warnings</p>
             <h3 className="text-3xl font-bold text-white">{levelCounts.warn || 0}</h3>
           </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5">
           <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center">
             <TrendingUp className="text-blue-500" size={32} />
           </div>
           <div>
             <p className="text-slate-400 text-sm font-medium">Total Analyzed</p>
             <h3 className="text-3xl font-bold text-white">{logs.length}</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts Section */}
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="text-blue-400" size={20} />
              Distribution
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
             {chartData.map(d => (
               <div key={d.name} className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                 <span className="text-sm text-slate-400">{d.name}: <span className="text-white font-bold">{d.value}</span></span>
               </div>
             ))}
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MessageSquareText className="text-purple-400" size={20} />
              AI Insight
            </h3>
            <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-bold text-purple-400 uppercase tracking-widest">
              Gemini 3 Flash
            </div>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm">
             {analysis.summary}
          </div>
          
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Top Detected Issues</p>
            <div className="space-y-3">
              {analysis.detectedErrors.map((err, i) => (
                <div key={i} className="flex items-start justify-between bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{err.type}</h4>
                    <p className="text-xs text-slate-500 mt-1">{err.description}</p>
                  </div>
                  <div className="text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded text-xs">
                    x{err.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-blue-600/10 to-transparent border-b border-slate-800">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <Zap className="text-amber-400 fill-amber-400/20" size={28} />
            Remediation Guide
          </h3>
          <p className="text-slate-400 mt-1">Step-by-step instructions to stabilize your services.</p>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {analysis.recommendations.map((rec, i) => (
            <div key={i} className="group relative bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                  rec.priority === 'high' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                  'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                }`}>
                  {rec.priority} priority
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <Lightbulb size={16} className="text-slate-500 group-hover:text-white" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{rec.title}</h4>
              <p className="text-slate-400 text-sm leading-relaxed">{rec.action}</p>
              
              <button className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider">
                View related logs <TrendingUp size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
