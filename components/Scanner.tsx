
import React, { useState } from 'react';
import { ScanMode, PageScanResult } from '../types';
import { ScannerService } from '../services/scannerService';

interface ScannerProps {
  onComplete: (results: PageScanResult[]) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onComplete }) => {
  const [path, setPath] = useState('/content/wknd/us/en');
  const [mode, setMode] = useState<ScanMode>(ScanMode.SINGLE);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScanning(true);
    setProgress(0);
    setCurrentIdx(0);

    const batchId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

    try {
      if (mode === ScanMode.SINGLE) {
        setTotalItems(1);
        setEstimatedSeconds(5);
        const result = await ScannerService.scanPage(path, batchId, ScanMode.SINGLE, (msg) => setCurrentStatus(msg));
        setProgress(100);
        setCurrentIdx(1);
        onComplete([result]);
      } else {
        const mockChildPages = [
          `${path}/home`, 
          `${path}/about`, 
          `${path}/services`, 
          `${path}/contact`, 
          `${path}/blog`
        ];
        const total = mockChildPages.length;
        setTotalItems(total);
        
        const allResults: PageScanResult[] = [];
        const startTime = Date.now();

        for (let i = 0; i < total; i++) {
          setCurrentIdx(i + 1);
          const elapsed = (Date.now() - startTime) / 1000;
          const avgPerItem = i > 0 ? elapsed / i : 4.5;
          const remaining = Math.round(avgPerItem * (total - i));
          setEstimatedSeconds(remaining);

          const res = await ScannerService.scanPage(mockChildPages[i], batchId, ScanMode.MULTIPLE, (msg) => setCurrentStatus(msg));
          allResults.push(res);
          setProgress(Math.round(((i + 1) / total) * 100));
        }
        onComplete(allResults);
      }
    } catch (err) {
      alert("Error scanning path: " + (err as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto relative">
      <div className={`transition-all duration-500 ${isScanning ? 'opacity-20 blur-xl pointer-events-none scale-95' : 'opacity-100 blur-0 scale-100'}`}>
        <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 transition-colors">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-3 text-center tracking-tight">Enterprise Audit</h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-12 font-medium">Multi-engine accessibility profiling for AEM content paths.</p>

          <form onSubmit={handleScan} className="space-y-10">
            <div className="flex justify-center">
              <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-colors" role="radiogroup">
                <button
                  type="button"
                  onClick={() => setMode(ScanMode.SINGLE)}
                  className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${mode === ScanMode.SINGLE ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  Single Page
                </button>
                <button
                  type="button"
                  onClick={() => setMode(ScanMode.MULTIPLE)}
                  className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${mode === ScanMode.MULTIPLE ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  Path Scan
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">AEM Content Root Path</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                </div>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/content/brand/..."
                  className="block w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-[28px] text-lg font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-6 rounded-[32px] font-black text-xl shadow-2xl bg-indigo-600 hover:bg-black text-white shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-4 tracking-tight"
            >
              RUN COMPREHENSIVE AUDIT
            </button>
          </form>
        </div>
      </div>

      {isScanning && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[56px] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 space-y-12 animate-in zoom-in duration-500">
            <div className="relative h-64 w-full bg-slate-50 dark:bg-slate-800 rounded-[40px] flex items-center justify-center overflow-hidden">
               <div className="w-24 h-32 bg-white dark:bg-slate-700 rounded-xl shadow-2xl animate-pulse"></div>
               <div className="absolute inset-0 bg-indigo-500/10 animate-scan-line h-1.5 w-full blur-sm"></div>
            </div>

            <div className="text-center space-y-3">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Analyzing Domain...</h3>
              <p className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest">
                ITEM {currentIdx} OF {totalItems}
              </p>
              <div className="bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl">
                 <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">{currentStatus}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>{progress}%</span>
                <span>~{estimatedSeconds}S REMAINING</span>
              </div>
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-700 relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                   <div className="absolute inset-0 animate-flow opacity-30"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
