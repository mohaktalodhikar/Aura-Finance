import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useData } from '../context/DataContext';
import { TrendingUp, Flag, Trash2, Edit2, Plus, X } from 'lucide-react';

export default function Overview() {
  const { totalBalance, monthlyIncome, monthlyExpenses, transactions, goals, formatCurrency, convertToBaseCurrency, convertFromBaseCurrency } = useData();
  const recentTransactions = transactions.slice(0, 3);
  
  // Market Outlook State
  const [usMarket, setUsMarket] = useState({ percentage: 0, trend: 'Loading...', bars: [20, 20, 20, 20, 20, 20] });
  const [indiaMarket, setIndiaMarket] = useState({ percentage: 0, trend: 'Loading...', bars: [20, 20, 20, 20, 20, 20] });
  const [marketError, setMarketError] = useState<string | null>(null);
  
  // Goal Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // Insight State
  const [isInsightApplied, setIsInsightApplied] = useState(false);
  const [isApplyingInsight, setIsApplyingInsight] = useState(false);

  useEffect(() => {
    const fetchMarketData = async () => {
      const apiKey = (import.meta as any).env.VITE_FINNHUB_API_KEY;
      if (!apiKey) {
        // High-fidelity stable simulation as requested
        setUsMarket({ percentage: 1.24, trend: 'Bullish', bars: [40, 35, 52, 48, 65, 90] });
        setIndiaMarket({ percentage: 0.86, trend: 'Bullish', bars: [35, 45, 42, 58, 62, 88] });
        return;
      }
      try {
        const [usRes, indiaRes] = await Promise.all([
          fetch(`https://finnhub.io/api/v1/quote?symbol=SPY&token=${apiKey}`),
          fetch(`https://finnhub.io/api/v1/quote?symbol=INDA&token=${apiKey}`)
        ]);
        
        if (!usRes.ok || !indiaRes.ok) throw new Error('Failed to fetch');
        
        const usData = await usRes.json();
        const indiaData = await indiaRes.json();
        
        const processData = (data: any) => {
          const dp = data.dp || 0;
          const trend = dp > 0 ? 'Bullish' : 'Bearish';
          const bars = Array.from({ length: 6 }, () => Math.floor(Math.random() * 80) + 20);
          if (dp > 0) bars[5] = 90;
          else bars[5] = 20;
          return { percentage: parseFloat(dp.toFixed(2)), trend, bars };
        };

        setUsMarket(processData(usData));
        setIndiaMarket(processData(indiaData));
      } catch (err) {
        console.error(err);
        setMarketError('Market offline');
      }
    };

    fetchMarketData();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTarget || !goalCurrent || !goalDeadline) return;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const parsedTarget = parseFloat(goalTarget);
      const parsedCurrent = parseFloat(goalCurrent);
      const baseTarget = convertToBaseCurrency(parsedTarget);
      const baseCurrent = convertToBaseCurrency(parsedCurrent);

      if (isEditingGoal && activeGoal) {
        await updateDoc(doc(db, 'goals', activeGoal.id), {
          name: goalName,
          targetAmount: baseTarget,
          currentAmount: baseCurrent,
          deadline: goalDeadline
        });
      } else {
        await addDoc(collection(db, 'goals'), {
          userId: user.uid,
          name: goalName,
          targetAmount: baseTarget,
          currentAmount: baseCurrent,
          deadline: goalDeadline
        });
      }

      setShowGoalModal(false);
      resetGoalForm();
    } catch (error) {
      console.error("Error saving goal:", error);
      alert("Failed to save goal.");
    }
  };

  const resetGoalForm = () => {
    setGoalName('');
    setGoalTarget('');
    setGoalCurrent('');
    setGoalDeadline('');
    setIsEditingGoal(false);
  };

  const openEditGoal = () => {
    if (!activeGoal) return;
    setGoalName(activeGoal.name);
    // Convert back from base currency and use toFixed(2) to avoid drift
    setGoalTarget(convertFromBaseCurrency(activeGoal.targetAmount).toFixed(2));
    setGoalCurrent(convertFromBaseCurrency(activeGoal.currentAmount).toFixed(2));
    setGoalDeadline(activeGoal.deadline);
    setIsEditingGoal(true);
    setShowGoalModal(true);
  };

  const handleDeleteGoal = async () => {
    if (!activeGoal) return;
    
    try {
      console.log("Deleting goal:", activeGoal.id);
      await deleteDoc(doc(db, 'goals', activeGoal.id));
    } catch (error: any) {
      console.error("Error deleting goal:", error);
    }
  };

  const handleApplyRecommendation = () => {
    setIsApplyingInsight(true);
    setTimeout(() => {
      setIsApplyingInsight(false);
      setIsInsightApplied(true);
    }, 1000);
  };

  const activeGoal = goals.length > 0 ? goals[0] : null;
  const goalProgress = activeGoal ? Math.min(Math.round((activeGoal.currentAmount / activeGoal.targetAmount) * 100), 100) : 0;
  
  const strokeDashoffset = activeGoal ? 552.92 - (552.92 * goalProgress) / 100 : 552.92;

  // Calculate Spending Breakdown
  const expensesByCategory = transactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const totalExpensesForBreakdown = (Object.values(expensesByCategory) as number[]).reduce((a: number, b: number) => a + b, 0);
  
  const spendingBreakdown = (Object.entries(expensesByCategory) as [string, number][])
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpensesForBreakdown > 0 ? Math.round((amount / totalExpensesForBreakdown) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3); // Top 3 categories

  // Calculate 6-month chart data
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthName = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    let income = 0;
    let expense = 0;
    
    transactions.forEach(t => {
      const txDate = new Date(t.date);
      if (txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear()) {
        if (t.amount > 0) income += t.amount;
        else expense += Math.abs(t.amount);
      }
    });

    return { month: monthName, income, expense };
  });

  const maxChartValue = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1); // Avoid division by zero

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section: Bento Grid Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <div className="lg:col-span-2 rounded-3xl p-8 bg-primary text-white relative overflow-hidden flex flex-col justify-between min-h-[320px] transition-transform duration-300 hover:shadow-2xl">
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-on-primary-container font-headline font-bold text-sm tracking-widest uppercase">Total Balance</h1>
                <p className="text-5xl md:text-6xl font-headline font-extrabold mt-2 tracking-tighter">{formatCurrency(totalBalance)}</p>
              </div>
              <button className="bg-secondary/20 px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-secondary/30 transition-colors active:scale-95">
                <span className="material-symbols-outlined text-secondary text-sm">trending_up</span>
                <span className="text-secondary text-xs font-bold">+12.5%</span>
              </button>
            </div>
          </div>
          <div className="relative z-10 flex flex-wrap gap-8 mt-12">
            <div className="space-y-1 cursor-default hover:opacity-80 transition-opacity">
              <p className="text-on-primary-container text-xs font-medium uppercase tracking-wider">Monthly Income</p>
              <p className="text-xl font-headline font-bold">{formatCurrency(monthlyIncome)}</p>
            </div>
            <div className="space-y-1 cursor-default hover:opacity-80 transition-opacity">
              <p className="text-on-primary-container text-xs font-medium uppercase tracking-wider">Monthly Expenses</p>
              <p className="text-xl font-headline font-bold">{formatCurrency(monthlyExpenses)}</p>
            </div>
            <div className="space-y-1 cursor-default hover:opacity-80 transition-opacity">
              <p className="text-on-primary-container text-xs font-medium uppercase tracking-wider">Active Portfolio</p>
              <p className="text-xl font-headline font-bold">14 Entities</p>
            </div>
          </div>
          {/* Decorative Element */}
          <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none transition-transform duration-1000 group-hover:scale-110">
            <svg width="400" height="200" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 200C50 150 100 180 150 130C200 80 250 100 300 50C350 0 400 20 400 20V200H0Z" fill="url(#paint0_linear)"></path>
              <defs>
                <linearGradient id="paint0_linear" x1="200" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6cf8bb"></stop>
                  <stop offset="1" stopColor="#6cf8bb" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        
        {/* Savings Goal Progress Card */}
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-6 transition-transform duration-300 hover:shadow-xl group cursor-default relative">
          {activeGoal ? (
            <>
              <h3 className="font-headline font-bold text-slate-900">{activeGoal.name}</h3>
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-surface-container-low"></circle>
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="552.92" strokeDashoffset={strokeDashoffset} className="text-secondary stroke-round transition-all duration-1000 group-hover:stroke-[14px]"></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <span className="text-3xl font-headline font-extrabold text-slate-900">{goalProgress}%</span>
                  <span className="text-xs text-on-surface-variant font-medium">Progress</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-headline font-bold text-slate-900">{formatCurrency(activeGoal.currentAmount)} / {formatCurrency(activeGoal.targetAmount)}</p>
                <p className="text-sm text-on-surface-variant">Estimated completion: {new Date(activeGoal.deadline).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-3xl">flag</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-slate-900 mb-1">No Active Goals</h3>
                <p className="text-sm text-on-surface-variant">Set a financial goal to track your progress.</p>
              </div>
              <button 
                onClick={() => setShowGoalModal(true)}
                className="px-6 py-2 bg-primary-container text-white rounded-full font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
              >
                Set a Goal
              </button>
            </div>
          )}
          {activeGoal && (
            <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={handleDeleteGoal}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                title="Delete Goal"
              >
                <Trash2 size={14} />
              </button>
              <button 
                onClick={openEditGoal}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                title="Edit Goal"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => { resetGoalForm(); setShowGoalModal(true); }}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                title="Add New Goal"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Section: Transactions & Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 transition-all hover:shadow-lg">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-xl font-headline font-extrabold text-slate-900 tracking-tight">Income vs Expenses</h2>
                <p className="text-sm text-on-surface-variant">Activity for the last 6 months</p>
              </div>
              <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  <span>Income</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                  <span>Expense</span>
                </div>
              </div>
            </div>
            
            {/* Visual Bar Chart */}
            <div className="flex items-end justify-between h-64 px-4">
              {chartData.map((data, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                  <div className="flex gap-1 items-end h-full w-full justify-center">
                    <div className="w-4 bg-secondary rounded-t-sm transition-all duration-300 group-hover:brightness-110 group-hover:w-5" style={{ height: `${(data.income / maxChartValue) * 100}%` }}></div>
                    <div className="w-4 bg-primary rounded-t-sm transition-all duration-300 group-hover:brightness-110 group-hover:w-5" style={{ height: `${(data.expense / maxChartValue) * 100}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant transition-colors group-hover:text-slate-900">{data.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-headline font-extrabold text-slate-900 tracking-tight">Recent Transactions</h2>
              <button className="text-secondary text-sm font-bold hover:underline hover:text-on-tertiary-container transition-colors active:scale-95">View All</button>
            </div>
            <div className="glass-card overflow-hidden divide-y divide-slate-50">
              {recentTransactions.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No recent transactions.</div>
              ) : (
                recentTransactions.map((tx) => (
                  <button key={tx.id} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-all duration-200 group text-left">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        tx.category === 'Income' ? 'bg-secondary-container/20 text-secondary group-hover:bg-secondary-container/30' : 'bg-slate-100 text-slate-900 group-hover:bg-slate-200'
                      }`}>
                        <span className="material-symbols-outlined">
                          {tx.category === 'Income' ? 'payments' : tx.category === 'Dining Out' ? 'restaurant' : 'shopping_bag'}
                        </span>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-slate-900 group-hover:text-secondary transition-colors">{tx.merchant}</p>
                        <p className="text-xs text-on-surface-variant font-medium">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className={`font-headline font-bold group-hover:scale-110 transition-transform ${tx.amount > 0 ? 'text-secondary' : 'text-slate-900'}`}>
                      {tx.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Stats */}
        <div className="space-y-8 h-full">
          {/* Growth Micro-Widgets */}
          <div className="grid grid-cols-2 gap-4">
            {/* Market Widget Component */}
            <MarketWidget title="US Market" data={usMarket} formatCurrency={formatCurrency} />
            <MarketWidget title="India Market" data={indiaMarket} formatCurrency={formatCurrency} />
          </div>

          {/* Spending Breakdown */}
          <div className="glass-card rounded-3xl p-8 space-y-6 hover:shadow-md transition-shadow cursor-default">
            <h3 className="font-headline font-bold text-slate-900">Spending Breakdown</h3>
            <div className="space-y-4">
              {spendingBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No expenses recorded yet.</p>
              ) : (
                spendingBreakdown.map((item, index) => {
                  const colors = [
                    { text: 'text-secondary', bg: 'bg-secondary', hover: 'group-hover:text-secondary' },
                    { text: 'text-primary-container', bg: 'bg-primary-container', hover: 'group-hover:text-primary-container' },
                    { text: 'text-slate-600', bg: 'bg-slate-400', hover: 'group-hover:text-slate-600' }
                  ];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={item.category} className="space-y-2 group">
                      <div className={`flex justify-between text-[11px] font-bold uppercase tracking-widest transition-colors ${color.hover}`}>
                        <span className={`text-slate-900 ${color.hover}`}>{item.category}</span>
                        <span className="text-on-surface-variant font-black">{item.percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
                        <div className={`h-full ${color.bg} transition-all duration-700 group-hover:brightness-110`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 relative">
            <button 
              onClick={() => { setShowGoalModal(false); setIsEditingGoal(false); }}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-headline font-bold text-primary-container mb-6">{isEditingGoal ? 'Edit Goal' : 'Set New Goal'}</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Goal Name</label>
                <input 
                  type="text" 
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  readOnly={isEditingGoal}
                  required 
                  placeholder="e.g. Travel, Savings" 
                  className={`w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all ${isEditingGoal ? 'opacity-70 cursor-not-allowed bg-slate-50' : ''}`} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Amount</label>
                  <input 
                    type="number" 
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    readOnly={isEditingGoal}
                    required 
                    placeholder="0.00" 
                    className={`w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all ${isEditingGoal ? 'opacity-70 cursor-not-allowed bg-slate-50' : ''}`} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Saved</label>
                  <input 
                    type="number" 
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    required 
                    placeholder="0.00" 
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Date</label>
                <input 
                  type="date" 
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  required 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                />
              </div>
              <button 
                type="submit"
                disabled={!goalName || !goalTarget || !goalCurrent || !goalDeadline}
                className="w-full py-4 mt-4 bg-primary-container text-white rounded-xl font-bold text-sm shadow-xl hover:brightness-125 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Goal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MarketWidget({ title, data, formatCurrency }: any) {
  return (
    <div className="w-full glass-card rounded-2xl p-4 flex flex-col gap-3 text-left transition-all hover:shadow-lg hover:border-primary/10">
      <div className="flex justify-between items-center">
        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
          data.trend === 'Bullish' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}>
          {data.trend}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-0.5 h-8">
          {data.bars.map((height: number, i: number) => (
            <div 
              key={i} 
              className={`w-full rounded-t-sm transition-all duration-500 ${data.trend === 'Bullish' ? 'bg-emerald-500' : 'bg-red-500'}`} 
              style={{ 
                height: `${height}%`, 
                opacity: 0.1 + (i * 0.18),
                transform: `scaleY(${0.8 + (i * 0.04)})`
              }}
            ></div>
          ))}
        </div>
        <div>
          <p className={`text-sm md:text-base font-headline font-black ${data.trend === 'Bullish' ? 'text-emerald-600' : 'text-red-600'}`}>
            {data.percentage > 0 ? '+' : ''}{data.percentage}%
          </p>
        </div>
      </div>
    </div>
  );
}
