
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PageScanResult, AccessibilityIssue, AccessibilityNode } from '../types';
import { GeminiService } from '../services/geminiService';
import { ExportService } from '../services/exportService';

interface PageReportProps {
  page: PageScanResult;
  initialIssue?: AccessibilityIssue | null;
  autoStartAi?: boolean;
  onClose: () => void;
}

type ViewTab = 'snapshot' | 'fullhtml' | 'live';

const PageReport: React.FC<PageReportProps> = ({ page, initialIssue, autoStartAi = false, onClose }) => {
  const [activeIssue, setActiveIssue] = useState<AccessibilityIssue | null>(initialIssue || page.issues[0] || null);
  const [activeTab, setActiveTab] = useState<ViewTab>('snapshot');
  const [selectedNodeIdx, setSelectedNodeIdx] = useState(0);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const htmlViewRef = useRef<HTMLPreElement>(null);
  const singlePdfTemplateRef = useRef<HTMLDivElement>(null);

  const activeNode = activeIssue?.nodes[selectedNodeIdx];

  const highlightedHtmlView = useMemo(() => {
    if (!page.htmlSnapshot || !activeNode?.html) return page.htmlSnapshot;
    
    // Normalize snippets slightly to handle minor string mismatches (whitespace/escaping)
    const snippet = activeNode.html.trim();
    const snapshot = page.htmlSnapshot;
    
    // Try exact match first
    let index = snapshot.indexOf(snippet);
    let matchedSnippet = snippet;

    // Fallback: try matching a smaller portion if the full snippet fails due to attribute ordering differences
    if (index === -1) {
       // Just highlight the start of the tag if we can't find the whole thing
       const tagStart = snippet.split('>')[0] + '>';
       index = snapshot.indexOf(tagStart);
       matchedSnippet = tagStart;
    }

    if (index === -1) return snapshot;

    return (
      <>
        {snapshot.substring(0, index)}
        <mark id="code-focus-highlight" className="bg-indigo-600 text-white px-2 py-1 rounded-md font-bold ring-4 ring-indigo-500/50 shadow-xl transition-all">
          {snapshot.substring(index, index + matchedSnippet.length)}
        </mark>
        {snapshot.substring(index + matchedSnippet.length)}
      </>
    );
  }, [page.htmlSnapshot, activeNode]);

  const handleExportPDF = async () => {
    if (!singlePdfTemplateRef.current) return;
    setIsExportingPDF(true);
    await ExportService.generatePDF(singlePdfTemplateRef.current, `Accessibility_Audit_${page.title}`);
    setIsExportingPDF(false);
  };

  const getAiRemediation = async (issue: AccessibilityIssue) => {
    setIsAiPanelOpen(true);
    if (aiSuggestion) return;
    setIsAiLoading(true);
    try {
      const suggestion = await GeminiService.getRemediation(issue);
      setAiSuggestion(suggestion);
    } catch {
      setAiSuggestion("Error generating remediation.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const healthScore = useMemo(() => {
    const crit = page.issues.filter(i => i.impact === 'critical').length;
    const seri = page.issues.filter(i => i.impact === 'serious').length;
    return Math.max(0, 100 - (crit * 20) - (seri * 10));
  }, [page.issues]);

  // Handle focus scrolling in HTML View
  useEffect(() => {
    if (activeTab === 'fullhtml') {
      const timer = setTimeout(() => {
        const highlight = document.getElementById('code-focus-highlight');
        if (highlight) {
          highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary glow effect
          highlight.classList.add('ring-offset-4', 'ring-offset-slate-900');
        }
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [activeTab, activeNode]);

  useEffect(() => {
    if (activeTab === 'live' && iframeRef.current && activeNode) {
      const target = activeNode.target[0];
      const iframe = iframeRef.current;
      
      const injectHighlight = () => {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        doc.querySelectorAll('.a11y-highlight-ring').forEach(el => el.remove());
        
        try {
          const el = doc.querySelector(target) as HTMLElement;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const rect = el.getBoundingClientRect();
            const ring = doc.createElement('div');
            ring.className = 'a11y-highlight-ring';
            Object.assign(ring.style, {
              position: 'absolute',
              top: `${rect.top + (iframe.contentWindow?.scrollY || 0) - 4}px`,
              left: `${rect.left + (iframe.contentWindow?.scrollX || 0) - 4}px`,
              width: `${rect.width + 8}px`,
              height: `${rect.height + 8}px`,
              border: '5px solid #4f46e5',
              borderRadius: '12px',
              boxShadow: '0 0 30px rgba(79, 70, 229, 0.6)',
              zIndex: '999999',
              pointerEvents: 'none',
              animation: 'pulse-ring 2s infinite ease-in-out'
            });
            doc.body.appendChild(ring);
          }
        } catch (e) {
          console.warn("Could not highlight element in live view:", target);
        }
      };
      if (iframe.contentDocument?.readyState === 'complete') injectHighlight();
      else iframe.onload = injectHighlight;
    }
  }, [activeTab, activeNode]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 overflow-hidden transition-all duration-300">
      
      {/* 
          PDF template moved far off-screen.
          Used for html2pdf capture. 
          The 'break-inside-avoid' class is key for proper paging.
      */}
      <div className="absolute top-0 left-[-10000px] pointer-events-none" aria-hidden="true">
        <div 
          ref={singlePdfTemplateRef} 
          className="bg-white text-slate-900 p-8 md:p-16 space-y-12 w-[1000px] block" 
        >
          <div className="border-b-4 border-slate-900 pb-10 flex justify-between items-end break-inside-avoid">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight uppercase">Technical Accessibility Audit</h1>
              <p className="text-xl font-bold text-indigo-600 leading-tight">{page.title}</p>
              <p className="text-xs font-mono text-slate-400">{page.path}</p>
            </div>
            <div className="text-right">
              <div className="text-6xl font-black">{healthScore}%</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page Score</div>
            </div>
          </div>
          <div className="space-y-12 block">
            {page.issues.map((issue, idx) => (
              <div key={idx} className="space-y-6 border-l-4 border-slate-100 pl-8 pb-8 block break-inside-avoid">
                 <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black">{idx + 1}. {issue.help}</h3>
                      <p className="text-xs font-mono text-indigo-600 mt-1">Rule: {issue.id} | WCAG: {issue.wcag || 'N/A'}</p>
                    </div>
                    <span className="px-3 py-1 rounded text-[10px] font-black uppercase bg-slate-900 text-white">{issue.impact}</span>
                 </div>
                 <p className="text-sm text-slate-600 leading-relaxed italic">{issue.description}</p>
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detected Occurrences ({issue.nodes.length})</h4>
                    {issue.nodes.slice(0, 5).map((node, nIdx) => (
                      <div key={nIdx} className="space-y-2 break-inside-avoid">
                        <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-tight">INSTANCE {nIdx + 1}</div>
                        <pre className="p-4 bg-slate-50 rounded-xl text-[10px] font-mono text-slate-800 overflow-hidden whitespace-pre-wrap border border-slate-200">
                          {node.html}
                        </pre>
                      </div>
                    ))}
                    {issue.nodes.length > 5 && <p className="text-[10px] text-slate-400 italic">Showing first 5 results in PDF report...</p>}
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 w-full h-full max-w-[1600px] rounded-none md:rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden transition-colors border dark:border-slate-800">
        
        {/* Modal Header */}
        <div className="px-8 py-5 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-[105] shadow-sm">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             </div>
             <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Page Audit Detail</h2>
                <div className="text-[10px] font-mono text-slate-400 truncate max-w-[400px]">{page.path}</div>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => getAiRemediation(activeIssue!)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 shadow-lg hover:bg-black transition-all">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               AI REMEDIATE
            </button>
            <button onClick={handleExportPDF} disabled={isExportingPDF} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 shadow-lg disabled:opacity-50 hover:bg-slate-800 transition-all">
               {isExportingPDF ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
               PDF REPORT
            </button>
            <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-[380px] shrink-0 border-r dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col">
            <div className="p-6 border-b dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Found Issues ({page.issues.length})</h3>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              {page.issues.map((issue, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActiveIssue(issue); setSelectedNodeIdx(0); setAiSuggestion(null); }}
                  className={`w-full text-left p-6 border-b dark:border-slate-800 transition-all relative ${activeIssue === issue ? 'bg-white dark:bg-slate-800 shadow-xl z-10 border-l-4 border-l-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800/30'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                       issue.impact === 'critical' ? 'bg-rose-100 text-rose-600' : 
                       issue.impact === 'serious' ? 'bg-orange-100 text-orange-600' :
                       issue.impact === 'moderate' ? 'bg-amber-100 text-amber-600' :
                       'bg-slate-100 text-slate-500'
                     }`}>
                        {issue.impact}
                     </span>
                     <span className="text-[10px] font-black text-slate-300 dark:text-slate-700 tracking-tighter">#{idx+1}</span>
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100 leading-snug mb-1">{issue.help}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{issue.nodes.length} Instances</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-grow flex flex-col bg-white dark:bg-slate-900 overflow-hidden transition-colors">
             <div className="px-8 border-b dark:border-slate-800 flex items-center bg-white dark:bg-slate-900 z-10 shadow-sm transition-colors">
                <nav className="flex gap-8">
                   {['snapshot', 'fullhtml', 'live'].map(tab => (
                     <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`py-5 text-[10px] font-black tracking-[0.2em] transition-all border-b-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                     >
                        {tab.toUpperCase() === 'FULLHTML' ? 'HTML VIEW' : tab.toUpperCase() === 'LIVE' ? 'LIVE HIGHLIGHT' : tab.toUpperCase()}
                     </button>
                   ))}
                </nav>
             </div>

             <div className="flex-grow relative bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-colors">
                <div className="h-full overflow-y-auto custom-scrollbar p-10">
                  {activeTab === 'snapshot' && (
                    <div className="max-w-4xl mx-auto space-y-10 bg-white dark:bg-slate-900 p-12 rounded-[40px] shadow-2xl border dark:border-slate-800 animate-in fade-in transition-colors">
                       <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-4">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rule Description</h4>
                             <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">{activeIssue?.description}</p>
                          </div>
                          <div className="space-y-3">
                             <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 flex justify-between items-center transition-colors shadow-inner">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impact Level</span>
                                <span className={`text-sm font-black uppercase ${
                                  activeIssue?.impact === 'critical' ? 'text-rose-600' : 
                                  activeIssue?.impact === 'serious' ? 'text-orange-600' : 'text-amber-600'
                                }`}>{activeIssue?.impact}</span>
                             </div>
                             <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 flex justify-between items-center transition-colors shadow-inner">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WCAG Standard</span>
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{activeIssue?.wcag || 'WCAG 2.1'}</span>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-4 pt-6 border-t dark:border-slate-800">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            Occurrence Implementation (Instance {selectedNodeIdx + 1})
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-tight">FOCUSED SNIPPET</span>
                          </h5>
                          <pre className="p-8 bg-slate-900 rounded-[32px] font-mono text-xs text-emerald-400 overflow-x-auto shadow-2xl border border-slate-800 leading-relaxed ring-2 ring-indigo-500/50">
                             {activeNode?.html}
                          </pre>
                       </div>
                    </div>
                  )}

                  {activeTab === 'fullhtml' && (
                    <div className="h-full bg-slate-900 rounded-[32px] p-8 overflow-y-auto custom-scrollbar border border-slate-800 shadow-2xl animate-in zoom-in-95 relative transition-all">
                       <pre ref={htmlViewRef} className="text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap selection:bg-indigo-600 selection:text-white">
                          {highlightedHtmlView}
                       </pre>
                       <div className="sticky top-0 right-0 float-right px-3 py-1 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">SOURCE HIGHLIGHT</div>
                    </div>
                  )}

                  {activeTab === 'live' && (
                    <div className="h-full bg-white rounded-[32px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl relative animate-in fade-in transition-all">
                       <iframe
                         ref={iframeRef}
                         className="w-full h-full"
                         srcDoc={`<!DOCTYPE html><html><head><style>
                           @keyframes pulse-ring { 0% { opacity: 0.4; transform: scale(0.9); } 50% { opacity: 0.8; transform: scale(1); } 100% { opacity: 0.4; transform: scale(0.9); } }
                           .a11y-highlight-ring { animation: pulse-ring 2s infinite ease-in-out; position: absolute; border: 5px solid #4f46e5; border-radius: 12px; box-shadow: 0 0 30px rgba(79, 70, 229, 0.6); z-index: 999999; pointer-events: none; }
                         </style></head><body>${page.htmlSnapshot}</body></html>`}
                       />
                       <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">LIVE DOM HIGHLIGHT</div>
                    </div>
                  )}
                </div>
             </div>

             <div className="px-8 py-5 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-inner z-10 transition-colors">
                <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-3">
                   Instance {selectedNodeIdx + 1} <span className="text-slate-300 dark:text-slate-700">/</span> {activeIssue?.nodes.length}
                </div>
                <div className="flex gap-3">
                   <button 
                      disabled={selectedNodeIdx === 0}
                      onClick={() => setSelectedNodeIdx(prev => prev - 1)}
                      className="px-6 py-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
                   >
                      PREV
                   </button>
                   <button 
                      disabled={selectedNodeIdx === (activeIssue?.nodes.length || 0) - 1}
                      onClick={() => setSelectedNodeIdx(prev => prev + 1)}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black hover:bg-black transition-all active:scale-95 shadow-md"
                   >
                      NEXT
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageReport;
