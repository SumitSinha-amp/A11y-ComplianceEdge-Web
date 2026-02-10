
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PageScanResult, AccessibilityIssue, AccessibilityNode } from '../types';
import { GeminiService } from '../services/geminiService';

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
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);

  const htmlLines = useMemo(() => (page.htmlSnapshot || "").split('\n'), [page.htmlSnapshot]);

  const findLineNumber = (snippet: string) => {
    if (!page.htmlSnapshot) return -1;
    const index = page.htmlSnapshot.indexOf(snippet);
    if (index === -1) return -1;
    return page.htmlSnapshot.substring(0, index).split('\n').length;
  };

  const activeNode = activeIssue?.nodes[selectedNodeIdx];

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

  useEffect(() => {
    if (activeTab === 'live' && iframeRef.current && activeNode) {
      const target = activeNode.target[0];
      const iframe = iframeRef.current;
      
      const injectHighlight = () => {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        doc.querySelectorAll('.a11y-highlight-ring').forEach(el => el.remove());
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
            border: '4px solid #4f46e5',
            borderRadius: '8px',
            boxShadow: '0 0 20px rgba(79, 70, 229, 0.4)',
            zIndex: '999999',
            pointerEvents: 'none',
            animation: 'pulse-ring 2s infinite'
          });
          if (!doc.getElementById('a11y-styles')) {
            const style = doc.createElement('style');
            style.id = 'a11y-styles';
            style.textContent = `@keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }`;
            doc.head.appendChild(style);
          }
          doc.body.appendChild(ring);
        }
      };
      if (iframe.contentDocument?.readyState === 'complete') injectHighlight();
      else iframe.onload = injectHighlight;
    }
  }, [activeTab, activeNode]);

  useEffect(() => {
    if (activeTab === 'fullhtml' && activeNode && codeContainerRef.current) {
      const lineNum = findLineNumber(activeNode.html);
      if (lineNum !== -1) {
        const lineEl = codeContainerRef.current.querySelector(`[data-line="${lineNum}"]`);
        lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeTab, activeNode]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 overflow-hidden !mt-0">
      <div className="bg-white dark:bg-slate-900 w-full h-full max-w-[1600px] rounded-none md:rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden transition-colors">
        
        {/* AI Side-panel */}
        <div className={`absolute top-0 right-0 h-full w-full md:w-[480px] bg-white dark:bg-slate-900 shadow-2xl z-[150] transition-transform duration-500 transform ${isAiPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="h-full flex flex-col">
              <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-indigo-600 text-white">
                 <h3 className="font-black text-sm uppercase tracking-widest">AI Fix Remediation</h3>
                 <button onClick={() => setIsAiPanelOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
                 {isAiLoading ? (
                   <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold text-xs">Analyzing and correcting snippet...</p>
                   </div>
                 ) : (
                   <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed">
                      {aiSuggestion}
                   </div>
                 )}
              </div>
              <div className="p-6 border-t dark:border-slate-800">
                 <button onClick={() => setIsAiPanelOpen(false)} className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Close Remediation</button>
              </div>
           </div>
        </div>

        {/* Modal Header */}
        <div className="px-8 py-5 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-[105] shadow-sm">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             </div>
             <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{page.title}</h2>
                <div className="text-[10px] font-mono text-slate-400 truncate max-w-[400px]">{page.path}</div>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => getAiRemediation(activeIssue!)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-200">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               AI REMEDIATION GUIDE
            </button>
            <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {/* Sidebar - FIXED WIDTH */}
          <div className="w-[380px] shrink-0 border-r dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col">
            <div className="p-6 border-b dark:border-slate-800 bg-white dark:bg-slate-900">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detected Issues ({page.issues.length})</h3>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              {page.issues.map((issue, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActiveIssue(issue); setSelectedNodeIdx(0); setAiSuggestion(null); }}
                  className={`w-full text-left p-6 border-b dark:border-slate-800 transition-all relative ${activeIssue === issue ? 'bg-white dark:bg-slate-800 shadow-xl z-10 border-l-4 border-l-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800/30'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${issue.impact === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'}`}>
                        {issue.impact}
                     </span>
                     <span className="text-[10px] font-black text-slate-300 dark:text-slate-700">#{(idx+1).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100 leading-snug mb-3">{issue.help}</div>
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-bold text-slate-400 uppercase">{issue.nodes.length} Instances</span>
                     <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{issue.engine}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Report Viewer */}
          <div className="flex-grow flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
             {/* View Navigation */}
             <div className="px-8 border-b dark:border-slate-800 flex items-center bg-white dark:bg-slate-900 z-10 transition-colors">
                <nav className="flex gap-8">
                   {[
                     { id: 'snapshot', label: 'SNAPSHOT' },
                     { id: 'fullhtml', label: 'SOURCE' },
                     { id: 'live', label: 'LIVE' }
                   ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-5 text-[10px] font-black tracking-[0.2em] transition-all border-b-2 ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                     >
                        {tab.label}
                     </button>
                   ))}
                </nav>
             </div>

             {/* Dynamic Viewport */}
             <div className="flex-grow relative bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-colors">
                {activeTab === 'snapshot' && (
                  <div className="h-full p-10 overflow-y-auto custom-scrollbar">
                     <div className="max-w-4xl mx-auto space-y-10">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border dark:border-slate-800 shadow-sm">
                           <h4 className="text-lg font-black text-slate-900 dark:text-white mb-6">Technical Diagnosis</h4>
                           <div className="space-y-4">
                              <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                                 <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</h5>
                                 <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed">{activeIssue?.description}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact</h5>
                                    <div className="text-sm font-black text-slate-900 dark:text-white capitalize">{activeIssue?.impact}</div>
                                 </div>
                                 <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard</h5>
                                    <div className="text-sm font-black text-slate-900 dark:text-white">{activeIssue?.wcag || 'Best Practice'}</div>
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border dark:border-slate-800 shadow-sm">
                           <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Code Snippet</h5>
                           <div className="p-6 bg-slate-900 rounded-2xl font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner">
                              {activeNode?.html}
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'fullhtml' && (
                  <div className="h-full flex flex-col bg-white">
                     <div ref={codeContainerRef} className="flex-grow overflow-y-auto custom-scrollbar font-mono text-[13px] leading-6 selection:bg-indigo-100">
                        {htmlLines.map((line, i) => {
                          const lineNum = i + 1;
                          const isErrorLine = activeNode && line.includes(activeNode.html.substring(0, 30));
                          return (
                            <div key={i} data-line={lineNum} className={`flex group ${isErrorLine ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'}`}>
                               <div className="w-16 flex-shrink-0 text-right pr-6 text-slate-300 select-none bg-slate-50 group-hover:text-slate-400">{lineNum}</div>
                               <div className={`px-4 whitespace-pre ${isErrorLine ? 'text-indigo-900 font-bold' : 'text-slate-600'}`}>{line}</div>
                            </div>
                          );
                        })}
                     </div>
                  </div>
                )}

                {activeTab === 'live' && (
                  <div className="h-full">
                     <iframe ref={iframeRef} srcDoc={page.htmlSnapshot} className="w-full h-full bg-white border-none" title="Live Preview" sandbox="allow-same-origin allow-scripts" />
                  </div>
                )}
             </div>

             {/* Navigation Footer */}
             <div className="px-8 py-5 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-inner z-10 transition-colors">
                <div className="flex items-center gap-6">
                   <div className="space-y-0.5">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selected Instance</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                         <span className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px]">{selectedNodeIdx + 1}</span>
                         of {activeIssue?.nodes.length} occurrences
                      </div>
                   </div>
                   <div className="h-10 w-px bg-slate-100 dark:bg-slate-800"></div>
                   <div className="flex gap-2">
                      <button onClick={() => setActiveTab('fullhtml')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all">VIEW CODE</button>
                      <button onClick={() => setActiveTab('live')} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all">VIEW PAGE</button>
                   </div>
                </div>

                <div className="flex gap-3">
                   <button 
                      disabled={selectedNodeIdx === 0}
                      onClick={() => setSelectedNodeIdx(prev => prev - 1)}
                      className="px-6 py-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
                   >
                      PREVIOUS
                   </button>
                   <button 
                      disabled={selectedNodeIdx === (activeIssue?.nodes.length || 0) - 1}
                      onClick={() => setSelectedNodeIdx(prev => prev + 1)}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black hover:bg-black transition-all shadow-md active:scale-95"
                   >
                      NEXT OCCURRENCE
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
