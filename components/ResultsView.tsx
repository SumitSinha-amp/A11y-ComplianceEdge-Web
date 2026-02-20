import React, { useState, useMemo, useEffect , useRef} from 'react';
import { PageScanResult, AccessibilityIssue, Impact, ConformanceLevel, ScanMode } from '../types';
import PageReport from './PageReport';
import { GeminiService, FixResult } from '../services/geminiService';
import FixReviewModal from './FixReviewModal';
import { ScannerService } from '../services/scannerService';
import { ExportService } from '../services/exportService';
interface ResultsViewProps {
  scans: PageScanResult[];
}

const ResultsView: React.FC<ResultsViewProps> = ({ scans }) => {
  const [activeScanIdx, setActiveScanIdx] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);
  const [isRemediating, setIsRemediating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterImpact, setFilterImpact] = useState<Impact | 'all'>('all');
  const [filterConformance, setFilterConformance] = useState<ConformanceLevel | 'all'>('all');
  //const [isFixing, setIsFixing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [fixResult, setFixResult] = useState<{ result: FixResult; originalCount: number; newCount: number } | null>(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  const batchReportRef = useRef<HTMLDivElement>(null);
  const singleReportRef = useRef<HTMLDivElement>(null);
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

 /* const batchStats = useMemo(() => {
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
*/
 const calculateHealth = (issues: AccessibilityIssue[]) => {
    if (!issues || issues.length === 0) return 100;
    const weights = { critical: 20, serious: 10, moderate: 5, info: 1 };
    let score = 100;
    const seenRules = new Set<string>();
    issues.forEach(i => {
      if (!seenRules.has(i.id)) {
        score -= (weights[i.impact as keyof typeof weights] || 5);
        seenRules.add(i.id);
      } else {
        score -= 0.5;
      }
    });
    return Math.max(0, Math.round(score));
  };
   const totalOccurrences = useMemo(() => {
    return (activeScan?.issues || []).reduce((sum, issue) => sum + issue.nodes.length, 0);
  }, [activeScan]);

   const handleRemediatePage = async () => {
    if (!activeScan || !activeScan.htmlSnapshot) return;
    setIsRemediating(true);
    try {
      const result = await GeminiService.fixHtml(activeScan.htmlSnapshot, activeScan.issues);
      const verification = await ScannerService.scanRawHtml(result.fixedHtml, "Verification", activeScan.path, "verify", ScanMode.SINGLE);
      setFixResult({ result, originalCount: activeScan.issues.length, newCount: verification.issues.length });
    } catch (err) {
      alert("Remediation error: " + (err as Error).message);
    } finally {
      setIsRemediating(false);
    }
  };
  const handleExportBatchPDF = async () => {
    if (!batchReportRef.current) return;
    setIsExporting(true);
    setShowExportMenu(false);
    await ExportService.generatePDF(batchReportRef.current, `Batch_Audit_${Date.now()}`);
    setIsExporting(false);
  };

  const handleExportSinglePDF = async () => {
    if (!singleReportRef.current) return;
    setIsExporting(true);
    setShowExportMenu(false);
    await ExportService.generatePDF(singleReportRef.current, `Audit_${activeScan.title}`);
    setIsExporting(false);
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

const PDFReportContent = ({ results }: { results: PageScanResult[] }) => (
    <div className="pdf-template-container bg-white text-slate-900 p-8 md:p-12 space-y-12 w-[800px] block">
      <div className="text-center border-b-8 border-slate-900 pb-10 pdf-avoid-break">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Accessibility Master Audit</h1>
        <p className="text-lg text-slate-500 font-bold uppercase tracking-[0.4em]">A11y ConformEase Scorecard</p>
        <div className="mt-4 text-[10px] font-mono text-slate-400">{new Date().toLocaleString()}</div>
      </div>
      
      {results.map((scan, sIdx) => (
        <div key={scan.scanId} className={`space-y-10 block ${sIdx > 0 ? 'pdf-page-break-before pt-10' : ''}`}>
          <div className="flex justify-between items-end border-b-2 border-slate-100 pb-6 pdf-avoid-break">
            <div>
              <h2 className="text-2xl font-black">{sIdx + 1}. {scan.title}</h2>
              <p className="text-xs font-mono text-indigo-600 mt-1">{scan.path}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black">{calculateHealth(scan.issues)}%</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Score </div>
              
            </div>
          </div>
          <div className="space-y-6 block">
            {scan.issues.map((issue, iIdx) => (
              <div key={issue.id + iIdx} className="space-y-4 border-l-4 border-slate-100 pl-8 pb-8 block pdf-avoid-break">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-black text-slate-900 leading-tight pr-12">{sIdx + 1}.{iIdx + 1}. {issue.help}</h3>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase whitespace-nowrap ${issue.impact === 'critical' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>{issue.impact}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{issue.description}</p>
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Failures ({issue.nodes.length})</h4>
                  {issue.nodes.slice(0, 5).map((node, nIdx) => (
                    <div key={nIdx} className="space-y-1.5 pdf-avoid-break">
                      <div className="text-[8px] font-bold text-indigo-400">ELEMENT {nIdx + 1}</div>
                      <pre className="p-4 bg-slate-50 rounded-xl text-[9px] font-mono text-slate-700 overflow-hidden whitespace-pre-wrap border border-slate-100 leading-tight">
                        {node.html}
                      </pre>
                    </div>
                  ))}
                  {issue.nodes.length > 5 && <p className="text-[8px] text-slate-400 italic">... and {issue.nodes.length - 5} more instances documented in detailed scan logs.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <div className="text-center pt-10 border-t border-slate-100 pdf-avoid-break">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">End of Automated Accessibility Audit Report</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 
          Templates are moved far off-screen via absolute positioning. 
          The ExportService will isolate these for high-quality capture.
      */}
      <div className="absolute top-0 left-[-10000px] pointer-events-none" aria-hidden="true">
        <div ref={batchReportRef}>
          <PDFReportContent results={scans} />
        </div>
        <div ref={singleReportRef}>
          <PDFReportContent results={activeScan ? [activeScan] : []} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3 space-y-4">
             <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[40px] text-white shadow-2xl relative  group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
               <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Batch Intelligence</h2>
            <div className="text-4xl font-black mt-2 tracking-tight">{scans.length} Pages Audited</div>
            <div className="mt-8 flex gap-3">
              <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap">Issues: {scans.reduce((a, s) => a + s.issues.length, 0)}</div>
              <div className="bg-rose-500/40 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border border-rose-400/20">Critical: {scans.reduce((a, s) => a + s.issues.filter(i => i.impact === 'critical').length, 0)}</div>
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-center border dark:border-slate-700 cursor-help relative" >
                <div className={`text-xs font-black ${calculateHealth(activeScan?.issues || []) > 80 ? 'text-emerald-500' : 'text-rose-500'}`}>Score: {calculateHealth(activeScan?.issues || [])}%</div>
                <button type="button" aria-label="Show scoring breakdown" onClick={() => setShowScoreInfo(!showScoreInfo)}  className="top-2 right-2 text-slate-400 hover:text-indigo-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                </button>
              </div>
            </div>
                      {showScoreInfo && (
                      <div className="absolute top-full -right-10 mt-4 w-80 p-8 bg-slate-900 text-white rounded-[40px] shadow-2xl z-[150] animate-in fade-in slide-in-from-top-4 border border-white/10 ring-8 ring-slate-900/10 backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Compliance Algorithm</h4>
                            <button aria-label="close Score Info" onClick={() => setShowScoreInfo(false)} className="text-white/40 hover:text-white transition-colors ">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-300 mb-6 font-medium">Scoring is based on the <b>Weighted Violation Factor</b>. Unique rule failures deduct significantly from the score to highlight systemic gaps.</p>
                        <div className="space-y-3 font-black text-[9px] uppercase tracking-widest">
                            <div className="flex justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-rose-400">Critical Failure</span>
                              <span>-20 PTS</span>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-orange-400">Serious Failure</span>
                              <span>-10 PTS</span>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-amber-400">Moderate Failure</span>
                              <span>-5 PTS</span>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-slate-400">Repeat Instances</span>
                              <span>-0.5 PTS</span>
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/10 text-center">
                            <button onClick={() => setShowScoreInfo(false)} className="w-full py-3 bg-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-indigo-600 transition-all">Got it</button>
                        </div>
                      </div>
                    )}
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

        <div className="lg:col-span-9 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-slate-900 p-10 rounded-[40px] border dark:border-slate-800 shadow-sm  transition-colors">
            <div className="space-y-1 w-[400px]">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{activeScan?.title}</h2>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-mono truncate max-w-md">{activeScan?.path}</p>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* <button onClick={handleFullFix} disabled={isFixing}  className="flex-1 md:flex-none px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50">
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
              </button>*/}
               <button aria-label="ai-remediation-btn" onClick={handleRemediatePage} disabled={isRemediating} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none">
                {isRemediating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "AI REMEDIATE PAGE"}
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-black transition-all flex items-center gap-2"
                >
                  {isExporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                  Export Results
                  <svg className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border dark:border-slate-700 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                       <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Single Page</div>
                    </div>
                    <button onClick={() => { setShowExportMenu(false); ExportService.exportIssuesToCSV(activeScan.issues, activeScan.title); }} className="w-full text-left px-5 py-3 text-[10px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 uppercase tracking-widest transition-colors">Export CSV (Page)</button>
                    <button onClick={handleExportSinglePDF} className="w-full text-left px-5 py-3 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 uppercase tracking-widest transition-colors">Export PDF (Page)</button>
                    <div className="p-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                       <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Batch</div>
                    </div>
                    <button onClick={() => { setShowExportMenu(false); ExportService.exportBatchToCSV(scans, "Batch_Report"); }} className="w-full text-left px-5 py-3 text-[10px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 uppercase tracking-widest transition-colors">Export CSV (Batch)</button>
                    <button onClick={handleExportBatchPDF} className="w-full text-left px-5 py-3 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 uppercase tracking-widest transition-colors">Export PDF (Batch)</button>
                  </div>
                )}
              
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 rounded-2xl text-center border dark:border-slate-700 transition-colors">
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{activeScan?.issues.length}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Issues</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 transition-colors">
            <input type="text" placeholder="Filter issues..." aria-label="filter-inputSearch" value={search} onChange={e => setSearch(e.target.value)} className="flex-grow px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" />
            <div className="flex gap-2">
              <select value={filterImpact} onChange={e => setFilterImpact(e.target.value as any)} aria-label="filter-issueType" className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-400 outline-none border-none transition-colors">
                <option value="all">Impact: All</option>
                <option value="critical">Critical</option>
                <option value="serious">Serious</option>
                <option value="moderate">Moderate</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden overflow-x-auto transition-all">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 border-b dark:border-slate-800">
                <tr><th className="px-8 py-5">Audit Rule</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-center">Category</th>
                <th className="px-8 py-5 text-center">Occurrences</th>
                <th className="px-8 py-5 text-center">Standard</th>
                <th className="px-8 py-5 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800 text-sm">
                {filteredIssues.map((issue, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-5"><div className="font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{issue.help}</div><div className="text-[10px] text-slate-400 font-mono tracking-tighter mt-1">{issue.id}</div></td>
                    <td className="px-6 py-5 text-center"><span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${issue.status === 'Confirmed' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{issue.status || 'Confirmed'}</span></td>
                    <td className="px-8 py-5 text-center"><span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight ${getCategoryStyles(issue.category)}`}>{issue.category || 'Development'}</span></td>
                    <td className="px-8 py-5 text-center"><span className="font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl text-xs">{issue.nodes.length}</span></td>
                    <td className="px-8 py-5 text-center"><span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${issue.conformance === 'A' ? 'text-rose-600' : 'text-indigo-600'}`}>{issue.conformance || 'S'}</span></td>
                    <td className="px-5 py-3 text-right"><button onClick={() => setSelectedIssue(issue)} className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold text-[10px] tracking-widest hover:bg-black transition-all shadow-md">View Report</button></td>
                  </tr>
                ))}
              </tbody>
               <tfoot className="bg-slate-50 dark:bg-slate-800/20 border-t dark:border-slate-800">
                <tr className="text-[10px] font-black uppercase text-slate-400">
                  <td colSpan={3} className="px-8 py-5">Aggregate Summary</td>
                  <td className="text-center px-6 py-5">
                    <div className="text-slate-900 dark:text-white text-sm font-black">{totalOccurrences}</div>
                    <div className="text-[8px] font-bold">Total Occurences</div>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {activeScan && selectedIssue && <PageReport page={activeScan} initialIssue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
      {fixResult && <FixReviewModal result={fixResult.result} filename={activeScan?.title || "audit"} originalIssueCount={fixResult.originalCount} remediatedIssueCount={fixResult.newCount} onClose={() => setFixResult(null)} />}
    </div>
  );
};

export default ResultsView;
