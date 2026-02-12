
import React, { useState, useEffect } from 'react';
import { PageScanResult, ScanMode } from './types';
import FileScanner from './components/FileScanner';
import ResultsView from './components/ResultsView';
import HistoryView from './components/HistoryView';
import ReportsView from './components/ReportsView';
import Header from './components/Header';
import { DBService } from './services/dbService';

export type AppTab = 'fileScanner' | 'results' | 'history' | 'reports';

const App: React.FC = () => {
  const [results, setResults] = useState<PageScanResult[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>('fileScanner');
  const [lastBatch, setLastBatch] = useState<PageScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Load from Database
  useEffect(() => {
    const initPersistence = async () => {
      try {
        const loadedResults = await DBService.getAllScans();
        setResults(loadedResults);

        const savedActiveBatchId = localStorage.getItem('a11y-active-batch-id');
        const savedActiveTab = localStorage.getItem('a11y-active-tab') as AppTab;

        if (savedActiveBatchId && loadedResults.length > 0) {
          const activeBatch = loadedResults.filter(r => r.batchId === savedActiveBatchId);
          if (activeBatch.length > 0) {
            setLastBatch(activeBatch);
            if (savedActiveTab) setActiveTab(savedActiveTab);
          }
        }
      } catch (e) {
        console.error("Database initialization failed", e);
      } finally {
        setIsLoading(false);
      }
    };

    initPersistence();
  }, []);

  // Persist App States (UI states stay in localStorage for sync access)
  useEffect(() => {
    if (lastBatch.length > 0) {
      localStorage.setItem('a11y-active-batch-id', lastBatch[0].batchId);
    }
    localStorage.setItem('a11y-active-tab', activeTab);
  }, [activeTab, lastBatch]);

  const handleScanComplete = async (newResults: PageScanResult[]) => {
    const updated = [...newResults, ...results];
    setResults(updated);
    setLastBatch(newResults);
    
    try {
      await DBService.saveScans(newResults);
      localStorage.setItem('a11y-active-batch-id', newResults[0].batchId);
    } catch (e) {
      console.error("Failed to persist scans to database", e);
      alert("Database error: Could not save scan data.");
    }
    
    if (newResults.length > 0) {
      setActiveTab('results');
    }
  };

  const handleViewDetails = (scan: PageScanResult) => {
    setLastBatch([scan]);
    setActiveTab('results');
  };

  const handleViewBatch = (batch: PageScanResult[]) => {
    setLastBatch(batch);
    setActiveTab('results');
  };

  const deleteScan = async (scanId: string) => {
    try {
      await DBService.deleteScan(scanId);
      const updated = results.filter(r => r.scanId !== scanId);
      setResults(updated);
      
      if (lastBatch.some(b => b.scanId === scanId)) {
        setLastBatch(prev => prev.filter(b => b.scanId !== scanId));
      }
    } catch (e) {
      console.error("Failed to delete scan", e);
    }
  };

  const clearHistory = async () => {
    if (window.confirm("Are you sure you want to delete ALL scan data? This cannot be undone.")) {
      try {
        await DBService.clearAll();
        setResults([]);
        setLastBatch([]);
        localStorage.removeItem('a11y-active-batch-id');
        localStorage.removeItem('a11y-active-tab');
        setActiveTab('fileScanner');
      } catch (e) {
        console.error("Failed to clear database", e);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Opening Audit Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Header activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      
      <main className="flex-grow w-full mx-auto px-4 py-8">
         {activeTab === 'fileScanner' && (
          <div className="space-y-8">
            <FileScanner onComplete={handleScanComplete} />
          </div>
        )}
        {activeTab === 'results' && <ResultsView scans={lastBatch} />}
        {activeTab === 'history' && (
          <HistoryView 
            results={results} 
            onViewDetails={handleViewDetails} 
            onDeleteScan={deleteScan}
            onClear={clearHistory} 
          />
        )}
        {activeTab === 'reports' && (
          <ReportsView 
            results={results} 
            onViewDetails={handleViewDetails} 
            onViewBatch={handleViewBatch} 
            onDeleteScan={deleteScan}
          />
        )} 
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 text-center text-slate-500 dark:text-slate-400 text-sm no-print transition-colors">
        <p className="font-bold tracking-tight">© 2026 A11y ComplianceEdge</p>
        <p className="text-[10px] mt-1 opacity-50 uppercase tracking-[0.2em]">Powered by Ampera Technologies</p>
      </footer>
    </div>
  );
};

export default App;
