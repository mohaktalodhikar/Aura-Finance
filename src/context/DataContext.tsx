import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface Transaction {
  id: string;
  userId: string;
  merchant: string;
  amount: number;
  category: string;
  date: string;
  createdAt: any;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  limit: number;
  icon: string;
  color: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

interface DataContextType {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  loading: boolean;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  currency: string;
  updateCurrency: (c: string) => void;
  formatCurrency: (amount: number) => string;
  convertToBaseCurrency: (amount: number) => number;
  convertFromBaseCurrency: (amount: number) => number;
  chatMessages: { role: string, text: string }[];
  setChatMessages: React.Dispatch<React.SetStateAction<{ role: string, text: string }[]>>;
}

const DataContext = createContext<DataContextType>({
  transactions: [],
  budgets: [],
  goals: [],
  loading: true,
  totalBalance: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  currency: 'USD',
  updateCurrency: () => {},
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  convertToBaseCurrency: (amount: number) => amount,
  convertFromBaseCurrency: (amount: number) => amount,
  chatMessages: [],
  setChatMessages: () => {},
});

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [chatMessages, setChatMessages] = useState<{ role: string, text: string }[]>([
    { role: 'ai', text: "Hi! I'm Aura AI. I'm analyzing your finances. What would you like to know today?" }
  ]);

  useEffect(() => {
    let unsubTx: () => void;
    let unsubBg: () => void;
    let unsubGoals: () => void;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Fetch Settings (Currency)
        const settingsRef = doc(db, 'settings', user.uid);
        getDoc(settingsRef).then(settingsSnap => {
          if (settingsSnap.exists() && settingsSnap.data().currency) {
            setCurrency(settingsSnap.data().currency);
          }
          setSettingsLoading(false);
        }).catch((err: any) => {
          if (err.code !== 'permission-denied') {
            console.error("Error fetching settings:", err);
          }
          setSettingsLoading(false);
        });

        // Fetch Transactions
        const qTx = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        unsubTx = onSnapshot(qTx, (snapshot) => {
          const txs: Transaction[] = [];
          snapshot.forEach(doc => txs.push({ id: doc.id, ...doc.data() } as Transaction));
          // Sort client side to avoid requiring composite indexes
          txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(txs);
        }, (error: any) => {
          if (error.code !== 'permission-denied') {
            console.error("Error fetching transactions:", error);
          }
        });

        // Fetch Budgets
        const qBg = query(collection(db, 'budgets'), where('userId', '==', user.uid));
        unsubBg = onSnapshot(qBg, (snapshot) => {
          const bgs: Budget[] = [];
          snapshot.forEach(doc => bgs.push({ id: doc.id, ...doc.data() } as Budget));
          setBudgets(bgs);
        }, (error: any) => {
          if (error.code !== 'permission-denied') {
            console.error("Error fetching budgets:", error);
          }
        });

        // Fetch Goals
        const qGoals = query(collection(db, 'goals'), where('userId', '==', user.uid));
        unsubGoals = onSnapshot(qGoals, (snapshot) => {
          const fetchedGoals: Goal[] = [];
          snapshot.forEach(doc => fetchedGoals.push({ id: doc.id, ...doc.data() } as Goal));
          setGoals(fetchedGoals);
        }, (error: any) => {
          if (error.code !== 'permission-denied') {
            console.error("Error fetching goals:", error);
          }
        });
      } else {
        if (unsubTx) unsubTx();
        if (unsubBg) unsubBg();
        if (unsubGoals) unsubGoals();
        setTransactions([]);
        setBudgets([]);
        setGoals([]);
        setSettingsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubTx) unsubTx();
      if (unsubBg) unsubBg();
      if (unsubGoals) unsubGoals();
    };
  }, []);

  useEffect(() => {
    // Only stop overall loading when settings and at least a first push of data are done
    // We'll consider it "loaded" once settings are fetched.
    if (!settingsLoading) {
      setLoading(false);
    }
  }, [settingsLoading]);

  // Calculate derived state
  // Assuming positive amount = income, negative amount = expense.
  // Wait, in Transactions.tsx, adding a transaction might just be a positive number but it's an expense?
  // Let's assume income is positive, expense is negative.
  // If the user enters a positive number for Groceries, we should probably treat it as an expense.
  // Let's look at Transactions.tsx:
  // <input type="number" value={amount} ... />
  // If category is "Income", it's positive. Otherwise, it's negative.
  
  const totalBalance = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyIncome = transactions.filter(t => t.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyExpenses = transactions.filter(t => t.amount < 0).reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const updateCurrency = async (c: string) => {
    setCurrency(c);
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, 'settings', user.uid), { currency: c }, { merge: true });
    }
  };

  const rates: { [key: string]: number } = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.5
  };

  const convertToBaseCurrency = (amount: number) => {
    return amount / (rates[currency] || 1);
  };

  const convertFromBaseCurrency = (amount: number) => {
    return amount * (rates[currency] || 1);
  };

  const formatCurrency = (amount: number) => {
    const convertedAmount = amount * (rates[currency] || 1);
    const locales: { [key: string]: string } = {
      USD: 'en-US',
      EUR: 'de-DE',
      GBP: 'en-GB',
      INR: 'en-IN'
    };
    return new Intl.NumberFormat(locales[currency] || 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount);
  };

  return (
    <DataContext.Provider value={{ transactions, budgets, goals, loading, totalBalance, monthlyIncome, monthlyExpenses, currency, updateCurrency, formatCurrency, convertToBaseCurrency, convertFromBaseCurrency, chatMessages, setChatMessages }}>
      {children}
    </DataContext.Provider>
  );
};
