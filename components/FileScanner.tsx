
import React, { useState, useRef } from 'react';
import { ScanMode, PageScanResult } from '../types';
import { ScannerService } from '../services/scannerService';

interface FileScannerProps {
  onComplete: (results: PageScanResult[]) => void;
}
interface ScanError {
  item: string;
  message: string;
}
const FileScanner: React.FC<FileScannerProps> = ({ onComplete }) => {
  const [activeInput, setActiveInput] = useState<'upload' | 'code'| 'url'>('upload');
  const [code, setCode] = useState('');
  const [remoteUrlInput, setRemoteUrlInput] = useState('https://example.com');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [errors, setErrors] = useState<ScanError[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const addLog = (msg: string) => {
    setScanLogs(prev => [msg, ...prev].slice(0, 8));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };
  const handleAbort = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        addLog("Abort requested...");
      }
    };
  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setErrors([]);
    setProgress(0);
    setScanLogs(["Initializing Auditor Engines..."]);
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    const batchId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const allResults: PageScanResult[] = [];

    try {
        if (activeInput === 'url') {
        const urlList = remoteUrlInput.split('\n').map(u => u.trim()).filter(u => u.length > 0);
        if (urlList.length === 0) throw new Error("At least one URL is required for remote auditing.");
        
        for (let i = 0; i < urlList.length; i++) {
          if (signal.aborted) break;
          const url = urlList[i];
          setCurrentFile(url);
          addLog(`Scanning target: ${url}`);
          try {
            const result = await ScannerService.scanPage(url, batchId, urlList.length > 1 ? ScanMode.MULTIPLE : ScanMode.SINGLE, (m) => addLog(m), signal);
            allResults.push(result);
            // Throttle slightly for bulk requests to avoid proxy rate-limiting
            if (urlList.length > 1) await new Promise(r => setTimeout(r, 300));
          } catch (err) {
            if ((err as Error).name === 'AbortError' || signal.aborted) {
               addLog("Scan Aborted.");
               break;
            }
            setErrors(prev => [...prev, { item: url, message: (err as Error).message }]);
            addLog(`FAILURE: ${url}`);
          }
          setProgress(Math.round(((i + 1) / urlList.length) * 100));
        }
      } else if (activeInput === 'code') {
        if (!code.trim()) throw new Error("Manual source code input is empty.");
        setCurrentFile('Source Editor');
           const result = await ScannerService.scanRawHtml(code, 'Manual Audit', 'Editor Source', batchId, ScanMode.SINGLE, (m) => addLog(m), undefined, signal);
        allResults.push(result);
        setProgress(100);
      } else {
        if (files.length === 0) throw new Error("Please select or drop HTML files to begin.");
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setCurrentFile(f.name);
          try {
            const html = await f.text();
            const result = await ScannerService.scanRawHtml(html, f.name, `file://${f.name}`, batchId, files.length > 1 ? ScanMode.MULTIPLE : ScanMode.SINGLE, (m) => addLog(m));
            allResults.push(result);
          } catch (err) {
            if ((err as Error).name === 'AbortError' || signal.aborted) break;
            setErrors(prev => [...prev, { item: f.name, message: "File could not be parsed as text." }]);
          }
          setProgress(Math.round(((i + 1) / files.length) * 100));
        }
      }
       if (!signal.aborted && allResults.length > 0) {
        onComplete(allResults);
      }
    } catch (err) {
       if ((err as Error).name !== 'AbortError') {
        setErrors([{ item: "General Engine Failure", message: (err as Error).message }]);
      }
    } finally {
      if (allResults.length > 0) {
         setIsScanning(false);
          abortControllerRef.current = null;
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
          {/* ERROR SUMMARY MODAL */}
      {errors.length > 0 && !isScanning && (
        <div className="bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-200 dark:border-rose-800/50 p-8 rounded-[32px] animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">Audit Failures Detected</h3>
              <p className="text-xs text-rose-500 font-medium mt-1">Some targets could not be reached or processed.</p>
            </div>
            <button onClick={() => setErrors([])} aria-label="error-moadal-btn"  className="p-2 bg-rose-100 dark:bg-rose-800 text-rose-600 rounded-full hover:bg-rose-600 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {errors.map((err, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl flex items-center gap-4 border dark:border-slate-800 shadow-sm">
                <div className="w-8 h-8 shrink-0 bg-rose-500 text-white rounded-lg flex items-center justify-center font-black text-[10px]">!</div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">{err.item}</div>
                  <div className="text-[10px] text-rose-500 font-medium">{err.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={`bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl p-12 transition-all ${isScanning ? 'opacity-30 blur-sm pointer-events-none' : ''}`}>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-[#9c369a] dark:text-white tracking-tight">Scan to audit HTML</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Scan and Analyze bulk profile remote URLs, HTML files, or raw source snippets for WCAG compliance.</p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex shadow-inner transition-colors">
            <button
              onClick={() => setActiveInput('upload')}
              className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${activeInput === 'upload' ? 'bg-white dark:bg-slate-700 text-[#9c369a] dark:text-white shadow-lg' : 'text-slate-500'}`}
            >
              Upload Files
            </button>
            <button  onClick={() => setActiveInput('url')}
              className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeInput === 'url' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-lg' : 'text-slate-500'}`}
            >
              Remote URL(s)
            </button>
            <button
              onClick={() => setActiveInput('code')}
              className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${activeInput === 'code' ? 'bg-white dark:bg-slate-700 text-[#9c369a] dark:text-white shadow-lg' : 'text-slate-500'}`}
            >
              Paste Source
            </button>
          </div>
        </div>

        {activeInput === 'upload' ? (
          <div className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px] p-16 text-center hover:border-indigo-400 transition-all group relative">
            <input type="file" multiple accept=".html,.htm" onChange={handleFileChange} aria-label="upload-files-area" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="bg-indigo-50 dark:bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">{files.length > 0 ? `${files.length} Files Selected` : 'Drop HTML files here'}</p>
          </div>
        ): activeInput === 'url' ? (
          <div className="space-y-6 py-4">
            <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest"  >Bulk URL Entry (One per line)</span>
                <span className="text-[9px] font-black text-emerald-500 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-0.5 rounded uppercase">Proxy Enabled</span>
            </div>
            <div className="relative group">
              <textarea id="url-input"
                value={remoteUrlInput}
                onChange={(e) => setRemoteUrlInput(e.target.value)}
                placeholder="google.com&#10;example.com"
                className="block w-full px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-none rounded-[32px] text-lg font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none min-h-[200px] resize-none font-mono"
              />
            </div>
            <p className="text-center text-xs text-slate-400 font-medium px-10">
              The engine will automatically normalize missing protocols (http/https).
            </p>
          </div>
        ) : (
          <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste HTML code here..." className="w-full h-96 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-emerald-400 p-8 rounded-[32px] font-mono text-xs focus:ring-2 focus:ring-indigo-500 border-none shadow-inner resize-none transition-colors" />
        )}

        <div className="flex gap-4 mt-12">
           <button onClick={handleScan} className="w-full py-5 bg-[#9c369a] text-white rounded-[24px] font-black text-lg shadow-xl hover:bg-black transition-all active:scale-[0.98]">
              START AUDIT SCAN
           </button>
        </div>
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-8 !mt-0">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[48px] p-12 shadow-2xl space-y-10 animate-in zoom-in duration-300">
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="text-center font-black text-slate-900 dark:text-white text-sm">
                 Analyzing: {currentFile}...
              </div>
              <div className="p-6 bg-slate-900 rounded-3xl text-emerald-400 font-mono text-[10px] h-32 overflow-hidden shadow-inner">
                 {scanLogs.map((l, i) => <div key={i} className={i === 0 ? "opacity-100" : "opacity-40"}>&gt; {l}</div>)}
              </div>
              <div className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                Multi-Engine Analysis Running...
              </div>
              <button onClick={event => { { handleAbort; } }} className="w-full py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
                   ABORT SCAN
                 </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default FileScanner;
