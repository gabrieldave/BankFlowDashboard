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
      } else if (fileType === "application/pdf" || req.file.originalname.toLowerCase().endsWith('.pdf')) {
        try {
          transactions = await parsePDF(req.file.buffer);
        } catch (pdfError: any) {
          console.error("Error específico en PDF:", pdfError);
          return res.status(400).json({ 
            error: pdfError.message || "Error al procesar el PDF. Verifica que sea un estado de cuenta válido." 
          });
        }
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

      // Detectar y filtrar duplicados antes de guardar
      const result = await storage.createTransactions(validTransactions);

      let message = `${result.saved.length} transacciones importadas correctamente`;
      if (result.duplicates > 0) {
        message += `. ${result.duplicates} duplicadas omitidas`;
      }

      res.json({
        message,
        count: result.saved.length,
        duplicates: result.duplicates,
        skipped: result.skipped,
        transactions: result.saved,
      });
    } catch (error: any) {
      console.error("Error procesando archivo:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ 
        error: error.message || "Error procesando el archivo",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

      // Calcular tendencia del balance (mes actual vs mes anterior)
      let balanceTrend = 0;
      if (monthlyData.length >= 2) {
        const currentMonth = monthlyData[monthlyData.length - 1];
        const previousMonth = monthlyData[monthlyData.length - 2];
        const currentBalance = (currentMonth.balance || 0);
        const previousBalance = (previousMonth.balance || 0);
        
        if (previousBalance !== 0) {
          balanceTrend = ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100;
        } else if (currentBalance !== 0) {
          balanceTrend = currentBalance > 0 ? 100 : -100; // Si no había balance antes, es 100% o -100%
        }
      }

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

      // Calcular métricas adicionales útiles
      const expenseTransactions = transactions.filter(t => t.type === 'expense');
      const incomeTransactions = transactions.filter(t => t.type === 'income');
      
      // Gasto promedio diario (todos los días con datos)
      const totalDays = dailyData.length;
      const avgDailyExpense = totalDays > 0 
        ? dailyData.reduce((acc, d) => acc + d.expense, 0) / totalDays 
        : 0;
      
      // Ingreso promedio diario (todos los días con datos)
      const avgDailyIncome = totalDays > 0 
        ? dailyData.reduce((acc, d) => acc + d.income, 0) / totalDays 
        : 0;
      
      // Día de la semana con más gastos
      const dayOfWeekTotals: Record<string, number> = {};
      expenseTransactions.forEach(t => {
        try {
          const date = new Date(t.date);
          const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
          dayOfWeekTotals[dayName] = (dayOfWeekTotals[dayName] || 0) + parseFloat(t.amount);
        } catch (e) {}
      });
      const mostSpentDay = Object.entries(dayOfWeekTotals)
        .sort((a, b) => b[1] - a[1])[0];
      
      // Categoría más gastada
      const topCategory = categoryData.length > 0 ? categoryData[0] : null;
      
      // Transacciones más frecuentes (por merchant)
      const merchantCounts: Record<string, number> = {};
      transactions.forEach(t => {
        merchantCounts[t.merchant] = (merchantCounts[t.merchant] || 0) + 1;
      });
      const mostFrequentMerchant = Object.entries(merchantCounts)
        .sort((a, b) => b[1] - a[1])[0];

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
        balanceTrend: parseFloat(balanceTrend.toFixed(1)),
        largestExpenses,
        largestIncomes,
        totalTransactions: transactions.length,
        avgTransactionAmount: expenseTransactions.length > 0 
          ? parseFloat((expenses / expenseTransactions.length).toFixed(2))
          : 0,
        // Métricas adicionales
        avgDailyExpense: parseFloat(avgDailyExpense.toFixed(2)),
        avgDailyIncome: parseFloat(avgDailyIncome.toFixed(2)),
        mostSpentDay: mostSpentDay ? {
          day: mostSpentDay[0],
          amount: parseFloat(mostSpentDay[1].toFixed(2))
        } : null,
        topCategory: topCategory ? {
          name: topCategory.name,
          amount: parseFloat(topCategory.value.toFixed(2)),
          count: topCategory.count || 0
        } : null,
        mostFrequentMerchant: mostFrequentMerchant ? {
          name: mostFrequentMerchant[0],
          count: mostFrequentMerchant[1]
        } : null,
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

  // Endpoint para actualizar currency de transacciones existentes
  app.patch("/api/transactions/update-currency", async (req, res) => {
    try {
      const { currency = 'MXN', updateAll = false } = req.body;
      const allTransactions = await storage.getAllTransactions();
      
      // Si updateAll es true, actualizar TODAS las transacciones
      // Si es false, solo actualizar las que tienen EUR o no tienen currency
      const transactionsToUpdate = updateAll 
        ? allTransactions  // Actualizar todas
        : allTransactions.filter(t => 
            !t.currency || t.currency === 'EUR' || t.currency === null || t.currency === undefined
          );
      
      if (transactionsToUpdate.length === 0) {
        return res.json({ 
          message: "No hay transacciones que actualizar",
          updated: 0 
        });
      }

      console.log(`Actualizando ${transactionsToUpdate.length} transacciones a ${currency}`);

      // Actualizar cada transacción
      let updated = 0;
      let errors = 0;
      for (const transaction of transactionsToUpdate) {
        try {
          await storage.updateTransaction(transaction.id, { currency });
          updated++;
        } catch (error) {
          console.error(`Error actualizando transacción ${transaction.id}:`, error);
          errors++;
        }
      }

      res.json({ 
        message: `${updated} transacciones actualizadas a ${currency}${errors > 0 ? ` (${errors} errores)` : ''}`,
        updated,
        errors
      });
    } catch (error: any) {
      console.error("Error actualizando currency:", error);
      res.status(500).json({ error: error.message || "Error actualizando currency" });
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
  
  // Procesar TODAS las transacciones, no solo los últimos 30 días
  transactions.forEach(t => {
    const date = new Date(t.date);
    if (isNaN(date.getTime())) return;
    
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
