
import React from 'react';
import { FixResult } from '../services/geminiService';

interface FixReviewModalProps {
  result: FixResult;
  filename: string;
  onClose: () => void;
}

const FixReviewModal: React.FC<FixReviewModalProps> = ({ result, filename, onClose }) => {
  const handleDownload = () => {
    const blob = new Blob([result.fixedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed_${filename.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 md:p-10 !mt-0">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full max-h-[850px] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border dark:border-slate-800 animate-in zoom-in duration-300">
        <div className="px-10 py-8 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Review Automated Fixes</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
              AI has applied {result.appliedFixes.length} accessibility improvements
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-10 custom-scrollbar space-y-8 bg-slate-50 dark:bg-slate-950/30">
          {result.appliedFixes.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 font-bold">No common fixes were necessary for this source.</p>
            </div>
          ) : (
            result.appliedFixes.map((fix, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 p-8 shadow-sm space-y-6 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">
                      {fix.category}
                    </span>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm">{fix.description}</h4>
                  </div>
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-700">MODIFICATION #{idx + 1}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Original</div>
                    <pre className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl text-[10px] font-mono text-rose-700 dark:text-rose-400 overflow-x-auto">
                      {fix.snippetBefore}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fixed</div>
                    <pre className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-[10px] font-mono text-emerald-700 dark:text-emerald-400 overflow-x-auto">
                      {fix.snippetAfter}
                    </pre>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
          <button onClick={onClose} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-200">
            Cancel
          </button>
          <button onClick={handleDownload} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-black transition-all flex items-center gap-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download Remediated File
          </button>
        </div>
      </div>
    </div>
  );
};

export default FixReviewModal;
