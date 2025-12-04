import type { Express } from "express";
import type { Server } from "http";
import { storage, PocketBaseStorage } from "./storage";
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

      // Verificar si todas las transacciones ya fueron procesadas (duplicadas)
      // Si falla la obtención, simplemente continuamos - createTransactions manejará los duplicados
      let existingSet = new Set<string>();
      let duplicateCheckEnabled = false;
      
      try {
        console.log("Obteniendo transacciones existentes para verificación de duplicados...");
        const existingTransactions = await storage.getAllTransactions();
        console.log(`Se obtuvieron ${existingTransactions.length} transacciones existentes`);
        
        if (existingTransactions && existingTransactions.length > 0) {
          duplicateCheckEnabled = true;
          
          // Función para normalizar y comparar transacciones (igual que en storage.ts)
          const normalizeTransaction = (t: any) => {
            // Validar y sanitizar valores para evitar errores con undefined/null
            if (!t || (typeof t !== 'object')) {
              return null;
            }
            
            try {
              const date = (t?.date ? String(t.date).trim() : '').toLowerCase();
              const description = (t?.description ? String(t.description).trim() : '').toLowerCase().substring(0, 100);
              const amount = typeof t?.amount === 'string' ? parseFloat(t.amount) : (t?.amount || 0);
              const type = String(t?.type || 'expense').trim();
              
              if (!date && !description) {
                return null; // Transacción inválida sin fecha ni descripción
              }
              
              return {
                date: date || new Date().toISOString().split('T')[0],
                description: description || 'sin descripción',
                amount: Math.abs(amount || 0).toFixed(2),
                type: type || 'expense',
              };
            } catch (error) {
              console.warn("Error normalizando transacción:", error, t);
              return null;
            }
          };

          // Filtrar y normalizar transacciones existentes
          const normalizedKeys = existingTransactions
            .filter(t => t && typeof t === 'object' && (t.date || t.description || t.amount !== undefined))
            .map(t => {
              const normalized = normalizeTransaction(t);
              return normalized ? `${normalized.date}|${normalized.description}|${normalized.amount}|${normalized.type}` : null;
            })
            .filter((key): key is string => key !== null && key.length > 0);
          
          existingSet = new Set(normalizedKeys);
          console.log(`Se normalizaron ${existingSet.size} transacciones existentes para comparación`);
        } else {
          console.log("No hay transacciones existentes, se procesarán todas como nuevas");
        }
      } catch (error: any) {
        console.warn("No se pudieron obtener transacciones existentes para verificación de duplicados:", error.message);
        console.warn("Continuando sin verificación previa - createTransactions manejará los duplicados");
        // Continuar sin verificación previa - createTransactions manejará los duplicados
      }
      
      // Función para normalizar transacciones del archivo actual
      const normalizeTransaction = (t: any) => {
        // Validar y sanitizar valores para evitar errores con undefined/null
        const date = (t?.date ? String(t.date).trim() : '').toLowerCase();
        const description = (t?.description ? String(t.description).trim() : '').toLowerCase().substring(0, 100);
        const amount = typeof t?.amount === 'string' ? parseFloat(t.amount) : (t?.amount || 0);
        const type = String(t?.type || 'expense').trim();
        
        return {
          date: date || new Date().toISOString().split('T')[0],
          description: description || 'sin descripción',
          amount: Math.abs(amount || 0).toFixed(2),
          type: type || 'expense',
        };
      };

      // Contar cuántas transacciones del archivo ya existen (solo si la verificación está habilitada)
      let duplicateCount = 0;
      if (duplicateCheckEnabled && existingSet.size > 0) {
        for (const transaction of validTransactions) {
          try {
            const normalized = normalizeTransaction(transaction);
            const key = `${normalized.date}|${normalized.description}|${normalized.amount}|${normalized.type}`;
            if (existingSet.has(key)) {
              duplicateCount++;
            }
          } catch (error) {
            console.warn("Error verificando duplicado:", error, transaction);
          }
        }
        console.log(`Se encontraron ${duplicateCount} transacciones duplicadas de ${validTransactions.length} totales`);
      }

      // Si todas las transacciones ya fueron procesadas, retornar mensaje especial
      if (duplicateCheckEnabled && duplicateCount === validTransactions.length && validTransactions.length > 0) {
        return res.json({
          message: `Este archivo ya fue procesado anteriormente. Todas las ${validTransactions.length} transacciones ya existen en el sistema.`,
          count: 0,
          duplicates: duplicateCount,
          skipped: 0,
          transactions: [],
          alreadyProcessed: true, // Flag para indicar que ya fue procesado
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
        alreadyProcessed: false,
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

  // Endpoint para verificar estado de transacciones en PocketBase
  app.get("/api/transactions/status", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      const total = transactions.length;
      const income = transactions.filter(t => t.type === 'income').length;
      const expense = transactions.filter(t => t.type === 'expense').length;
      
      // Obtener fechas de las transacciones más recientes
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
        .slice(0, 5);
      
      res.json({
        total,
        income,
        expense,
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          date: t.date,
          description: t.description?.substring(0, 50),
          amount: t.amount,
          type: t.type,
          createdAt: t.createdAt
        })),
        message: total > 0 
          ? `Hay ${total} transacciones guardadas en PocketBase (${income} ingresos, ${expense} gastos)`
          : "No hay transacciones guardadas en PocketBase"
      });
    } catch (error: any) {
      console.error("Error verificando estado de transacciones:", error);
      res.status(500).json({ 
        error: "Error verificando estado de transacciones",
        details: error.message 
      });
    }
  });

  // Endpoint para obtener transacciones directamente desde PocketBase (bypass del storage)
  app.get("/api/transactions/raw", async (req, res) => {
    try {
      // Solo funciona con PocketBaseStorage
      if (!(storage instanceof PocketBaseStorage)) {
        return res.status(400).json({ error: "Este endpoint solo funciona con PocketBase" });
      }

      const pb = (storage as any).pb;
      await (storage as any).ensureAuth();
      
      let records: any[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        try {
          const result = await pb.collection('transactions').getList(page, 500);
          records.push(...(result.items || []));
          hasMore = result.items && result.items.length === 500;
          page++;
        } catch (error: any) {
          console.error(`Error obteniendo página ${page}:`, error.message);
          hasMore = false;
        }
      }
      
      res.json({
        total: records.length,
        records: records.map((item: any) => ({
          id: item.id,
          id_number: item.id_number,
          date: item.date,
          description: item.description,
          amount: item.amount,
          type: item.type,
          category: item.category,
          merchant: item.merchant,
          currency: item.currency,
          created: item.created,
          updated: item.updated
        }))
      });
    } catch (error: any) {
      console.error("Error obteniendo transacciones raw:", error);
      res.status(500).json({ 
        error: "Error obteniendo transacciones raw",
        details: error.message 
      });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      
      // Filtrar transacciones válidas antes de procesar
      const validTransactions = transactions.filter(t => 
        t && t.amount !== undefined && t.amount !== null && !isNaN(parseFloat(String(t.amount)))
      );
      
      const income = validTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => {
          const amount = parseFloat(String(t.amount || 0));
          return acc + (isNaN(amount) ? 0 : amount);
        }, 0);
      
      const expenses = validTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          const amount = parseFloat(String(t.amount || 0));
          return acc + (isNaN(amount) ? 0 : amount);
        }, 0);

      const totalBalance = income - expenses;
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

      // Análisis por categoría
      const categoryTotals: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      
      validTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const category = String(t.category || 'General').trim();
          const amount = parseFloat(String(t.amount || 0));
          if (!isNaN(amount)) {
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          }
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
      validTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const merchant = String(t.merchant || 'Desconocido').trim();
          const amount = parseFloat(String(t.amount || 0));
          if (!isNaN(amount)) {
            merchantTotals[merchant] = (merchantTotals[merchant] || 0) + amount;
          }
        });

      const topMerchants = Object.entries(merchantTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Análisis mensual
      const monthlyData = calculateMonthlyData(validTransactions);

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
      const dailyData = calculateDailyData(validTransactions);

      // Calcular métricas adicionales útiles
      const expenseTransactions = validTransactions.filter(t => t.type === 'expense');
      const incomeTransactions = validTransactions.filter(t => t.type === 'income');
      
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
          if (!t.date) return;
          const date = new Date(t.date);
          if (isNaN(date.getTime())) return;
          const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
          const amount = parseFloat(String(t.amount || 0));
          if (!isNaN(amount)) {
            dayOfWeekTotals[dayName] = (dayOfWeekTotals[dayName] || 0) + amount;
          }
        } catch (e) {
          // Ignorar errores de fecha inválida
        }
      });
      const mostSpentDay = Object.entries(dayOfWeekTotals)
        .sort((a, b) => b[1] - a[1])[0];
      
      // Categoría más gastada
      const topCategory = categoryData.length > 0 ? categoryData[0] : null;
      
      // Transacciones más frecuentes (por merchant)
      const merchantCounts: Record<string, number> = {};
      validTransactions.forEach(t => {
        const merchant = String(t.merchant || 'Desconocido').trim();
        merchantCounts[merchant] = (merchantCounts[merchant] || 0) + 1;
      });
      const mostFrequentMerchant = Object.entries(merchantCounts)
        .sort((a, b) => b[1] - a[1])[0];

      // Transacciones más grandes
      const largestExpenses = validTransactions
        .filter(t => t.type === 'expense')
        .map(t => {
          const amount = parseFloat(String(t.amount || 0));
          return {
            id: t.id,
            description: String(t.description || 'Sin descripción').trim(),
            merchant: String(t.merchant || '').trim(),
            category: String(t.category || 'General').trim(),
            amount: isNaN(amount) ? 0 : amount,
            date: String(t.date || '').trim(),
          };
        })
        .filter(t => !isNaN(t.amount) && t.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const largestIncomes = validTransactions
        .filter(t => t.type === 'income')
        .map(t => {
          const amount = parseFloat(String(t.amount || 0));
          return {
            id: t.id,
            description: String(t.description || 'Sin descripción').trim(),
            merchant: String(t.merchant || '').trim(),
            category: String(t.category || 'General').trim(),
            amount: isNaN(amount) ? 0 : amount,
            date: String(t.date || '').trim(),
          };
        })
        .filter(t => !isNaN(t.amount) && t.amount > 0)
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
        totalTransactions: validTransactions.length,
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
