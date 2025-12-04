import { useQuery } from "@tanstack/react-query";
import { useState, useDeferredValue } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ShoppingCart,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Target,
  Info,
  Zap,
  Clock,
  Award,
  TrendingDown as TrendingDownIcon,
  Search,
  X,
  Filter
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { getStats, getTransactions } from "@/lib/api";
import { formatCurrency, getTransactionCurrency } from "@/lib/currency";

export default function Analytics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterBank, setFilterBank] = useState<string>('all');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  });

  // Usar deferred values para evitar bloqueos en el UI
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredFilterType = useDeferredValue(filterType);
  const deferredFilterCategory = useDeferredValue(filterCategory);
  const deferredFilterMonth = useDeferredValue(filterMonth);
  const deferredFilterWeek = useDeferredValue(filterWeek);
  const deferredFilterBank = useDeferredValue(filterBank);

  // Validar transacciones
  const hasValidTransactions = Array.isArray(transactions) && transactions.length > 0;
  const transactionsArray = transactions || [];
  const transactionsLength = transactionsArray.length;

  // Obtener la moneda más común de las transacciones
  const getMostCommonCurrency = (): string => {
    if (!transactions || transactions.length === 0) return 'MXN';
    const currencyCounts: Record<string, number> = {};
    transactions.forEach(t => {
      const currency = t.currency || 'MXN';
      currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
    });
    const mostCommon = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0];
    return mostCommon ? mostCommon[0] : 'MXN';
  };

  const defaultCurrency = getMostCommonCurrency();

  // Validaciones y early returns
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  if (!stats || !hasValidTransactions) {
    return (
      <div className="text-center space-y-4 py-12">
        <h2 className="text-2xl font-heading font-bold">No hay datos disponibles</h2>
        <p className="text-muted-foreground">Sube tu primer archivo para comenzar a analizar tus finanzas.</p>
      </div>
    );
  }

  // ===== CÁLCULOS DE FILTROS =====
  
  // Obtener categorías únicas
  const getAvailableCategories = (): string[] => {
    if (transactionsLength === 0) return [];
    try {
      const categories = new Set<string>();
      transactionsArray.forEach(t => {
        if (t?.category) categories.add(t.category);
      });
      return Array.from(categories).sort();
    } catch {
      return [];
    }
  };
  const availableCategories = getAvailableCategories();

  // Obtener meses únicos
  const getAvailableMonths = () => {
    if (transactionsLength === 0) return [];
    try {
      const monthMap = new Map<string, string>();
      transactionsArray.forEach(t => {
        try {
          if (!t?.date) return;
          const date = new Date(t.date + 'T00:00:00');
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap.has(monthKey)) {
              const monthLabel = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
              monthMap.set(monthKey, monthLabel);
            }
          }
        } catch {}
      });
      return Array.from(monthMap.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => b.key.localeCompare(a.key));
    } catch {
      return [];
    }
  };
  const availableMonths = getAvailableMonths();

  // Obtener semanas únicas
  const getAvailableWeeks = () => {
    if (transactionsLength === 0) return [];
    try {
      const weekMap = new Map<string, { key: string; label: string; date: Date }>();
      transactionsArray.forEach(t => {
        try {
          if (!t?.date) return;
          const date = new Date(t.date + 'T00:00:00');
          if (isNaN(date.getTime())) return;
          
          const weekStart = new Date(date);
          const dayOfWeek = date.getDay();
          weekStart.setDate(date.getDate() - dayOfWeek);
          weekStart.setHours(0, 0, 0, 0);
          
          const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          
          if (!weekMap.has(weekKey)) {
            const weekLabel = `Semana del ${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
            weekMap.set(weekKey, { key: weekKey, label: weekLabel, date: new Date(weekStart) });
          }
        } catch {}
      });
      
      return Array.from(weekMap.values())
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(({ key, label }) => ({ key, label }));
    } catch {
      return [];
    }
  };
  const availableWeeks = getAvailableWeeks();

  // Obtener bancos únicos
  const getAvailableBanks = (): string[] => {
    if (transactionsLength === 0) return [];
    try {
      const bankSet = new Set<string>();
      transactionsArray.forEach(t => {
        if (t?.bank && typeof t.bank === 'string' && t.bank.trim()) {
          bankSet.add(t.bank.trim());
        }
      });
      return Array.from(bankSet).sort();
    } catch {
      return [];
    }
  };
  const availableBanks = getAvailableBanks();

  // Filtrar transacciones
  const getFilteredTransactions = () => {
    if (transactionsLength === 0) return [];
    try {
      let filtered = [...transactionsArray];
      
      if (deferredFilterType !== 'all') {
        filtered = filtered.filter(t => t.type === deferredFilterType);
      }
      if (deferredFilterCategory !== 'all') {
        filtered = filtered.filter(t => t.category === deferredFilterCategory);
      }
      if (deferredFilterMonth !== 'all') {
        filtered = filtered.filter(t => {
          try {
            const date = new Date(t.date + 'T00:00:00');
            if (isNaN(date.getTime())) return false;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return monthKey === deferredFilterMonth;
          } catch {
            return false;
          }
        });
      }
      if (deferredFilterWeek !== 'all') {
        filtered = filtered.filter(t => {
          try {
            const date = new Date(t.date + 'T00:00:00');
            if (isNaN(date.getTime())) return false;
            
            const weekStart = new Date(date);
            const dayOfWeek = date.getDay();
            weekStart.setDate(date.getDate() - dayOfWeek);
            weekStart.setHours(0, 0, 0, 0);
            
            const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
            return weekKey === deferredFilterWeek;
          } catch {
            return false;
          }
        });
      }
      if (deferredFilterBank !== 'all') {
        filtered = filtered.filter(t => t.bank && t.bank.trim().toLowerCase() === deferredFilterBank.toLowerCase());
      }
      if (deferredSearchQuery.trim()) {
        const query = deferredSearchQuery.toLowerCase();
        filtered = filtered.filter(t => {
          try {
            return (
              (t.description || '').toLowerCase().includes(query) ||
              (t.merchant || '').toLowerCase().includes(query) ||
              (t.category || '').toLowerCase().includes(query) ||
              (t.amount || '').includes(query)
            );
          } catch {
            return false;
          }
        });
      }
      
      filtered.sort((a, b) => {
        try {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA;
        } catch {
          return 0;
        }
      });
      return filtered;
    } catch {
      return [];
    }
  };
  const filteredTransactions = getFilteredTransactions();
  
  // Verificar si hay filtros activos
  const hasActiveFilters = deferredFilterType !== 'all' || 
                          deferredFilterCategory !== 'all' || 
                          deferredFilterMonth !== 'all' || 
                          deferredFilterWeek !== 'all' || 
                          deferredFilterBank !== 'all' || 
                          deferredSearchQuery.trim() !== '';

  // Calcular estadísticas basadas en transacciones filtradas
  const calculateFilteredStats = () => {
    const transactionsToUse = hasActiveFilters ? filteredTransactions : transactionsArray;
    
    if (!transactionsToUse || transactionsToUse.length === 0) {
      return {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savingsRate: 0,
        categoryData: [],
        dailyData: [],
        topMerchants: [],
        largestExpenses: [],
        largestIncomes: [],
        totalTransactions: 0,
        avgTransactionAmount: 0,
        avgDailyExpense: 0,
        avgDailyIncome: 0,
        expenseTrend: 0,
        balanceTrend: 0,
      };
    }

    const income = transactionsToUse
      .filter(t => t.type === 'income')
      .reduce((acc, t) => {
        const amount = parseFloat(String(t.amount || 0));
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);

    const expenses = transactionsToUse
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
    
    transactionsToUse
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

    // Top merchants
    const merchantTotals: Record<string, number> = {};
    transactionsToUse
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

    // Datos diarios
    const dailyTotals: Record<string, { income: number; expense: number }> = {};
    transactionsToUse.forEach(t => {
      try {
        const date = new Date(t.date + 'T00:00:00');
        if (isNaN(date.getTime())) return;
        
        const dayKey = date.toISOString().split('T')[0];
        
        if (!dailyTotals[dayKey]) {
          dailyTotals[dayKey] = { income: 0, expense: 0 };
        }
        
        const amount = parseFloat(String(t.amount || 0));
        if (t.type === 'income') {
          dailyTotals[dayKey].income += amount;
        } else {
          dailyTotals[dayKey].expense += amount;
        }
      } catch {}
    });

    const dailyData = Object.entries(dailyTotals)
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

    // Largest expenses/incomes
    const largestExpenses = transactionsToUse
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

    const largestIncomes = transactionsToUse
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

    const expenseTransactions = transactionsToUse.filter(t => t.type === 'expense');
    const totalDays = dailyData.length;
    const avgDailyExpense = totalDays > 0 
      ? dailyData.reduce((acc, d) => acc + d.expense, 0) / totalDays 
      : 0;
    const avgDailyIncome = totalDays > 0 
      ? dailyData.reduce((acc, d) => acc + d.income, 0) / totalDays 
      : 0;

    return {
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      monthlyIncome: parseFloat(income.toFixed(2)),
      monthlyExpenses: parseFloat(expenses.toFixed(2)),
      savingsRate: parseFloat(savingsRate.toFixed(1)),
      categoryData,
      dailyData,
      topMerchants,
      largestExpenses,
      largestIncomes,
      totalTransactions: transactionsToUse.length,
      avgTransactionAmount: expenseTransactions.length > 0 
        ? parseFloat((expenses / expenseTransactions.length).toFixed(2))
        : 0,
      avgDailyExpense: parseFloat(avgDailyExpense.toFixed(2)),
      avgDailyIncome: parseFloat(avgDailyIncome.toFixed(2)),
      expenseTrend: stats.expenseTrend || 0,
      balanceTrend: stats.balanceTrend || 0,
    };
  };

  const filteredStats = calculateFilteredStats();
  const displayStats = hasActiveFilters ? filteredStats : stats;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">Análisis Avanzado</h1>
          <p className="text-muted-foreground">
            Insights detallados sobre tus finanzas y patrones de gasto
            {hasActiveFilters && (
              <span className="ml-2 text-xs text-primary font-medium">
                (Filtros activos: {filteredTransactions.length} transacciones)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                className="pl-9 h-9 w-[200px] bg-gray-50 border-gray-200" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={(value: 'all' | 'income' | 'expense') => setFilterType(value)}>
              <SelectTrigger className="h-9 w-[140px] bg-gray-50 border-gray-200">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Solo Ingresos</SelectItem>
                <SelectItem value="expense">Solo Gastos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-[160px] bg-gray-50 border-gray-200">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {availableCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-9 w-[160px] bg-gray-50 border-gray-200">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {availableMonths.map(month => (
                  <SelectItem key={month.key} value={month.key}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterWeek} onValueChange={setFilterWeek}>
              <SelectTrigger className="h-9 w-[160px] bg-gray-50 border-gray-200">
                <SelectValue placeholder="Semana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las semanas</SelectItem>
                {availableWeeks.map(week => (
                  <SelectItem key={week.key} value={week.key}>{week.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableBanks.length > 0 && (
              <Select value={filterBank} onValueChange={setFilterBank}>
                <SelectTrigger className="h-9 w-[160px] bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los bancos</SelectItem>
                  {availableBanks.map(bank => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => {
                  setFilterType('all');
                  setFilterCategory('all');
                  setFilterMonth('all');
                  setFilterWeek('all');
                  setFilterBank('all');
                  setSearchQuery('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas clave - Primera fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tendencia de Gastos"
          value={displayStats.expenseTrend ? `${displayStats.expenseTrend > 0 ? '+' : ''}${displayStats.expenseTrend.toFixed(1)}%` : 'N/A'}
          subtitle={hasActiveFilters ? "según filtros" : "vs últimos 3 meses"}
          icon={displayStats.expenseTrend && displayStats.expenseTrend > 0 ? TrendingUp : TrendingDown}
          iconColor={displayStats.expenseTrend && displayStats.expenseTrend > 0 ? "text-red-500" : "text-green-500"}
          explanation={displayStats.expenseTrend ? 
            `Tus gastos ${displayStats.expenseTrend > 0 ? 'aumentaron' : 'disminuyeron'} un ${Math.abs(displayStats.expenseTrend).toFixed(1)}% en promedio comparado con los 3 meses anteriores. ${displayStats.expenseTrend > 0 ? 'Considera revisar tus hábitos de gasto.' : '¡Excelente control de gastos!'}` 
            : 'No hay suficientes datos históricos para calcular la tendencia.'}
        />

        <MetricCard
          title="Total Transacciones"
          value={displayStats.totalTransactions || 0}
          subtitle={hasActiveFilters ? "filtradas" : "registradas"}
          icon={Calendar}
          iconColor="text-primary"
          explanation={`Tienes ${displayStats.totalTransactions || 0} transacción(es) ${hasActiveFilters ? 'filtrada(s)' : 'registrada(s)'} en total. ${displayStats.totalTransactions && displayStats.totalTransactions > 100 ? 'Tienes un buen historial de datos para análisis.' : 'Sigue agregando transacciones para análisis más precisos.'}`}
        />

        <MetricCard
          title="Gasto Promedio"
          value={formatCurrency(displayStats.avgTransactionAmount || 0, defaultCurrency)}
          subtitle="por transacción"
          icon={DollarSign}
          iconColor="text-primary"
          explanation={`El promedio de cada transacción de gasto es ${formatCurrency(displayStats.avgTransactionAmount || 0, defaultCurrency)}. Esto te ayuda a entender el tamaño típico de tus gastos.`}
        />

        <MetricCard
          title="Tasa de Ahorro"
          value={`${displayStats.savingsRate?.toFixed(1) || 0}%`}
          subtitle="del total de ingresos"
          icon={Target}
          iconColor="text-primary"
          explanation={`Estás ahorrando el ${displayStats.savingsRate?.toFixed(1) || 0}% de tus ingresos. ${(displayStats.savingsRate || 0) >= 20 ? '¡Excelente tasa de ahorro!' : (displayStats.savingsRate || 0) >= 10 ? 'Buena tasa de ahorro, puedes mejorarla.' : 'Considera aumentar tu tasa de ahorro para mayor seguridad financiera.'}`}
        />
      </div>

      {/* Métricas adicionales - Segunda fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gasto Diario Promedio"
          value={formatCurrency(displayStats.avgDailyExpense || 0, defaultCurrency)}
          subtitle={hasActiveFilters ? "según filtros" : "promedio general"}
          icon={Clock}
          iconColor="text-red-500"
          explanation={`En promedio, gastas ${formatCurrency(displayStats.avgDailyExpense || 0, defaultCurrency)} por día. Multiplicado por 30 días, esto representa aproximadamente ${formatCurrency((displayStats.avgDailyExpense || 0) * 30, defaultCurrency)} mensuales.`}
        />

        <MetricCard
          title="Ingreso Diario Promedio"
          value={formatCurrency(displayStats.avgDailyIncome || 0, defaultCurrency)}
          subtitle={hasActiveFilters ? "según filtros" : "promedio general"}
          icon={Zap}
          iconColor="text-green-500"
          explanation={`En promedio, recibes ${formatCurrency(displayStats.avgDailyIncome || 0, defaultCurrency)} por día. Esto te ayuda a proyectar tus ingresos mensuales.`}
        />

        {displayStats.categoryData && displayStats.categoryData.length > 0 && (
          <MetricCard
            title="Categoría Más Gastada"
            value={displayStats.categoryData[0]?.name || 'N/A'}
            subtitle={`${formatCurrency(displayStats.categoryData[0]?.value || 0, defaultCurrency)} (${displayStats.categoryData[0]?.count || 0} transacciones)`}
            icon={Award}
            iconColor="text-purple-500"
            explanation={displayStats.categoryData[0] ? `La categoría "${displayStats.categoryData[0].name}" representa tu mayor gasto con ${formatCurrency(displayStats.categoryData[0].value, defaultCurrency)} en ${displayStats.categoryData[0].count} transacciones.` : 'No hay datos disponibles.'}
          />
        )}
      </div>

      {/* Gráfico diario */}
      {displayStats.dailyData && displayStats.dailyData.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Actividad Diaria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayStats.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                    }}
                    formatter={(value: number) => formatCurrency(value, defaultCurrency)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="hsl(142 76% 36%)" 
                    strokeWidth={2}
                    name="Ingresos"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expense" 
                    stroke="hsl(0 84.2% 60.2%)" 
                    strokeWidth={2}
                    name="Gastos"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Comercios */}
        {displayStats.topMerchants && displayStats.topMerchants.length > 0 && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Top Comercios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayStats.topMerchants.slice(0, 10).map((merchant, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{merchant.name}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(merchant.value, defaultCurrency)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gastos más grandes */}
        {displayStats.largestExpenses && displayStats.largestExpenses.length > 0 && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-red-500" />
                Gastos Más Grandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayStats.largestExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50/50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{expense.merchant}</p>
                      <p className="text-xs text-muted-foreground">{expense.description}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {expense.category}
                      </Badge>
                    </div>
                    <p className="font-bold text-red-600 ml-4">
                      {formatCurrency(expense.amount, defaultCurrency)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Análisis por categoría con barras */}
      {displayStats.categoryData && displayStats.categoryData.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Gastos por Categoría (Detallado)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayStats.categoryData.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                    }}
                    formatter={(value: number) => 
                      formatCurrency(value, defaultCurrency)
                    }
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(221 83% 53%)" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor, 
  explanation 
}: { 
  title: string; 
  value: string | number; 
  subtitle: string; 
  icon: any; 
  iconColor: string; 
  explanation?: string;
}) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            {explanation && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <p className="text-xs">{explanation}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          {value}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
