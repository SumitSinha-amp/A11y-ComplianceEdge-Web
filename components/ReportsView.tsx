
import React, { useState, useMemo } from 'react';
import { PageScanResult, AccessibilityIssue, ScanMode } from '../types';
import PageReport from './PageReport';

interface ReportsViewProps {
  results: PageScanResult[];
  onViewDetails: (scan: PageScanResult) => void;
  onViewBatch: (batch: PageScanResult[]) => void;
}

const ReportsView: React.FC<ReportsViewProps> = ({ results, onViewDetails, onViewBatch }) => {
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<{ scan: PageScanResult; ai: boolean } | null>(null);

  const globalStats = useMemo(() => {
    const totalPages = results.length;
    const totalIssues = results.reduce((acc, r) => acc + r.issues.length, 0);
    const critical = results.reduce((acc, r) => acc + r.issues.filter(i => i.impact === 'critical').length, 0);
    const totalScores = results.reduce((acc, r) => {
      const score = Math.max(0, 100 - (r.issues.filter(i => i.impact === 'critical').length * 20) - (r.issues.filter(i => i.impact === 'serious').length * 10));
      return acc + score;
    }, 0);
    
    return {
      totalPages,
      totalIssues,
      critical,
      avgHealth: totalPages ? Math.round(totalScores / totalPages) : 0
    };
  }, [results]);

  const sortedPages = useMemo(() => {
    return [...results].filter(r => 
      r.title.toLowerCase().includes(search.toLowerCase()) || 
      r.path.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [results, search]);

  const calculateHealthScore = (issues: AccessibilityIssue[]) => {
    const crit = issues.filter(i => i.impact === 'critical').length;
    const seri = issues.filter(i => i.impact === 'serious').length;
    const mod = issues.filter(i => i.impact === 'moderate').length;
    const score = 100 - (crit * 25) - (seri * 10) - (mod * 2);
    return Math.max(0, score);
  };

  const getCategoryBreakdown = (issues: AccessibilityIssue[]) => {
    const design = issues.filter(i => i.category === 'Design').length;
    const content = issues.filter(i => i.category === 'Content').length;
    const dev = issues.filter(i => i.category === 'Development' || !i.category).length;
    const total = issues.length || 1;
    return { design, content, dev };
  };

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center opacity-50">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-widest">No Scorecards Available</h2>
        <p className="text-sm text-slate-500 mt-2 font-medium">Audit data will populate here as you scan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Compliance Scorecards</h2>
            <button 
              onClick={() => onViewBatch(sortedPages)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-black transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Combine Results View
            </button>
          </div>
          <div className="flex gap-10 mt-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400">{globalStats.avgHealth}%</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Average<br/>Health</div>
            </div>
            <div className="w-px h-12 bg-slate-200 dark:bg-slate-800"></div>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-black text-rose-600 dark:text-rose-500">{globalStats.critical}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Critical<br/>Warnings</div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-96 relative">
          <input
            type="text"
            placeholder="Search scorecards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white outline-none transition-all"
          />
          <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sortedPages.map((scan) => {
          const healthScore = calculateHealthScore(scan.issues);
          const breakdown = getCategoryBreakdown(scan.issues);
          
          return (
            <div key={scan.scanId} className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group flex flex-col overflow-hidden">
              <div className="p-8 pb-4">
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${healthScore > 80 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'}`}>
                    Health: {healthScore}%
                  </div>
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-700">#{scan.scanId.slice(0, 6).toUpperCase()}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 truncate group-hover:text-indigo-600 transition-colors">{scan.title}</h3>
                <p className="text-[10px] text-slate-400 font-mono truncate">{scan.path}</p>
              </div>

              <div className="px-8 py-6 flex-grow space-y-6">
                 <div className="flex gap-1 h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-rose-500 h-full transition-all" style={{ width: `${(scan.issues.filter(i => i.impact === 'critical').length / (scan.issues.length || 1)) * 100}%` }}></div>
                    <div className="bg-orange-500 h-full transition-all" style={{ width: `${(scan.issues.filter(i => i.impact === 'serious').length / (scan.issues.length || 1)) * 100}%` }}></div>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-2 text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700 transition-colors">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{breakdown.design}</div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Design</div>
                    </div>
                    <div className="border-x dark:border-slate-700">
                      <div className="text-sm font-black text-slate-900 dark:text-white">{breakdown.dev}</div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Code</div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{breakdown.content}</div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Copy</div>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-t dark:border-slate-800 grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setSelectedReport({ scan, ai: true })}
                  className="py-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[9px] font-black border dark:border-slate-700 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
                >
                  Remediate
                </button>
                <button 
                  onClick={() => setSelectedReport({ scan, ai: false })}
                  className="py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[9px] font-black hover:bg-indigo-600 dark:hover:bg-indigo-400 transition-all uppercase tracking-widest"
                >
                 Full Report
                </button>
                <button 
                  onClick={() => onViewDetails(scan)}
                  className="col-span-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[9px] font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest"
                >
                  Table View
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedReport && (
        <PageReport
          page={selectedReport.scan}
          autoStartAi={selectedReport.ai}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};

export default ReportsView;
