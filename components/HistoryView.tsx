
import React, { useState, useMemo } from 'react';
import { PageScanResult, AccessibilityIssue } from '../types';

interface HistoryViewProps {
  results: PageScanResult[];
  onViewDetails: (scan: PageScanResult) => void;
  onDeleteScan: (scanId: string) => void;
  onClear: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ results, onViewDetails, onDeleteScan, onClear }) => {
  const [search, setSearch] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [comparisonSelection, setComparisonSelection] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const pathGroups = useMemo(() => {
    const groups: Record<string, PageScanResult[]> = {};
    results.forEach(res => {
      if (!groups[res.path]) groups[res.path] = [];
      groups[res.path].push(res);
    });
    Object.keys(groups).forEach(path => {
      groups[path].sort((a, b) => b.timestamp - a.timestamp);
    });
    return groups;
  }, [results]);

  const filteredPaths = useMemo(() => {
    return Object.keys(pathGroups).filter(path => 
      path.toLowerCase().includes(search.toLowerCase()) || 
      pathGroups[path][0].title.toLowerCase().includes(search.toLowerCase())
    );
  }, [pathGroups, search]);

  const calculateScore = (issues: AccessibilityIssue[]) => {
    const crit = issues.filter(i => i.impact === 'critical').length;
    const seri = issues.filter(i => i.impact === 'serious').length;
    return Math.max(0, 100 - (crit * 20) - (seri * 10));
  };

  const handleToggleSelection = (scanId: string) => {
    setComparisonSelection(prev => {
      if (prev.includes(scanId)) return prev.filter(id => id !== scanId);
      if (prev.length >= 2) return [prev[1], scanId];
      return [...prev, scanId];
    });
  };

  const getComparisonData = () => {
    if (comparisonSelection.length < 2) return null;
    const s1 = results.find(r => r.scanId === comparisonSelection[0])!;
    const s2 = results.find(r => r.scanId === comparisonSelection[1])!;
    const [baseline, current] = s1.timestamp < s2.timestamp ? [s1, s2] : [s2, s1];
    
    const baselineIds = new Set(baseline.issues.map(i => i.id));
    const currentIds = new Set(current.issues.map(i => i.id));

    const fixed = baseline.issues.filter(i => !currentIds.has(i.id));
    const newIssues = current.issues.filter(i => !baselineIds.has(i.id));
    const recurring = current.issues.filter(i => baselineIds.has(i.id));

    return { baseline, current, fixed, newIssues, recurring };
  };

  const comparison = getComparisonData();

  const confirmDeleteIndividual = (e: React.MouseEvent, scanId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this specific audit record?")) {
      onDeleteScan(scanId);
    }
  };

  const confirmDeletePathGroup = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const count = pathGroups[path].length;
    if (window.confirm(`Delete all ${count} audit records for this path? This action cannot be undone.`)) {
      const scanIds = pathGroups[path].map(s => s.scanId);
      scanIds.forEach(id => onDeleteScan(id));
      if (selectedPath === path) {
        setSelectedPath(null);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Audit History</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Archived compliance snapshots stored locally until deleted.</p>
        </div>
        <button onClick={onClear} className="text-xs font-black text-rose-600 dark:text-rose-400 px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all uppercase tracking-widest">
          Flush All History
        </button>
      </div>

      {!selectedPath ? (
        <>
          <div className="relative">
            <input
              type="text"
              placeholder="Filter history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white outline-none transition-all"
            />
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredPaths.length === 0 ? (
               <div className="py-20 text-center border-2 border-dashed dark:border-slate-800 rounded-[40px] text-slate-400 font-bold">
                 No historical records found matching your search.
               </div>
            ) : filteredPaths.map(path => {
              const scans = pathGroups[path];
              const latest = scans[0];
              const score = calculateScore(latest.issues);
              return (
                <div key={path} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-sm ${score > 80 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>
                      {score}%
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">{latest.title}</h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-[300px] md:max-w-[500px]">{path}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{scans.length} Checkpoints</span>
                        <span className="text-slate-200 dark:text-slate-800">|</span>
                        <span className="text-[10px] font-bold text-slate-400">Activity: {new Date(latest.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => confirmDeletePathGroup(e, path)}
                      className="p-3 text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Delete all history for this path"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <button 
                      onClick={() => setSelectedPath(path)}
                      className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-[10px] font-black hover:bg-indigo-600 transition-all uppercase tracking-widest"
                    >
                      Explore
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
              <div className="flex justify-between items-start mb-6">
                <button onClick={() => { setSelectedPath(null); setComparisonSelection([]); }} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 w-fit px-3 py-1 rounded-lg uppercase tracking-widest transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                  Return to List
                </button>
                <button 
                  onClick={(e) => confirmDeletePathGroup(e, selectedPath)}
                  className="px-4 py-1 text-[10px] font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg uppercase tracking-widest transition-all"
                >
                  Delete All Records
                </button>
              </div>
              
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{pathGroups[selectedPath][0].title}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">{selectedPath}</p>
                </div>
                <div className="flex gap-3">
                   <button 
                      disabled={comparisonSelection.length < 2}
                      onClick={() => setShowComparison(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black hover:bg-black transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:opacity-30 uppercase tracking-widest"
                    >
                      Analyze Delta ({comparisonSelection.length})
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {pathGroups[selectedPath].map(scan => {
                   const score = calculateScore(scan.issues);
                   const isSelected = comparisonSelection.includes(scan.scanId);
                   return (
                     <div 
                        key={scan.scanId} 
                        onClick={() => handleToggleSelection(scan.scanId)}
                        className={`cursor-pointer p-6 rounded-[32px] border-2 transition-all relative group ${isSelected ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'}`}
                      >
                        <button 
                          onClick={(e) => confirmDeleteIndividual(e, scan.scanId)}
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:text-rose-600 bg-white dark:bg-slate-900 rounded-full shadow-lg transition-all z-20 border dark:border-slate-700"
                          title="Delete specific record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>

                        {isSelected && (
                          <div className="absolute top-4 right-12 bg-indigo-600 text-white p-1 rounded-full shadow-lg z-10">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`text-xl font-black ${score > 80 ? 'text-emerald-500' : 'text-orange-500'}`}>{score}%</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase">{new Date(scan.timestamp).toLocaleDateString()}</div>
                        </div>
                        <div className="flex justify-between items-center mt-6">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{scan.issues.length} Issues</span>
                          <button onClick={(e) => { e.stopPropagation(); onViewDetails(scan); }} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline tracking-widest">VIEW REPORT</button>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>
        </div>
      )}

      {showComparison && comparison && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-hidden transition-colors">
           <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[48px] shadow-2xl flex flex-col h-[90vh] animate-in zoom-in duration-300 overflow-hidden border dark:border-slate-800">
              <div className="px-10 py-8 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                 <div>
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Timeline Analytics</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Comparing scans from {new Date(comparison.baseline.timestamp).toLocaleDateString()} vs {new Date(comparison.current.timestamp).toLocaleDateString()}</p>
                 </div>
                 <button onClick={() => setShowComparison(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="flex-grow overflow-y-auto p-12 bg-slate-50/50 dark:bg-slate-950/20 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-8">
                     <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border dark:border-slate-700 shadow-sm text-center">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Health Evolution</div>
                        <div className="flex justify-center items-center gap-6">
                           <div className="text-2xl font-black text-slate-300">{calculateScore(comparison.baseline.issues)}%</div>
                           <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
                           <div className={`text-4xl font-black ${calculateScore(comparison.current.issues) >= calculateScore(comparison.baseline.issues) ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {calculateScore(comparison.current.issues)}%
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-800 text-center">
                           <div className="text-2xl font-black text-emerald-600">{comparison.fixed.length}</div>
                           <div className="text-[9px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mt-1">Resolved</div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-[32px] border border-rose-100 dark:border-rose-800 text-center">
                           <div className="text-2xl font-black text-rose-600">{comparison.newIssues.length}</div>
                           <div className="text-[9px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest mt-1">New Failures</div>
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                         <span className="w-1.5 h-4 bg-rose-500 rounded-full"></span>
                         Delta Regressions
                      </h5>
                      <div className="space-y-3">
                         {comparison.newIssues.length > 0 ? comparison.newIssues.map(issue => (
                           <div key={issue.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                              <div>
                                <div className="text-xs font-black text-slate-900 dark:text-white">{issue.help}</div>
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">{issue.id}</div>
                              </div>
                              <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded uppercase tracking-widest">Added</span>
                           </div>
                         )) : (
                           <div className="py-12 flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-900/10 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                              <svg className="w-10 h-10 text-emerald-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">No New Regressions Detected</p>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-10 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
                 <button onClick={() => setShowComparison(false)} className="px-10 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl">Close Analytics</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
