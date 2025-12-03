import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, MOCK_TRANSACTIONS, SUMMARY_STATS, MONTHLY_DATA, CATEGORY_DATA } from '@/lib/mock-data';

interface TransactionContextType {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  stats: typeof SUMMARY_STATS;
  monthlyData: typeof MONTHLY_DATA;
  categoryData: typeof CATEGORY_DATA;
  resetData: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [stats, setStats] = useState(SUMMARY_STATS);
  const [monthlyData, setMonthlyData] = useState(MONTHLY_DATA);
  const [categoryData, setCategoryData] = useState(CATEGORY_DATA);

  // Recalculate stats when transactions change
  useEffect(() => {
    if (transactions === MOCK_TRANSACTIONS) return;

    // Calculate simple stats from transactions
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalBalance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    setStats({
      totalBalance,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      savingsRate: parseFloat(savingsRate.toFixed(1))
    });

    // Recalculate Category Data
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const newCategoryData = Object.keys(categories).map((cat, index) => ({
      name: cat,
      value: categories[cat],
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
    }));
    
    if (newCategoryData.length > 0) {
      setCategoryData(newCategoryData);
    }

    // Note: Monthly data recalculation is complex without dates, keeping mock for now or implementing simplified version
    // For prototype, we'll just keep the mock monthly data if it's too hard to infer from single-month CSVs
  }, [transactions]);

  const resetData = () => {
    setTransactions(MOCK_TRANSACTIONS);
    setStats(SUMMARY_STATS);
    setMonthlyData(MONTHLY_DATA);
    setCategoryData(CATEGORY_DATA);
  };

  return (
    <TransactionContext.Provider value={{ 
      transactions, 
      setTransactions, 
      stats, 
      monthlyData, 
      categoryData,
      resetData
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}
