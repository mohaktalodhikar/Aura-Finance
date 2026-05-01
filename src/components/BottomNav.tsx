import React from 'react';
import { ViewState } from '../App';

interface BottomNavProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
}

export default function BottomNav({ currentView, setCurrentView }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-outline-variant/10 px-6 py-3 flex justify-between items-center z-50">
      <button 
        onClick={() => setCurrentView('overview')}
        className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 ${currentView === 'overview' ? 'text-secondary font-semibold' : 'text-slate-500 font-medium'}`}
      >
        <span className="material-symbols-outlined" style={currentView === 'overview' ? { fontVariationSettings: "'FILL' 1" } : {}}>dashboard</span>
        <span className="text-[10px]">Overview</span>
      </button>
      
      <button 
        onClick={() => setCurrentView('transactions')}
        className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 ${currentView === 'transactions' ? 'text-secondary font-semibold' : 'text-slate-500 font-medium'}`}
      >
        <span className="material-symbols-outlined" style={currentView === 'transactions' ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt_long</span>
        <span className="text-[10px]">History</span>
      </button>
      
      <div className="relative -top-6">
        <button 
          onClick={() => setCurrentView('budgets')}
          className="w-14 h-14 bg-secondary rounded-full shadow-lg shadow-secondary/40 text-white flex items-center justify-center active:scale-90 hover:brightness-110 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>
      
      <button 
        onClick={() => setCurrentView('insights')}
        className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 ${currentView === 'insights' ? 'text-secondary font-semibold' : 'text-slate-500 font-medium'}`}
      >
        <span className="material-symbols-outlined" style={currentView === 'insights' ? { fontVariationSettings: "'FILL' 1" } : {}}>psychology</span>
        <span className="text-[10px]">Insights</span>
      </button>
      
      <button 
        onClick={() => setCurrentView('settings')}
        className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 ${currentView === 'settings' ? 'text-secondary font-semibold' : 'text-slate-500 font-medium'}`}
      >
        <span className="material-symbols-outlined" style={currentView === 'settings' ? { fontVariationSettings: "'FILL' 1" } : {}}>settings</span>
        <span className="text-[10px]">Settings</span>
      </button>
    </nav>
  );
}
