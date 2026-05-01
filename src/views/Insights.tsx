import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { GoogleGenAI } from '@google/genai';

export default function Insights() {
  const { totalBalance, monthlyIncome, monthlyExpenses, transactions, budgets, goals, chatMessages, setChatMessages, formatCurrency, currency } = useData();
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeToast, setActiveToast] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite-preview');
  const chatEndRef = useRef<HTMLDivElement>(null);
 
  const netCashFlow = monthlyIncome - monthlyExpenses;
  const isPositiveCashFlow = netCashFlow >= 0;

  // Dynamic Secondary Insights Calculations
  // 1. Largest Expense Insight
  const expensesOnly = transactions.filter(t => t.amount < 0);
  const largestExpense = expensesOnly.length > 0 
    ? expensesOnly.reduce((max, t) => Math.abs(t.amount) > Math.abs(max.amount) ? t : max, expensesOnly[0])
    : null;

  // 2. Budget Warning Insight
  const budgetsWithSpending = budgets.map(budget => {
    const spent = transactions
      .filter(t => t.category === budget.name && t.amount < 0)
      .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    return { ...budget, spent, percentage: (spent / budget.limit) * 100 };
  });
  const highestBudget = budgetsWithSpending.length > 0 
    ? budgetsWithSpending.reduce((max, b) => b.percentage > max.percentage ? b : max, budgetsWithSpending[0])
    : null;

  // 3. Goal Progress Insight
  const closestGoal = goals.length > 0
    ? goals.reduce((closest, g) => {
        const progressG = g.currentAmount / g.targetAmount;
        const progressClosest = closest.currentAmount / closest.targetAmount;
        return progressG > progressClosest ? g : closest;
      }, goals[0])
    : null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages = [...chatMessages, { role: 'user', text }];
    setChatMessages(newMessages);
    setInputValue('');
    setIsTyping(true);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is missing. Please go to the 'Settings' menu in AI Studio (gear icon) and add a secret named 'GEMINI_API_KEY' with your API key.");
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const formattedBudgets = budgets.map(b => ({ ...b, limit: formatCurrency(b.limit) }));
      const formattedGoals = goals.map(g => ({ 
        ...g, 
        targetAmount: formatCurrency(g.targetAmount), 
        currentAmount: formatCurrency(g.currentAmount) 
      }));
      const formattedTransactions = transactions.slice(0, 15).map(t => ({
        ...t,
        amount: formatCurrency(Math.abs(t.amount)),
        type: t.amount > 0 ? 'Income' : 'Expense'
      }));

      const context = `You are Aura AI, a helpful, professional, and concise financial assistant.
Current Date: ${new Date().toISOString().split('T')[0]} (YYYY-MM-DD)
User's Preferred Currency: ${currency}
User's Financial Context:
- Total Balance: ${formatCurrency(totalBalance)}
- Monthly Income: ${formatCurrency(monthlyIncome)}
- Monthly Expenses: ${formatCurrency(monthlyExpenses)}
- Budgets: ${JSON.stringify(formattedBudgets)}
- Goals: ${JSON.stringify(formattedGoals)}
- Recent Transactions: ${JSON.stringify(formattedTransactions)}

CRITICAL INSTRUCTIONS:
1. When calculating time remaining for goals, use the "Current Date" provided above.
2. Carefully calculate the month difference. For example, from April 2026 to October 2026 is 6 months, not 30. 
3. Perform all division and multiplication twice to ensure accuracy.
4. Provide actionable, specific advice based on this data. Keep responses relatively short and easy to read.
5. Do NOT use any markdown formatting. Do NOT use asterisks (*) or bold text. Use plain text only.
6. Always format monetary values using the user's preferred currency (${currency}).`;

      const contents = newMessages.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: contents,
        config: {
          systemInstruction: context,
        }
      });

      // Clean up any stray markdown asterisks just in case
      const cleanText = (response.text || "I'm sorry, I couldn't process that.").replace(/[*_#]/g, '');

      setChatMessages(prev => [...prev, { role: 'ai', text: cleanText }]);
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage = "Could not connect to AI.";
      if (error.message && (error.message.includes("503") || error.message.includes("high demand"))) {
        errorMessage = "This AI model is currently experiencing high demand. Please use the dropdown menu above to switch to a different model (like 'Balanced' or 'Powerful') and try again.";
      } else {
        errorMessage = `Error: ${error.message || "Could not connect to AI."}`;
      }
      setChatMessages(prev => [...prev, { role: 'ai', text: errorMessage }]);
    } finally {
      setIsTyping(false);
    }
  };

  const showToast = (message: string) => {
    setActiveToast(message);
    setTimeout(() => setActiveToast(null), 3000);
  };

  return (
    <div className="p-8 flex flex-col gap-8 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      
      {/* Toast Notification */}
      {activeToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm animate-in slide-in-from-top-4 fade-in flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          {activeToast}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1">
          <h1 className="text-4xl font-black text-primary font-headline tracking-tighter mb-2">AI Insights</h1>
          <p className="text-slate-500 font-medium">Personalized financial analysis and recommendations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Insight Feed */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Dynamic Cash Flow Insight Card */}
          <div className={`p-8 rounded-3xl text-white relative overflow-hidden shadow-xl group animate-in fade-in zoom-in-95 ${isPositiveCashFlow ? 'bg-primary' : 'bg-red-900'}`}>
            <div className={`absolute right-0 top-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700 ${isPositiveCashFlow ? 'bg-secondary/10' : 'bg-red-500/20'}`}></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className={`material-symbols-outlined text-3xl ${isPositiveCashFlow ? 'text-secondary' : 'text-red-400'}`}>
                  {isPositiveCashFlow ? 'trending_up' : 'warning'}
                </span>
                <span className={`font-bold tracking-widest uppercase text-xs ${isPositiveCashFlow ? 'text-secondary' : 'text-red-400'}`}>
                  {isPositiveCashFlow ? 'Positive Cash Flow' : 'Negative Cash Flow'}
                </span>
              </div>
              <h2 className="text-3xl font-black font-headline tracking-tighter mb-4 leading-tight">
                {isPositiveCashFlow 
                  ? `You have a surplus of ${formatCurrency(netCashFlow)} this month.` 
                  : `Your expenses exceed your income by ${formatCurrency(Math.abs(netCashFlow))}.`}
              </h2>
              <p className="text-slate-300 mb-2 leading-relaxed max-w-lg">
                {isPositiveCashFlow
                  ? 'Great job keeping your expenses below your income! Consider moving this excess to your savings goals or investments to maximize your wealth.'
                  : 'You are currently spending more than you are earning this month. Review your recent transactions and budgets to identify areas where you can cut back.'}
              </p>
            </div>
          </div>

          {/* Secondary Insights List */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-500 tracking-widest uppercase mb-2">Recent Observations</h3>
            
            {/* Dynamic Insight 1: Largest Expense */}
            {largestExpense && (
              <div className="glass-card p-6 flex gap-6 items-start hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <div>
                  <h4 className="font-bold text-primary text-lg mb-1">Largest Recent Expense</h4>
                  <p className="text-sm text-slate-500 leading-relaxed mb-3">
                    Your largest recent expense was <span className="font-bold">{formatCurrency(Math.abs(largestExpense.amount))}</span> at <span className="font-bold">{largestExpense.merchant}</span> for {largestExpense.category}.
                  </p>
                  <button onClick={() => handleSendMessage(`How can I reduce my spending at ${largestExpense.merchant}?`)} className="text-secondary font-bold text-xs hover:underline">Ask AI about this</button>
                </div>
              </div>
            )}

            {/* Dynamic Insight 2: Budget Warning */}
            {highestBudget && highestBudget.percentage > 0 && (
              <div className="glass-card p-6 flex gap-6 items-start hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">pie_chart</span>
                </div>
                <div>
                  <h4 className="font-bold text-primary text-lg mb-1">{highestBudget.percentage >= 100 ? 'Budget Exceeded' : 'High Budget Usage'}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed mb-3">
                    You have spent <span className="font-bold">{formatCurrency(highestBudget.spent)}</span> of your <span className="font-bold">{formatCurrency(highestBudget.limit)}</span> {highestBudget.name} budget ({Math.round(highestBudget.percentage)}%).
                  </p>
                  <button onClick={() => handleSendMessage(`Give me tips to stay within my ${highestBudget.name} budget.`)} className="text-secondary font-bold text-xs hover:underline">Get Budgeting Tips</button>
                </div>
              </div>
            )}
            
             {/* Dynamic Insight 3: Goal Progress */}
             {closestGoal && closestGoal.currentAmount > 0 && (
              <div className="glass-card p-6 flex gap-6 items-start hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">flag</span>
                </div>
                <div>
                  <h4 className="font-bold text-primary text-lg mb-1">Goal Progress Update</h4>
                  <p className="text-sm text-slate-500 leading-relaxed mb-3">
                    You are <span className="font-bold">{Math.round((closestGoal.currentAmount / closestGoal.targetAmount) * 100)}%</span> of the way to your <span className="font-bold">"{closestGoal.name}"</span> goal! Keep it up.
                  </p>
                  <button onClick={() => handleSendMessage(`How can I reach my ${closestGoal.name} goal faster?`)} className="text-secondary font-bold text-xs hover:underline">Accelerate Goal</button>
                </div>
              </div>
            )}

            {/* Fallback if no data */}
            {(!largestExpense && (!highestBudget || highestBudget.percentage === 0) && (!closestGoal || closestGoal.currentAmount === 0)) && (
              <div className="glass-card p-6 text-center text-slate-500">
                Add more transactions, budgets, or goals to see personalized observations here.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Ask AI */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-xl">smart_toy</span>
                </div>
                <div>
                  <h3 className="font-bold text-primary">Ask Aura AI</h3>
                  <p className="text-xs text-slate-400">Powered by Gemini</p>
                </div>
              </div>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/30 text-xs text-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:border-secondary"
              >
                <option value="gemini-3.1-flash-lite-preview">Fastest (Flash Lite)</option>
                <option value="gemini-3-flash-preview">Balanced (Flash)</option>
                <option value="gemini-3.1-pro-preview">Powerful (Pro)</option>
              </select>
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4 pr-2">
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-2xl text-sm max-w-[85%] ${
                    msg.role === 'ai' 
                      ? 'bg-surface-container-low text-slate-700 rounded-tl-sm self-start' 
                      : 'bg-primary-container text-white rounded-tr-sm self-end'
                  }`}
                >
                  {msg.text.split('\n').map((line, j) => (
                    <React.Fragment key={j}>
                      {line}
                      {j < msg.text.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              ))}
              {isTyping && (
                <div className="p-4 rounded-2xl text-sm max-w-[85%] bg-surface-container-low text-slate-700 rounded-tl-sm self-start flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="relative mt-auto">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSendMessage(inputValue)}
                disabled={isTyping}
                placeholder={isTyping ? "Aura AI is thinking..." : "Ask about your finances..."} 
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-4 pl-4 pr-12 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all disabled:opacity-50"
              />
              <button 
                onClick={() => handleSendMessage(inputValue)}
                disabled={isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-secondary text-on-secondary rounded-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
          
          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2">
            {['Analyze my spending', 'How to save more?', 'Upcoming bills'].map(prompt => (
              <button 
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="px-4 py-2 bg-surface-container-low hover:bg-surface-container-high rounded-full text-xs font-bold text-slate-600 transition-colors border border-outline-variant/20 active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
