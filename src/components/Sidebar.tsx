import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { ViewState } from '../App';
import { useData } from '../context/DataContext';

interface SidebarProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
}

export default function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const { totalBalance, formatCurrency } = useData();
  const navItems: { id: ViewState; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'transactions', label: 'Transactions', icon: 'receipt_long' },
    { id: 'budgets', label: 'Budgets', icon: 'account_balance_wallet' },
    { id: 'insights', label: 'AI Insights', icon: 'psychology' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex-col p-4 gap-2 z-40 hidden md:flex">
      <div className="px-2 py-6 mb-4 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-sm">account_balance</span>
        </div>
        <div>
          <h1 className="text-lg font-black text-primary tracking-tight font-headline leading-tight">Aura Finance</h1>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-0.5">Premium Tier</p>
        </div>
      </div>
      
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-headline transition-all duration-200 active:scale-95 text-left ${
                isActive
                  ? 'bg-surface-container-low text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary font-medium'
              }`}
            >
              <span 
                className="material-symbols-outlined" 
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <div className="p-4 bg-primary rounded-xl text-white overflow-hidden relative group shadow-sm">
          <div className="relative z-10">
            <p className="text-xs text-slate-300 font-medium mb-1">Total Assets</p>
            <p className="text-lg font-bold font-headline">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-secondary/20 rounded-full blur-2xl"></div>
        </div>
        
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-headline transition-all duration-200 active:scale-95 text-left text-on-surface-variant hover:bg-red-50 hover:text-error font-medium mt-2"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
