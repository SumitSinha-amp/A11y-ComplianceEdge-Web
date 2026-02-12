
import React, { useState, useMemo, useEffect } from 'react';
import { PageScanResult, AccessibilityIssue, Impact, ConformanceLevel, ScanMode } from '../types';
import PageReport from './PageReport';
import { GeminiService, FixResult } from '../services/geminiService';
import FixReviewModal from './FixReviewModal';
import { ScannerService } from '../services/scannerService';

interface ResultsViewProps {
  scans: PageScanResult[];
}

const ResultsView: React.FC<ResultsViewProps> = ({ scans }) => {
  const [activeScanIdx, setActiveScanIdx] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);
  const [search, setSearch] = useState('');
  const [filterImpact, setFilterImpact] = useState<Impact | 'all'>('all');
  const [filterConformance, setFilterConformance] = useState<ConformanceLevel | 'all'>('all');
  
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<(FixResult & { afterScan?: PageScanResult }) | null>(null);

  useEffect(() => {
    setActiveScanIdx(0);
  }, [scans]);

  const activeScan = scans[activeScanIdx] || null;

  const filteredIssues = useMemo(() => {
    if (!activeScan) return [];
    return activeScan.issues.filter(issue => {
      const matchesSearch = issue.help.toLowerCase().includes(search.toLowerCase()) || issue.id.toLowerCase().includes(search.toLowerCase());
      const matchesImpact = filterImpact === 'all' || issue.impact === filterImpact;
      const matchesConformance = filterConformance === 'all' || issue.conformance === filterConformance;
      return matchesSearch && matchesImpact && matchesConformance;
    });
  }, [activeScan, search, filterImpact, filterConformance]);

  const batchStats = useMemo(() => {
    const totalIssues = scans.reduce((acc, s) => acc + s.issues.length, 0);
    const critical = scans.reduce((acc, s) => acc + s.issues.filter(i => i.impact === 'critical').length, 0);
    return { totalIssues, critical };
  }, [scans]);

  const handleFullFix = async () => {
    if (!activeScan?.htmlSnapshot) return;
    setIsFixing(true);
    try {
      // Step 1: Request targeted fixes based on current issues
      const result = await GeminiService.fixHtml(activeScan.htmlSnapshot, activeScan.issues);
      
      // Step 2: Validation Scan - Re-audit the fixed HTML to confirm reduction
      const validationScan = await ScannerService.scanRawHtml(
        result.fixedHtml, 
        `Remediated: ${activeScan.title}`, 
        activeScan.path, 
        'validation-batch', 
        ScanMode.SINGLE
      );

      setFixResult({
        ...result,
        afterScan: validationScan
      });
    } catch (e) {
      console.error(e);
      alert("AI Remediation or Validation failed. The file may be too complex for a full automated fix.");
    } finally {
      setIsFixing(false);
    }
  };

  const calculateHealth = (issues: AccessibilityIssue[]) => {
    const crit = issues.filter(i => i.impact === 'critical').length;
    const seri = issues.filter(i => i.impact === 'serious').length;
    return Math.max(0, 100 - (crit * 20) - (seri * 10));
  };

  const getCategoryStyles = (category?: string) => {
    switch (category) {
      case 'Design': return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
      case 'Content': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      default: return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
    }
  };

  if (scans.length === 0) return (
    <div className="py-20 text-center space-y-4">
      <div className="text-slate-200 dark:text-slate-800 flex justify-center">
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      </div>
      <div className="text-slate-400 dark:text-slate-600 font-bold">Audit results will appear here after scanning.</div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-500/20 transition-all">
            <h2 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Batch Summary</h2>
            <div className="text-4xl font-black tracking-tight mb-8">{scans.length} Pages</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl">
                 <div className="text-2xl font-black">{batchStats.totalIssues}</div>
                 <div className="text-[9px] font-black uppercase tracking-widest opacity-60">Violations</div>
              </div>
              <div className="bg-rose-500/40 p-4 rounded-2xl">
                 <div className="text-2xl font-black">{batchStats.critical}</div>
                 <div className="text-[9px] font-black uppercase tracking-widest opacity-60">Critical</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border dark:border-slate-800 p-6 shadow-sm flex flex-col max-h-[400px]">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Select Page</h3>
             <div className="space-y-2 overflow-y-auto custom-scrollbar flex-grow pr-2">
                {scans.map((s, idx) => (
                  <button key={s.scanId} onClick={() => setActiveScanIdx(idx)} className={`w-full text-left p-4 rounded-2xl transition-all border flex items-center justify-between group ${activeScanIdx === idx ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <div className="truncate max-w-[180px]">
                      <div className={`text-xs font-black ${activeScanIdx === idx ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{s.title}</div>
                      <div className="text-[9px] font-mono text-slate-400 truncate">{s.path}</div>
                    </div>
                    <div className={`text-xs font-black ${calculateHealth(s.issues) > 80 ? 'text-emerald-500' : 'text-rose-500'}`}>{calculateHealth(s.issues)}%</div>
                  </button>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-slate-900 p-10 rounded-[40px] border dark:border-slate-800 shadow-sm transition-colors">
            <div className="space-y-1 w-[600px]">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{activeScan?.title}</h2>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-mono truncate max-w-md">{activeScan?.path}</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button 
                onClick={handleFullFix}
                disabled={isFixing}
                className="flex-1 md:flex-none px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isFixing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>VALIDATING...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span>AI REMEDIATE & VALIDATE</span>
                  </>
                )}
              </button>
              <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 rounded-2xl text-center border dark:border-slate-700 transition-colors">
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{activeScan?.issues.length}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Issues</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 transition-colors">
            <input type="text" placeholder="Filter issues..." value={search} onChange={e => setSearch(e.target.value)} className="flex-grow px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" />
            <div className="flex gap-2">
              <select value={filterImpact} onChange={e => setFilterImpact(e.target.value as any)} className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-400 outline-none border-none transition-colors">
                <option value="all">Impact: All</option>
                <option value="critical">Critical</option>
                <option value="serious">Serious</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden overflow-x-auto transition-all">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 border-b dark:border-slate-800">
                <tr><th className="px-8 py-5">Audit Rule</th><th className="px-8 py-5 text-center">Category</th><th className="px-8 py-5 text-center">Occurrences</th><th className="px-8 py-5 text-center">Standard</th><th className="px-8 py-5 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800 text-sm">
                {filteredIssues.map((issue, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-5"><div className="font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{issue.help}</div><div className="text-[10px] text-slate-400 font-mono tracking-tighter mt-1">{issue.id}</div></td>
                    <td className="px-8 py-5 text-center"><span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight ${getCategoryStyles(issue.category)}`}>{issue.category || 'Development'}</span></td>
                    <td className="px-8 py-5 text-center"><span className="font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl text-xs">{issue.nodes.length}</span></td>
                    <td className="px-8 py-5 text-center"><span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${issue.conformance === 'A' ? 'text-rose-600' : 'text-indigo-600'}`}>{issue.conformance || 'BP'}</span></td>
                    <td className="px-8 py-5 text-right"><button onClick={() => setSelectedIssue(issue)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[9px] tracking-widest hover:bg-black transition-all shadow-md">VIEW</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {activeScan && selectedIssue && <PageReport page={activeScan} initialIssue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
      
      {activeScan && fixResult && (
        <FixReviewModal 
          result={fixResult} 
          filename={activeScan.title} 
          originalIssueCount={activeScan.issues.length}
          remediatedIssueCount={fixResult.afterScan?.issues.length || 0}
          onClose={() => setFixResult(null)} 
        />
      )}
    </div>
  );
};

export default ResultsView;
