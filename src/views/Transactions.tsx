import React, { useState, useEffect } from 'react';
import { Search, Filter, Trash2, Plus, X, ChevronLeft, ChevronRight, FileDown, Calendar, ShoppingCart, Utensils, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useData } from '../context/DataContext';

export default function Transactions() {
  const { transactions, monthlyExpenses, formatCurrency, convertToBaseCurrency } = useData();
  const [activeCategory, setActiveCategory] = useState('All');
  const [isFiltering, setIsFiltering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [dateRange, setDateRange] = useState('Past 30 Days');
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(5000);
  const maxLimit = 5000;

  // New Transaction State
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [isAdding, setIsAdding] = useState(false);

  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxAmount - 100);
    setMinAmount(value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minAmount + 100);
    setMaxAmount(value);
  };

  const categories = ['All', 'Groceries', 'Income', 'Shopping', 'Travel', 'Health', '+ 12 more'];

  const handleApplyFilters = () => {
    setIsFiltering(true);
    setTimeout(() => setIsFiltering(false), 800);
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 1500);
  };

  const handleAddTransaction = async () => {
    if (!merchant || !amount || !category) return;
    
    try {
      setIsAdding(true);
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const parsedAmount = parseFloat(amount);
      const baseAmount = convertToBaseCurrency(parsedAmount);

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        merchant,
        amount: category === 'Income' ? Math.abs(baseAmount) : -Math.abs(baseAmount),
        category,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });

      setShowAddModal(false);
      setMerchant('');
      setAmount('');
      setCategory('Groceries');
      // In a real app, you would also fetch the updated list here or rely on onSnapshot
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Failed to add transaction. Check console for details.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTransaction = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    try {
      console.log("Deleting transaction:", id);
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
    }
  };

  const largestPurchase = transactions.reduce((min, t) => (t.amount < (min?.amount ?? 0) ? t : min), transactions[0] || { amount: 0, merchant: 'None' });
  const categorizedItemsCount = transactions.filter(t => t.category && t.category !== 'Uncategorized').length;

  const filteredTransactions = transactions.filter(tx => {
    const amountMatch = Math.abs(tx.amount) >= minAmount && Math.abs(tx.amount) <= maxAmount;
    const categoryMatch = activeCategory === 'All' || tx.category === activeCategory;
    const searchMatch = tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    return amountMatch && categoryMatch && searchMatch;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  
  // Ensure activePage is within bounds
  useEffect(() => {
    if (activePage > totalPages) setActivePage(totalPages);
  }, [totalPages, activePage]);

  const paginatedTransactions = filteredTransactions.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* Search and Filter Toggle for Mobile */}
      <div className="flex md:hidden items-center gap-2 mb-2">
        <div className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search transactions..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full" 
          />
        </div>
        <button 
          onClick={() => setShowFilterDrawer(true)}
          className="p-2.5 bg-primary-container text-white rounded-xl shadow-md"
        >
          <Filter size={16} />
        </button>
      </div>

        {/* Desktop View (Table + Sidebar) */}
        {!isMobile && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              <HighlightCard title="Monthly Outflow" value={formatCurrency(monthlyExpenses)} />
              <HighlightCard title="Largest Purchase" value={formatCurrency(Math.abs(largestPurchase.amount))} subtitle={largestPurchase.merchant} />
              <HighlightCard title="Categorized items" value={categorizedItemsCount} subtitle="Identified" color="text-emerald-600" />
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Date</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Merchant</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Category</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Amount</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No transactions found matching your filters.</td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors cursor-pointer group active:bg-slate-100">
                          <td className="px-6 py-6 text-sm text-slate-500 font-medium">
                            {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center group-hover:scale-105 transition-transform">
                                <span className="material-symbols-outlined text-slate-600">
                                  {tx.category === 'Income' ? 'payments' : tx.category === 'Dining Out' ? 'restaurant' : 'shopping_cart'}
                                </span>
                              </div>
                              <span className="font-bold text-primary-container text-sm">{tx.merchant}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider hover:brightness-95 transition-all ${
                              tx.category === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary-container text-on-secondary-container'
                            }`}>
                              {tx.category}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <span className={`font-black font-headline ${tx.amount > 0 ? 'text-emerald-600' : 'text-primary-container'}`}>
                              {tx.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <button 
                              type="button"
                              onClick={(e) => handleDeleteTransaction(e, tx.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete Transaction"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 flex justify-between items-center border-t border-outline-variant/10">
                <span className="text-xs text-slate-400 font-medium">
                  Showing {filteredTransactions.length === 0 ? 0 : (activePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(activePage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
                </span>
                <Pagination activePage={activePage} setActivePage={setActivePage} totalPages={totalPages} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile View */}
        {isMobile && (
          <div className="flex-1 flex flex-col gap-6">
            {/* Mobile Highlights */}
            <div className="grid grid-cols-2 gap-4">
               <HighlightCard title="Outflow" value={formatCurrency(monthlyExpenses)} compact />
               <HighlightCard title="Cards" value={categorizedItemsCount} subtitle="Items" compact />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Activity</h3>
                 <span className="text-[10px] text-slate-400 font-medium">{filteredTransactions.length} total</span>
              </div>
              {paginatedTransactions.length === 0 ? (
                <div className="glass-card p-12 text-center text-slate-400 text-sm">No records found.</div>
              ) : (
                paginatedTransactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="glass-card p-4 flex items-center justify-between group active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                        tx.category === 'Income' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-surface-container-high border-outline-variant/10 text-slate-600'
                      }`}>
                        <span className="material-symbols-outlined text-xl">
                          {tx.category === 'Income' ? 'trending_up' : tx.category === 'Dining Out' ? 'restaurant' : 'shopping_bag'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-primary-container text-sm truncate max-w-[120px]">{tx.merchant}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{tx.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`font-black font-headline text-sm ${tx.amount > 0 ? 'text-emerald-600' : 'text-primary-container'}`}>
                        {tx.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => handleDeleteTransaction(e, tx.id)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
              {totalPages > 1 && (
                <div className="flex justify-center mt-2 pb-4">
                  <Pagination activePage={activePage} setActivePage={setActivePage} totalPages={totalPages} compact />
                </div>
              )}
            </div>
          </div>
        )}
      
      {/* Filter Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-80 flex-col gap-6">
        <FilterContent 
          activeCategory={activeCategory} 
          setActiveCategory={setActiveCategory}
          dateRange={dateRange}
          setDateRange={setDateRange}
          minAmount={minAmount}
          maxAmount={maxAmount}
          handleMinChange={handleMinChange}
          handleMaxChange={handleMaxChange}
          maxLimit={maxLimit}
          handleApplyFilters={handleApplyFilters}
          isFiltering={isFiltering}
          formatCurrency={formatCurrency}
          categories={categories}
        />
        
        {/* Export Widget */}
        <div 
          onClick={handleExport}
          className="bg-primary-container p-6 rounded-2xl relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all active:scale-[0.99]"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <h4 className="text-white font-headline font-bold text-lg mb-2">Export Data</h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">Download your complete financial history in CSV or PDF format.</p>
            <div className="flex gap-2 items-center group/btn">
              <span className="material-symbols-outlined text-secondary group-hover/btn:translate-y-0.5 transition-transform">
                {isExporting ? 'check_circle' : 'file_download'}
              </span>
              <span className="text-white text-xs font-bold border-b border-secondary hover:text-secondary transition-colors">
                {isExporting ? 'Report Generated!' : 'Generate Report'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Filter Modal (Mobile) */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-background rounded-t-[2.5rem] p-6 animate-in slide-in-from-bottom duration-500">
            <div className="w-12 h-1 bg-outline-variant/20 rounded-full mx-auto mb-6" onClick={() => setShowFilterDrawer(false)}></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-primary font-headline">Filters</h3>
              <button 
                onClick={() => setShowFilterDrawer(false)}
                className="p-2 bg-surface-container-high rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <FilterContent 
              activeCategory={activeCategory} 
              setActiveCategory={setActiveCategory}
              dateRange={dateRange}
              setDateRange={setDateRange}
              minAmount={minAmount}
              maxAmount={maxAmount}
              handleMinChange={handleMinChange}
              handleMaxChange={handleMaxChange}
              maxLimit={maxLimit}
              handleApplyFilters={() => { handleApplyFilters(); setShowFilterDrawer(false); }}
              isFiltering={isFiltering}
              formatCurrency={formatCurrency}
              categories={categories}
            />
          </div>
        </div>
      )}

      {/* FAB */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 md:bottom-8 right-8 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 hover:rotate-90 active:scale-95 transition-all duration-300 group z-40"
      >
        <Plus size={24} className="group-hover:scale-110" />
      </button>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-primary font-headline">Add Entry</h2>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Merchant</label>
                <input 
                  type="text" 
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. Whole Foods" 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Amount</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" 
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all cursor-pointer"
                >
                  <option>Groceries</option>
                  <option>Dining Out</option>
                  <option>Entertainment</option>
                  <option>Utilities</option>
                  <option>Shopping</option>
                  <option>Travel</option>
                  <option>Health</option>
                  <option>Income</option>
                </select>
              </div>
              <button 
                onClick={handleAddTransaction}
                disabled={isAdding || !merchant || !amount}
                className="w-full py-4 mt-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Saving...
                  </>
                ) : (
                  'Confirm Transaction'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightCard({ title, value, subtitle, color, compact = false }: any) {
  return (
    <div className={`glass-card flex flex-col cursor-default hover:shadow-md transition-shadow ${compact ? 'p-4' : 'p-4 md:p-6'}`}>
      <span className={`text-slate-500 font-bold tracking-widest uppercase mb-1 ${compact ? 'text-[9px]' : 'text-[10px] md:text-xs md:mb-2'}`}>{title}</span>
      <div className="flex items-baseline gap-2">
        <span className={`font-black text-primary font-headline tracking-tighter ${compact ? 'text-lg' : 'text-lg md:text-3xl'}`}>{value}</span>
        {subtitle && <span className={`${color || 'text-slate-400'} font-medium ${compact ? 'text-[8px]' : 'text-[10px] md:text-xs'} truncate`}>{subtitle}</span>}
      </div>
    </div>
  );
}

function Pagination({ activePage, setActivePage, totalPages, compact = false }: { activePage: number, setActivePage: (p: number) => void, totalPages: number, compact?: boolean }) {
  return (
    <div className="flex gap-2">
      <button 
        onClick={() => setActivePage(Math.max(1, activePage - 1))}
        disabled={activePage === 1}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </button>
      {!compact && Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
        let pageNum = activePage;
        if (activePage === 1) pageNum = i + 1;
        else if (activePage === totalPages && totalPages > 2) pageNum = totalPages - 2 + i;
        else pageNum = activePage - 1 + i;
        
        if (pageNum > totalPages) return null;

        return (
          <button 
            key={pageNum}
            onClick={() => setActivePage(pageNum)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all active:scale-95 ${
              activePage === pageNum 
                ? 'bg-primary text-white hover:brightness-125' 
                : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            {pageNum}
          </button>
        );
      })}
      {compact && <span className="flex items-center text-xs font-bold text-slate-500 px-2">{activePage} / {totalPages}</span>}
      <button 
        onClick={() => setActivePage(Math.min(totalPages, activePage + 1))}
        disabled={activePage === totalPages}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  );
}

function FilterContent({ 
  activeCategory, 
  setActiveCategory, 
  dateRange, 
  setDateRange, 
  minAmount, 
  maxAmount, 
  handleMinChange, 
  handleMaxChange, 
  maxLimit, 
  handleApplyFilters, 
  isFiltering, 
  formatCurrency,
  categories
}: any) {
  return (
    <div className="flex flex-col gap-6">
      <h3 className="hidden lg:flex text-sm font-black text-primary font-headline mb-0 tracking-tight items-center justify-between">
        Filters
        <button 
          onClick={() => { setActiveCategory('All'); setDateRange('Past 30 Days'); }}
          className="text-xs text-secondary font-bold hover:text-secondary-fixed-dim transition-colors"
        >
          Clear all
        </button>
      </h3>
      
      {/* Date Range */}
      <div className="mb-4">
        <label className="text-[10px] md:text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-3 block">Timeline</label>
        <div className="space-y-3">
          <button 
            onClick={() => setDateRange(dateRange === 'Past 30 Days' ? 'This Month' : 'Past 30 Days')}
            className="w-full text-left px-4 py-3 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl text-sm font-medium flex justify-between items-center group"
          >
            {dateRange}
            <span className="material-symbols-outlined text-slate-400 text-lg group-hover:text-primary transition-colors">calendar_today</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-container-low p-2 rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors">
              <span className="block text-[8px] md:text-[9px] font-bold text-slate-400 uppercase mb-1">From</span>
              <span className="text-[10px] md:text-xs font-bold">Sep 24, 2023</span>
            </div>
            <div className="bg-surface-container-low p-2 rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors">
              <span className="block text-[8px] md:text-[9px] font-bold text-slate-400 uppercase mb-1">To</span>
              <span className="text-[10px] md:text-xs font-bold">Oct 24, 2023</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="mb-4">
        <label className="text-[10px] md:text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-3 block">Categories</label>
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 6).map((cat: string) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all active:scale-95 ${
                activeCategory === cat 
                  ? 'bg-primary text-white hover:brightness-125' 
                  : 'bg-surface-container-high text-slate-600 hover:bg-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      {/* Amount Range */}
      <div className="mb-4">
        <label className="text-[10px] md:text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-3 block">Amount Threshold</label>
        <div className="relative h-1.5 bg-surface-container-high rounded-full mt-6 mb-4">
          <div 
            className="absolute top-0 bottom-0 bg-secondary rounded-full pointer-events-none"
            style={{ 
              left: `${(minAmount / maxLimit) * 100}%`, 
              right: `${100 - (maxAmount / maxLimit) * 100}%` 
            }}
          ></div>
          
          <input 
            type="range" 
            min="0" 
            max={maxLimit} 
            step="100"
            value={minAmount} 
            onChange={handleMinChange}
            className="absolute w-full -top-2 h-6 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-secondary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-secondary [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
          />
          
          <input 
            type="range" 
            min="0" 
            max={maxLimit} 
            step="100"
            value={maxAmount} 
            onChange={handleMaxChange}
            className="absolute w-full -top-2 h-6 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-secondary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-secondary [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
        <div className="flex justify-between mt-3 text-[10px] md:text-xs font-bold text-slate-500">
          <span>{formatCurrency(minAmount)}</span>
          <span>{formatCurrency(maxAmount)}{maxAmount >= maxLimit ? '+' : ''}</span>
        </div>
      </div>
      
      <button 
        onClick={handleApplyFilters}
        className="w-full py-4 bg-primary text-white rounded-xl font-bold text-sm shadow-xl hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
      >
        {isFiltering ? (
          <>
            <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            Synchronizing...
          </>
        ) : (
          'Apply Filters'
        )}
      </button>
    </div>
  );
}
