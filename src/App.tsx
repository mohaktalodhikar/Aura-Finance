import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import BottomNav from './components/BottomNav';
import Login from './views/Login';
import Overview from './views/Overview';
import Transactions from './views/Transactions';
import Budgets from './views/Budgets';
import Insights from './views/Insights';
import Settings from './views/Settings';
import { DataProvider, useData } from './context/DataContext';

export type ViewState = 'overview' | 'transactions' | 'budgets' | 'insights' | 'settings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('overview');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Ignore auth state changes if we are in the middle of a signup flow
      // to prevent the main app from flashing before we sign them out.
      if (sessionStorage.getItem('isSigningUp') === 'true') {
        return;
      }
      setIsAuthenticated(!!user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex gap-2">
          <div className="h-2 w-2 bg-secondary rounded-full animate-bounce"></div>
          <div className="h-2 w-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="h-2 w-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <DataProvider>
      <MainLayout currentView={currentView} setCurrentView={setCurrentView} />
    </DataProvider>
  );
}

function MainLayout({ currentView, setCurrentView }: { currentView: ViewState, setCurrentView: (v: ViewState) => void }) {
  const { loading } = useData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center animate-pulse shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div className="flex gap-2">
            <div className="h-2 w-2 bg-secondary rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-2 w-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest animate-pulse">Initializing Your Ledger</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'overview': return <Overview />;
      case 'transactions': return <Transactions />;
      case 'budgets': return <Budgets />;
      case 'insights': return <Insights />;
      case 'settings': return <Settings />;
      default: return <Overview />;
    }
  };

  return (
    <div className="bg-background font-body text-on-background selection:bg-secondary-container antialiased min-h-screen flex">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col pb-24 md:pb-0 transition-all duration-500">
        <TopNav currentView={currentView} />
        <div className="flex-1">
          {renderView()}
        </div>
      </main>
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
    </div>
  );
}
