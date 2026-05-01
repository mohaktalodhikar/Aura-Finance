import React, { useState } from 'react';
import { Trash2, Plus, X, AlertCircle, Loader2 } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useData } from '../context/DataContext';

export default function Budgets() {
  const { budgets, transactions, formatCurrency, convertToBaseCurrency } = useData();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const enhancedBudgets = budgets.map(b => {
    const spent = transactions
      .filter(t => t.category === b.name && t.amount < 0)
      .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    
    const percent = Math.min(Math.round((spent / b.limit) * 100), 100);
    const warning = percent >= 90;
    const remaining = b.limit - spent;
    
    let status = '';
    if (percent >= 100) status = '100% of budget used.';
    else if (warning) status = `Nearing limit. ${formatCurrency(remaining)} remaining.`;
    else status = `${percent}% used. Looking good!`;

    return {
      ...b,
      spent,
      percent,
      warning,
      status,
      type: 'Variable'
    };
  });

  const handleDeleteBudget = async (id: string | undefined) => {
    console.log("Delete button clicked for ID:", id);
    if (!id) return;
    
    try {
      setIsDeleting(id);
      const budgetRef = doc(db, 'budgets', id);
      await deleteDoc(budgetRef);
    } catch (error: any) {
      console.error("Failed to delete budget:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !newLimit) return;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const parsedLimit = parseFloat(newLimit);
      const baseLimit = convertToBaseCurrency(parsedLimit);

      await addDoc(collection(db, 'budgets'), {
        userId: user.uid,
        name: newCategory,
        limit: baseLimit,
        icon: 'category',
        color: 'blue'
      });
      setShowCreateModal(false);
      setNewCategory('');
      setNewLimit('');
    } catch (error) {
      console.error("Error creating budget:", error);
      alert("Failed to create budget.");
    }
  };

  const totalLimit = enhancedBudgets.reduce((acc, curr) => acc + curr.limit, 0);
  const totalSpent = enhancedBudgets.reduce((acc, curr) => acc + curr.spent, 0);
  const totalPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <div className="p-8 flex flex-col gap-8 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* Header & Global Budget Status */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1">
          <h1 className="text-4xl font-black text-primary font-headline tracking-tighter mb-2">Budget Planner</h1>
          <p className="text-slate-500 font-medium">Manage your spending limits and track your progress.</p>
        </div>
        
        {/* Global Budget Card */}
        <div className="w-full lg:w-96 glass-card p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <span className="text-slate-500 text-xs font-bold tracking-widest uppercase block mb-1">Total Budget</span>
                <span className="text-3xl font-black text-primary font-headline tracking-tighter">{formatCurrency(totalLimit)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-xs font-bold tracking-widest uppercase block mb-1">Spent</span>
                <span className="text-xl font-black text-slate-700 font-headline tracking-tighter">{formatCurrency(totalSpent)}</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-3 bg-surface-container-high rounded-full overflow-hidden mb-2">
              <div className="h-full bg-secondary rounded-full relative transition-all duration-1000" style={{ width: `${totalPercent}%` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span className="text-secondary">{totalPercent}% Used</span>
              <span className="text-slate-400">{formatCurrency(totalLimit - totalSpent)} Remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {enhancedBudgets.length === 0 && (
          <div className="col-span-full text-center p-12 text-slate-500">
            No budgets found. Create one to start tracking!
          </div>
        )}
        
        {enhancedBudgets.map(budget => (
          <div key={budget.id} className={`glass-card p-6 ${budget.warning ? 'border-orange-200' : ''} hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden`}>
            {budget.warning && <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined text-2xl">{budget.icon || 'category'}</span>
                </div>
                <div>
                  <h3 className="font-bold text-primary text-lg">{budget.name}</h3>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{budget.type}</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteBudget(budget.id);
                }}
                disabled={isDeleting === budget.id}
                className="p-3 hover:bg-red-100 rounded-full text-slate-400 hover:text-red-600 transition-all disabled:opacity-50 relative z-30 flex items-center justify-center"
                title="Delete Budget"
              >
                {isDeleting === budget.id ? (
                  <Loader2 size={20} className="animate-spin text-red-600" />
                ) : (
                  <Trash2 size={20} />
                )}
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <span className={`text-2xl font-black ${budget.warning ? 'text-orange-600' : 'text-primary'} font-headline tracking-tighter`}>{formatCurrency(budget.spent)}</span>
                <span className="text-sm font-bold text-slate-400">/ {formatCurrency(budget.limit)}</span>
              </div>
              {/* Progress Bar */}
              <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className={`h-full bg-${budget.color}-500 rounded-full relative transition-all duration-1000`} style={{ width: `${budget.percent}%` }}>
                  {!budget.warning && budget.percent > 0 && budget.percent < 100 && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse"></div>
                  )}
                </div>
              </div>
            </div>
            <p className={`text-xs font-bold flex items-center gap-1 ${budget.warning ? 'text-orange-600' : 'text-slate-500 font-medium'}`}>
              {budget.warning && <span className="material-symbols-outlined text-[14px]">warning</span>}
              {budget.status}
            </p>
          </div>
        ))}

        {/* Add New Budget Card */}
        <div 
          onClick={() => setShowCreateModal(true)}
          className="bg-surface-container-low/50 border-2 border-dashed border-outline-variant/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container-low hover:border-secondary transition-all group min-h-[220px]"
        >
          <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-secondary/10 transition-all">
            <Plus size={32} className="text-slate-400 group-hover:text-secondary" />
          </div>
          <h3 className="font-bold text-primary-container text-lg mb-1">Create Budget</h3>
          <p className="text-xs text-slate-500">Set limits for a new category</p>
        </div>

      </div>


      {/* Create Budget Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-primary-container font-headline">Create New Budget</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Category Name</label>
                <input 
                  type="text" 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  required 
                  placeholder="e.g. Travel" 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Monthly Limit</label>
                <input 
                  type="number" 
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  required 
                  placeholder="0.00" 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                />
              </div>
              <button 
                type="submit"
                disabled={!newCategory || !newLimit}
                className="w-full py-4 mt-4 bg-primary-container text-white rounded-xl font-bold text-sm shadow-xl hover:brightness-125 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Budget
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
