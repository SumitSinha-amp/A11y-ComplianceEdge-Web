
import React from 'react';
import { FixResult } from '../services/geminiService';

interface FixReviewModalProps {
  result: FixResult;
  filename: string;
  originalIssueCount: number;
  remediatedIssueCount: number;
  onClose: () => void;
}

const FixReviewModal: React.FC<FixReviewModalProps> = ({ 
  result, 
  filename, 
  originalIssueCount, 
  remediatedIssueCount, 
  onClose 
}) => {
  const handleDownload = () => {
    const blob = new Blob([result.fixedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remediated_${filename.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reduction = originalIssueCount - remediatedIssueCount;
  const isImproved = reduction > 0;

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 md:p-10 !mt-0">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full max-h-[850px] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border dark:border-slate-800 animate-in zoom-in duration-300">
        
        {/* Header with Stats Verification */}
        <div className="px-10 py-8 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-grow">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Compliance Verification</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
              AI-Powered Remediation & Validation Results
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-[24px] border dark:border-slate-700">
            <div className="px-6 py-3 text-center">
               <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Before</div>
               <div className="text-2xl font-black text-slate-400">{originalIssueCount}</div>
            </div>
            <div className="text-indigo-600">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
            </div>
            <div className="px-6 py-3 text-center">
               <div className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1">After</div>
               <div className="text-3xl font-black text-emerald-500">{remediatedIssueCount}</div>
            </div>
            {isImproved && (
              <div className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                -{reduction} Fixed
              </div>
            )}
          </div>

          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-10 custom-scrollbar space-y-8 bg-slate-50 dark:bg-slate-950/30">
          {result.appliedFixes.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border dark:border-slate-800">
              <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Page is already compliant with target rules.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detailed Fix Ledger</h3>
              {result.appliedFixes.map((fix, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 p-8 shadow-sm space-y-6 transition-colors group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">
                        {fix.category}
                      </span>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm">{fix.description}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase">{fix.ruleId || 'manual'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Original Context</div>
                      <pre className="p-5 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-[10px] font-mono text-rose-700 dark:text-rose-400 overflow-x-auto selection:bg-rose-200">
                        {fix.snippetBefore}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Remediated Source</div>
                      <pre className="p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-[10px] font-mono text-emerald-700 dark:text-emerald-400 overflow-x-auto selection:bg-emerald-200">
                        {fix.snippetAfter}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-slate-400 font-medium">
            Validation scan powered by <b>Axe Core</b> & <b>SIA Engines</b>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={onClose} className="flex-1 md:flex-none px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-200">
              Discard Changes
            </button>
            <button onClick={handleDownload} className="flex-1 md:flex-none px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-black transition-all flex items-center justify-center gap-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Remediated File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixReviewModal;
