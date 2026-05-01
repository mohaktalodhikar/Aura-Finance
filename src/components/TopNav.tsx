import React, { useState, useRef, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { ViewState } from '../App';
import { useData } from '../context/DataContext';

interface TopNavProps {
  currentView: ViewState;
}

export default function TopNav({ currentView }: TopNavProps) {
  const { transactions, budgets, goals, formatCurrency } = useData();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newNotifs: any[] = [];
    
    // 1. Large transactions (last 30 days, > $500)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    transactions.forEach(tx => {
      if (Math.abs(tx.amount) >= 500 && new Date(tx.date) >= thirtyDaysAgo) {
        newNotifs.push({
          id: `tx-${tx.id}`,
          title: 'Large Transaction',
          message: `A transaction of ${formatCurrency(Math.abs(tx.amount))} was made at ${tx.merchant}.`,
          time: new Date(tx.date).toLocaleDateString(),
          read: false,
          timestamp: new Date(tx.date).getTime()
        });
      }
    });

    // 2. Budget Warnings
    budgets.forEach(b => {
      const spent = transactions
        .filter(t => t.category === b.category && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      if (spent >= b.limit * 0.8) {
        newNotifs.push({
          id: `budget-${b.id}`,
          title: 'Budget Warning',
          message: `You have reached ${Math.round((spent/b.limit)*100)}% of your ${b.category} budget.`,
          time: 'Recent',
          read: false,
          timestamp: Date.now() - 1000 // slightly offset so it sorts well
        });
      }
    });

    // 3. Goal Milestones
    goals.forEach(g => {
      if (g.currentAmount >= g.targetAmount * 0.5) {
        newNotifs.push({
          id: `goal-${g.id}`,
          title: 'Goal Milestone',
          message: `You are ${Math.round((g.currentAmount/g.targetAmount)*100)}% of the way to your ${g.name} goal!`,
          time: 'Recent',
          read: false,
          timestamp: Date.now() - 2000
        });
      }
    });

    // Sort by timestamp descending
    newNotifs.sort((a, b) => b.timestamp - a.timestamp);

    // Merge with existing read state
    setNotifications(prev => {
      const prevRead = new Set(prev.filter(n => n.read).map(n => n.id));
      return newNotifs.map(n => ({ ...n, read: prevRead.has(n.id) }));
    });
  }, [transactions, budgets, goals]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getTitle = () => {
    switch (currentView) {
      case 'overview': return 'Overview';
      case 'transactions': return 'Transactions';
      case 'budgets': return 'Budget Planning';
      case 'insights': return 'AI Insights';
      case 'settings': return 'Settings';
      default: return 'Aura Finance';
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const photoURL = auth.currentUser?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuCPeEDy9uY4AqMOW-bwQTnYw6uv2iUtLj0b9Y0mQARB3GT-2lKt6oh190aXf7NxkgHgt5fsDE6D1LUbnnHFVlfPMN8uMS2gvwaCAsuF5ugfHn6VQ8KbVBVO2l0jQf7lF0HwWBFLL9-Ujzp0RE560H__wf2wDOuFNyuvzOpiMN3GROkesuvVEciZf2QSF-JzfG_ksmTQ4EPaKL86RFvIw4plM7-w0RTH0FINXrzMjGAmRkOpEe2zvEYNxNTn6v4bdbmfgG6awJuS8w";

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-transparent transition-all duration-300">
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-xl font-bold tracking-tighter text-slate-900 font-headline hidden lg:block mr-4">
          {getTitle()}
        </h1>
        <div className="relative max-w-md w-full group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-sm transition-colors group-focus-within:text-secondary">search</span>
          <input 
            type="text" 
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-2 focus:ring-secondary/20 placeholder:text-on-surface-variant/40 transition-all outline-none" 
            placeholder="Search analytics..." 
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 active:scale-90 transition-all duration-200 text-slate-700 hover:text-slate-900 relative"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs font-bold text-secondary hover:text-secondary-fixed transition-colors">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No notifications</div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      onClick={() => markAsRead(notification.id)}
                      className={`p-4 border-b border-outline-variant/5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notification.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notification.read ? 'bg-secondary' : 'bg-transparent'}`}></div>
                      <div>
                        <h4 className={`text-sm mb-0.5 ${!notification.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{notification.title}</h4>
                        <p className="text-xs text-slate-500 mb-1 leading-relaxed">{notification.message}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{notification.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm cursor-pointer hover:border-secondary/30 active:scale-90 transition-all duration-200 group">
          <img 
            src={photoURL} 
            alt="User Profile" 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
            referrerPolicy="no-referrer"
          />
        </button>
        <button 
          onClick={handleSignOut}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 active:scale-90 transition-all duration-200 text-slate-500 hover:text-red-600 md:hidden"
          title="Sign Out"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  );
}
