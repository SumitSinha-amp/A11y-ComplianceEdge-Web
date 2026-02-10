
import React, { useEffect, useState } from 'react';
import { AppTab } from '../App';
import logoA11y from '../assets/logo-a11y.png';
interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('a11y-theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('a11y-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className=" p-2 rounded-xl ">
           <img src={logoA11y} height="180" width="180" alt="app-logo"></img>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Web Accessibility Accelerator</p>
            {/*<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>*/}
          </div>
         {/* <div className="hidden sm:block">
            <h1 className="font-black text-base text-slate-900 dark:text-white leading-none tracking-tight">A11y ComplianceEdge</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Web Accessibility Accelerator</p>
          </div>*/}
        </div>

        <nav className="flex items-center gap-6">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => onTabChange('fileScanner')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'fileScanner' ? 'bg-white dark:bg-slate-700 text-[#9c369a] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Scan
            </button>
            <button
              onClick={() => onTabChange('reports')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'reports' ? 'bg-white dark:bg-slate-700 text-[#9c369a] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Scorecards
            </button>
            <button
              onClick={() => onTabChange('history')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-[#9c369a] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              History
            </button>
          </div>

          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
