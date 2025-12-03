import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { parseCSV, parsePDF } from "./file-processors";
import { insertTransactionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se envió ningún archivo" });
      }

      let transactions;
      const fileType = req.file.mimetype;

      if (fileType === "text/csv" || req.file.originalname.endsWith('.csv')) {
        const content = req.file.buffer.toString('utf-8');
        transactions = await parseCSV(content);
      } else if (fileType === "application/pdf") {
        transactions = await parsePDF(req.file.buffer);
      } else {
        return res.status(400).json({ 
          error: "Formato no soportado. Usa CSV o PDF." 
        });
      }

      if (transactions.length === 0) {
        return res.status(400).json({ 
          error: "No se encontraron transacciones en el archivo" 
        });
      }

      const validTransactions = transactions.filter(t => {
        try {
          insertTransactionSchema.parse(t);
          return true;
        } catch (e) {
          console.warn("Transacción inválida:", t, e);
          return false;
        }
      });

      if (validTransactions.length === 0) {
        return res.status(400).json({ 
          error: "No se encontraron transacciones válidas" 
        });
      }

      const saved = await storage.createTransactions(validTransactions);

      res.json({
        message: `${saved.length} transacciones importadas correctamente`,
        count: saved.length,
        transactions: saved,
      });
    } catch (error: any) {
      console.error("Error procesando archivo:", error);
      res.status(500).json({ 
        error: error.message || "Error procesando el archivo" 
      });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error: any) {
      console.error("Error obteniendo transacciones:", error);
      res.status(500).json({ error: "Error obteniendo transacciones" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + parseFloat(t.amount), 0);
      
      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + parseFloat(t.amount), 0);

      const totalBalance = income - expenses;
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

      // Análisis por categoría
      const categoryTotals: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      
      transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
          categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
        });

      const categoryData = Object.entries(categoryTotals)
        .map(([name, value]) => ({ 
          name, 
          value,
          count: categoryCounts[name] || 0,
          average: value / (categoryCounts[name] || 1)
        }))
        .sort((a, b) => b.value - a.value);

      // Análisis por comercio (top merchants)
      const merchantTotals: Record<string, number> = {};
      transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          merchantTotals[t.merchant] = (merchantTotals[t.merchant] || 0) + parseFloat(t.amount);
        });

      const topMerchants = Object.entries(merchantTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Análisis mensual
      const monthlyData = calculateMonthlyData(transactions);

      // Análisis de tendencias (últimos 3 meses vs anteriores)
      const recentMonths = monthlyData.slice(-3);
      const previousMonths = monthlyData.slice(-6, -3);
      
      const recentAvgExpenses = recentMonths.length > 0 
        ? recentMonths.reduce((acc, m) => acc + m.expense, 0) / recentMonths.length 
        : 0;
      const previousAvgExpenses = previousMonths.length > 0
        ? previousMonths.reduce((acc, m) => acc + m.expense, 0) / previousMonths.length
        : 0;
      
      const expenseTrend = previousAvgExpenses > 0 
        ? ((recentAvgExpenses - previousAvgExpenses) / previousAvgExpenses) * 100 
        : 0;

      // Análisis diario (últimos 30 días)
      const dailyData = calculateDailyData(transactions);

      // Transacciones más grandes
      const largestExpenses = transactions
        .filter(t => t.type === 'expense')
        .map(t => ({
          id: t.id,
          description: t.description,
          merchant: t.merchant,
          category: t.category,
          amount: parseFloat(t.amount),
          date: t.date,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const largestIncomes = transactions
        .filter(t => t.type === 'income')
        .map(t => ({
          id: t.id,
          description: t.description,
          merchant: t.merchant,
          category: t.category,
          amount: parseFloat(t.amount),
          date: t.date,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      res.json({
        totalBalance: parseFloat(totalBalance.toFixed(2)),
        monthlyIncome: parseFloat(income.toFixed(2)),
        monthlyExpenses: parseFloat(expenses.toFixed(2)),
        savingsRate: parseFloat(savingsRate.toFixed(1)),
        categoryData,
        monthlyData,
        dailyData,
        topMerchants,
        expenseTrend: parseFloat(expenseTrend.toFixed(1)),
        largestExpenses,
        largestIncomes,
        totalTransactions: transactions.length,
        avgTransactionAmount: transactions.length > 0 
          ? parseFloat((expenses / transactions.filter(t => t.type === 'expense').length).toFixed(2))
          : 0,
      });
    } catch (error: any) {
      console.error("Error calculando estadísticas:", error);
      res.status(500).json({ error: "Error calculando estadísticas" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      
      await storage.deleteTransaction(id);
      res.json({ message: "Transacción eliminada" });
    } catch (error: any) {
      console.error("Error eliminando transacción:", error);
      res.status(500).json({ error: "Error eliminando transacción" });
    }
  });

  app.delete("/api/transactions", async (req, res) => {
    try {
      await storage.deleteAllTransactions();
      res.json({ message: "Todas las transacciones eliminadas" });
    } catch (error: any) {
      console.error("Error eliminando transacciones:", error);
      res.status(500).json({ error: "Error eliminando transacciones" });
    }
  });

  return httpServer;
}

function calculateMonthlyData(transactions: any[]) {
  const monthlyTotals: Record<string, { income: number; expense: number }> = {};
  
  transactions.forEach(t => {
    const date = new Date(t.date);
    if (isNaN(date.getTime())) return;
    
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = { income: 0, expense: 0 };
    }
    
    const amount = parseFloat(t.amount);
    if (t.type === 'income') {
      monthlyTotals[monthKey].income += amount;
    } else {
      monthlyTotals[monthKey].expense += amount;
    }
  });

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  return Object.entries(monthlyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Últimos 12 meses
    .map(([key, { income, expense }]) => {
      const [year, month] = key.split('-');
      return {
        name: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
        income: parseFloat(income.toFixed(2)),
        expense: parseFloat(expense.toFixed(2)),
        balance: parseFloat((income - expense).toFixed(2)),
      };
    });
}

function calculateDailyData(transactions: any[]) {
  const dailyTotals: Record<string, { income: number; expense: number }> = {};
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  transactions.forEach(t => {
    const date = new Date(t.date);
    if (isNaN(date.getTime()) || date < thirtyDaysAgo) return;
    
    const dayKey = date.toISOString().split('T')[0];
    
    if (!dailyTotals[dayKey]) {
      dailyTotals[dayKey] = { income: 0, expense: 0 };
    }
    
    const amount = parseFloat(t.amount);
    if (t.type === 'income') {
      dailyTotals[dayKey].income += amount;
    } else {
      dailyTotals[dayKey].expense += amount;
    }
  });

  return Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { income, expense }]) => {
      const date = new Date(key);
      return {
        date: key,
        name: `${date.getDate()}/${date.getMonth() + 1}`,
        income: parseFloat(income.toFixed(2)),
        expense: parseFloat(expense.toFixed(2)),
      };
    });
}
