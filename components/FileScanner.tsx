
import React, { useState } from 'react';
import { ScanMode, PageScanResult } from '../types';
import { ScannerService } from '../services/scannerService';

interface FileScannerProps {
  onComplete: (results: PageScanResult[]) => void;
}

const FileScanner: React.FC<FileScannerProps> = ({ onComplete }) => {
  const [activeInput, setActiveInput] = useState<'upload' | 'code'>('upload');
  const [code, setCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [scanLogs, setScanLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setScanLogs(prev => [msg, ...prev].slice(0, 8));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setProgress(0);
    setScanLogs(["Initializing Auditor Engines..."]);
    const batchId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const allResults: PageScanResult[] = [];

    try {
      if (activeInput === 'code') {
        if (!code.trim()) throw new Error("Code required.");
        setCurrentFile('Editor Scan');
        const result = await ScannerService.scanRawHtml(code, 'Manual Audit', 'Editor Source', batchId, ScanMode.SINGLE, (m) => addLog(m));
        setProgress(100);
        allResults.push(result);
      } else {
        if (files.length === 0) throw new Error("File required.");
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setCurrentFile(f.name);
          const html = await f.text();
          const result = await ScannerService.scanRawHtml(html, f.name, `file://${f.name}`, batchId, files.length > 1 ? ScanMode.MULTIPLE : ScanMode.SINGLE, (m) => addLog(m));
          allResults.push(result);
          setProgress(Math.round(((i + 1) / files.length) * 100));
        }
      }
      onComplete(allResults);
    } catch (err) {
      alert("Audit error: " + (err as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className={`bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl p-12 transition-all ${isScanning ? 'opacity-30 blur-sm pointer-events-none' : ''}`}>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-[#9c369a] dark:text-white tracking-tight">Scan to audit HTML</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Scan and Analyze HTML source code for WCAG compliance.</p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex shadow-inner transition-colors">
            <button
              onClick={() => setActiveInput('upload')}
              className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${activeInput === 'upload' ? 'bg-white dark:bg-slate-700 text-[#9c369a] dark:text-white shadow-lg' : 'text-slate-500'}`}
            >
              Upload Files
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
            <input type="file" multiple accept=".html,.htm" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="bg-indigo-50 dark:bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">{files.length > 0 ? `${files.length} Files Selected` : 'Drop HTML files here'}</p>
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
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-8">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[48px] p-12 shadow-2xl space-y-10 animate-in zoom-in duration-300">
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="text-center font-black text-slate-900 dark:text-white text-xl">
                 Analyzing {currentFile}...
              </div>
              <div className="p-6 bg-slate-900 rounded-3xl text-emerald-400 font-mono text-[10px] h-32 overflow-hidden shadow-inner">
                 {scanLogs.map((l, i) => <div key={i} className={i === 0 ? "opacity-100" : "opacity-40"}>&gt; {l}</div>)}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FileScanner;
