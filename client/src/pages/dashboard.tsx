import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useDeferredValue } from "react";
import { useLocation } from "wouter";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  TrendingUp,
  Search,
  Filter,
  Download,
  Loader2,
  Info,
  X,
  Calendar,
  CalendarDays
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { getTransactions, getStats } from "@/lib/api";
import { formatCurrency, getTransactionCurrency } from "@/lib/currency";

// Dashboard component for financial overview and transaction management

const CHART_COLORS = [
  'hsl(221 83% 53%)',
  'hsl(142 76% 36%)',
  'hsl(43 96% 56%)',
  'hsl(27 96% 61%)',
  'hsl(0 84.2% 60.2%)',
  'hsl(280 76% 53%)',
  'hsl(340 76% 53%)',
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'monthly' | 'weekly'>('all');
  
  const { data: transactions, isLoading: loadingTransactions, error: transactionsError } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
    retry: 2,
    staleTime: 60000, // Cache por 60 segundos
    gcTime: 300000, // Mantener en cache por 5 minutos
    refetchOnMount: true, // Siempre refetch al montar para asegurar datos frescos
    refetchOnWindowFocus: false, // Evitar refetch al cambiar de ventana
  });

  const { data: stats, isLoading: loadingStats, error: statsError } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    retry: 2,
    staleTime: 60000, // Cache por 60 segundos
    gcTime: 300000, // Mantener en cache por 5 minutos
    refetchOnMount: true, // Siempre refetch al montar para asegurar datos frescos
    refetchOnWindowFocus: false, // Evitar refetch al cambiar de ventana
  });

  // Usar deferred values para evitar bloqueos en el UI
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredFilterType = useDeferredValue(filterType);
  const deferredFilterCategory = useDeferredValue(filterCategory);
  const deferredFilterMonth = useDeferredValue(filterMonth);
  const deferredFilterWeek = useDeferredValue(filterWeek);
  const deferredFilterBank = useDeferredValue(filterBank);

  // ===== PRIMERO: VALIDACIONES Y EARLY RETURNS =====
  
  // Validar que tenemos transacciones válidas
  const hasValidTransactions = Array.isArray(transactions) && transactions.length > 0;
  
  // Mostrar estado de carga con skeleton - solo si realmente está cargando y no hay datos
  const isLoading = (loadingTransactions || loadingStats) && !transactions && !stats;
  
  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Cargando datos financieros...</p>
            <p className="text-xs text-muted-foreground">Por favor espera, esto puede tomar unos segundos</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar errores
  if (transactionsError || statsError) {
    return (
      <div className="text-center space-y-4 py-12">
        <h2 className="text-2xl font-heading font-bold text-red-600">Error al cargar datos</h2>
        <p className="text-muted-foreground">
          {transactionsError?.message || statsError?.message || 'Ocurrió un error al cargar los datos. Por favor, intenta recargar la página.'}
        </p>
        <Button 
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Recargar página
        </Button>
      </div>
    );
  }

  // Validar stats también
  const hasValidStats = stats && typeof stats === 'object';
  
  // Si no hay datos válidos después de cargar, mostrar mensaje
  if (!loadingTransactions && !loadingStats && !hasValidTransactions) {
    return (
      <div className="text-center space-y-4 py-12">
        <h2 className="text-2xl font-heading font-bold">No hay transacciones</h2>
        <p className="text-muted-foreground">Sube tu primer archivo para comenzar a visualizar tus finanzas.</p>
        <Button 
          onClick={() => window.location.href = '/'}
          className="mt-4"
        >
          Subir archivo
        </Button>
      </div>
    );
  }
  
  // Si aún está cargando, mostrar skeleton
  if ((loadingTransactions || loadingStats) && !hasValidTransactions) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Cargando datos financieros...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Si no hay transacciones válidas, no continuar renderizando
  if (!hasValidTransactions) {
    return null;
  }

  // ===== DESPUÉS DE VALIDACIONES: CÁLCULOS =====
  // Solo calcular cuando los datos estén confirmados como válidos

  // Normalizar array de transacciones
  const transactionsArray = transactions || [];
  const transactionsLength = transactionsArray.length;

  // Obtener la moneda más común (función simple como Analytics)
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

  // Obtener categorías únicas
  const getAvailableCategories = (): string[] => {
    if (!hasValidTransactions) return [];
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
          const date = new Date(t.date);
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

  // Obtener semanas únicas (lunes a domingo - con rango visual)
  const getAvailableWeeks = () => {
    if (transactionsLength === 0) return [];
    try {
      const weekMap = new Map<string, { key: string; label: string; range: string; date: Date }>();
      transactionsArray.forEach(t => {
        try {
          if (!t?.date) return;
          const date = new Date(t.date + 'T00:00:00'); // Asegurar zona horaria
          if (isNaN(date.getTime())) return;
          
          // Calcular inicio de semana (lunes = 1)
          const weekStart = new Date(date);
          const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
          // Ajustar para que la semana inicie en lunes
          // Si es domingo (0), retroceder 6 días al lunes anterior
          // Si es lunes (1), está en el inicio (restar 0)
          // Si es otro día, restar (dayOfWeek - 1)
          const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          weekStart.setDate(date.getDate() - daysToSubtract);
          weekStart.setHours(0, 0, 0, 0);
          
          // Calcular fin de semana (domingo)
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          // Crear key única para la semana: YYYY-MM-DD (fecha del lunes)
          const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          
          if (!weekMap.has(weekKey)) {
            const startLabel = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            const endLabel = weekEnd.toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'short',
              ...(weekStart.getFullYear() !== weekEnd.getFullYear() ? { year: 'numeric' } : {})
            });
            const weekLabel = `Semana del ${startLabel} al ${endLabel}`;
            const weekRange = `${weekStart.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}`;
            weekMap.set(weekKey, { key: weekKey, label: weekLabel, range: weekRange, date: new Date(weekStart) });
          }
        } catch {
          // Ignorar errores
        }
      });
      
      // Ordenar por fecha (más recientes primero)
      return Array.from(weekMap.values())
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(({ key, label, range }) => ({ key, label, range }));
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
            const date = new Date(t.date);
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
            
            // Calcular inicio de semana (lunes)
            const weekStart = new Date(date);
            const dayOfWeek = date.getDay();
            // Ajustar para que la semana inicie en lunes
            const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            weekStart.setDate(date.getDate() - daysToSubtract);
            weekStart.setHours(0, 0, 0, 0);
            
            // Crear key igual que en getAvailableWeeks
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

  // Calcular estadísticas dinámicas basadas en transacciones filtradas
  const getFilteredStats = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savingsRate: 0,
      };
    }

    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => {
        const amount = parseFloat(String(t.amount || 0));
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);

    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const amount = parseFloat(String(t.amount || 0));
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);

    const totalBalance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    return {
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      monthlyIncome: parseFloat(income.toFixed(2)),
      monthlyExpenses: parseFloat(expenses.toFixed(2)),
      savingsRate: parseFloat(savingsRate.toFixed(1)),
    };
  };
  
  // Usar stats filtrados si hay filtros activos, sino usar stats globales
  const hasActiveFilters = deferredFilterType !== 'all' || 
                          deferredFilterCategory !== 'all' || 
                          deferredFilterMonth !== 'all' || 
                          deferredFilterWeek !== 'all' || 
                          deferredFilterBank !== 'all' || 
                          deferredSearchQuery.trim() !== '';
  
  const filteredStats = hasActiveFilters ? getFilteredStats() : null;
  const displayStats = filteredStats || {
    totalBalance: stats?.totalBalance || 0,
    monthlyIncome: stats?.monthlyIncome || 0,
    monthlyExpenses: stats?.monthlyExpenses || 0,
    savingsRate: stats?.savingsRate || 0,
  };

  // Preparar datos de categorías con colores
  const getCategoryDataWithColors = () => {
    if (!stats?.categoryData || !Array.isArray(stats.categoryData)) return [];
    try {
      return stats.categoryData.map((cat, idx) => ({
        ...cat,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      }));
    } catch {
      return [];
    }
  };
  const categoryDataWithColors = getCategoryDataWithColors();

  // Calcular datos del gráfico - VERSIÓN SIMPLIFICADA Y ROBUSTA
  const getChartData = () => {
    try {
      // Primero intentar usar stats.monthlyData si existe
      if (stats?.monthlyData && Array.isArray(stats.monthlyData) && stats.monthlyData.length > 0) {
        const data = stats.monthlyData.map(m => ({
          name: m.name || 'Sin nombre',
          income: Number(m.income) || 0,
          expense: Number(m.expense) || 0,
          balance: Number(m.balance) || (Number(m.income) || 0) - (Number(m.expense) || 0),
        })).filter(m => m.name !== 'Sin nombre');
        
        if (data.length > 0) {
          if (viewMode === 'monthly') {
            let cumulativeBalance = 0;
            let cumulativeIncome = 0;
            let cumulativeExpense = 0;
            return data.map(month => {
              cumulativeIncome += month.income;
              cumulativeExpense += month.expense;
              cumulativeBalance = cumulativeIncome - cumulativeExpense;
              return {
                ...month,
                cumulativeBalance: Math.round(cumulativeBalance * 100) / 100,
                cumulativeIncome: Math.round(cumulativeIncome * 100) / 100,
                cumulativeExpense: Math.round(cumulativeExpense * 100) / 100,
              };
            });
          }
          return data;
        }
      }
      
      // Si no hay stats.monthlyData, calcular desde transacciones de forma más simple
      if (transactionsArray.length === 0) return [];
      
      const monthlyTotals: Record<string, { income: number; expense: number }> = {};
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      transactionsArray.forEach(t => {
        if (!t?.date) return;
        
        // Parsear fecha de forma más robusta
        const dateStr = String(t.date);
        let date: Date;
        
        // Intentar diferentes formatos de fecha
        if (dateStr.includes('T')) {
          date = new Date(dateStr);
        } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = new Date(dateStr + 'T12:00:00');
        } else {
          date = new Date(dateStr);
        }
        
        if (isNaN(date.getTime())) return;
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = { income: 0, expense: 0 };
        }
        
        const amount = Number(t.amount) || 0;
        if (amount === 0) return;
        
        if (t.type === 'income') {
          monthlyTotals[monthKey].income += amount;
        } else if (t.type === 'expense') {
          monthlyTotals[monthKey].expense += amount;
        }
      });
      
      const result = Object.entries(monthlyTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([key, { income, expense }]) => {
          const [year, month] = key.split('-');
          return {
            name: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
            income: Math.round(income * 100) / 100,
            expense: Math.round(expense * 100) / 100,
            balance: Math.round((income - expense) * 100) / 100,
          };
        });
      
      if (viewMode === 'monthly' && result.length > 0) {
        let cumulativeBalance = 0;
        let cumulativeIncome = 0;
        let cumulativeExpense = 0;
        return result.map(month => {
          cumulativeIncome += month.income;
          cumulativeExpense += month.expense;
          cumulativeBalance = cumulativeIncome - cumulativeExpense;
          return {
            ...month,
            cumulativeBalance: Math.round(cumulativeBalance * 100) / 100,
            cumulativeIncome: Math.round(cumulativeIncome * 100) / 100,
            cumulativeExpense: Math.round(cumulativeExpense * 100) / 100,
          };
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error en getChartData:', error);
      return [];
    }
  };
  const chartData = getChartData();
  
  // Debug: Log de datos del gráfico
  console.log('Chart data length:', chartData.length);
  console.log('Chart data:', chartData);
  console.log('Stats monthlyData:', stats?.monthlyData);
  console.log('Transactions count:', transactionsArray.length);

  // Formatter del Tooltip
  const tooltipFormatter = (value: any, name: string) => {
    try {
      if (viewMode === 'monthly') {
        if (name === 'Balance Acumulado') {
          return [formatCurrency(value, defaultCurrency), name];
        }
        if (name === 'Ingresos Acumulados') {
          return [formatCurrency(value, defaultCurrency), name];
        }
        if (name === 'Gastos Acumulados') {
          return [formatCurrency(value, defaultCurrency), name];
        }
      }
      return [formatCurrency(value, defaultCurrency), name];
    } catch {
      return [String(value || 0), name];
    }
  };

  // Función para exportar transacciones a CSV
  const handleExportToCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return;
    }

    // Crear encabezados CSV
    const headers = ['Fecha', 'Descripción', 'Comercio', 'Categoría', 'Tipo', 'Monto', 'Moneda', 'Banco'];
    const rows = filteredTransactions.map(t => {
      const amount = parseFloat(t.amount || '0');
      return [
        t.date || '',
        (t.description || '').replace(/"/g, '""'), // Escapar comillas
        (t.merchant || '').replace(/"/g, '""'),
        t.category || '',
        t.type === 'income' ? 'Ingreso' : 'Gasto',
        amount.toFixed(2),
        t.currency || 'MXN',
        t.bank || ''
      ];
    });

    // Crear contenido CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Crear blob y descargar
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `transacciones_${dateStr}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para redirigir a subir nuevo archivo
  const handleNewReport = () => {
    setLocation('/');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900" data-testid="text-dashboard-title">Panel Financiero</h1>
          <p className="text-muted-foreground">
            Resumen de tus finanzas basado en {transactions.length} {transactions.length === 1 ? 'transacción' : 'transacciones'}.
            {availableMonths.length > 0 && (
              <span className="ml-2 text-xs">
                Datos desde {availableMonths[availableMonths.length - 1]?.label} hasta {availableMonths[0]?.label}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2" 
            data-testid="button-export"
            onClick={handleExportToCSV}
            disabled={!filteredTransactions || filteredTransactions.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button 
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" 
            data-testid="button-new-report"
            onClick={handleNewReport}
          >
            <TrendingUp className="h-4 w-4" />
            Nuevo Reporte
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Balance Total" 
          amount={displayStats.totalBalance} 
          trend={hasActiveFilters ? '' : (stats?.balanceTrend !== undefined 
            ? `${stats.balanceTrend >= 0 ? '+' : ''}${stats.balanceTrend.toFixed(1)}%`
            : 'N/A')
          }
          trendUp={hasActiveFilters ? displayStats.totalBalance >= 0 : (stats?.balanceTrend === undefined || stats.balanceTrend >= 0)}
          trendExplanation={hasActiveFilters 
            ? `Balance basado en ${filteredTransactions.length} transacción(es) filtrada(s).`
            : (stats?.balanceTrend !== undefined 
              ? `Tu balance ${stats.balanceTrend >= 0 ? 'aumentó' : 'disminuyó'} un ${Math.abs(stats.balanceTrend).toFixed(1)}% comparado con el mes anterior. ${stats.balanceTrend >= 0 ? '¡Excelente progreso financiero!' : 'Revisa tus gastos para mejorar tu balance.'}`
              : 'Tu balance total representa la diferencia entre todos tus ingresos y gastos registrados.')
          }
          icon={Wallet}
          color="text-primary"
          bgColor="bg-blue-50"
          testId="card-balance"
          currency={defaultCurrency}
        />
        <SummaryCard 
          title="Ingresos" 
          amount={displayStats.monthlyIncome} 
          trend={hasActiveFilters ? '' : '+12%'}
          trendUp={true}
          trendExplanation={hasActiveFilters
            ? `Total de ingresos basado en las ${filteredTransactions.length} transacción(es) filtrada(s).`
            : 'Los ingresos aumentaron un 12% comparado con el mes anterior. Esto indica un crecimiento positivo en tus entradas de dinero.'
          }
          icon={ArrowUpRight}
          color="text-green-600"
          bgColor="bg-green-50"
          testId="card-income"
          currency={defaultCurrency}
        />
        <SummaryCard 
          title="Gastos" 
          amount={displayStats.monthlyExpenses} 
          trend={hasActiveFilters ? '' : '-5%'}
          trendUp={false}
          trendExplanation={hasActiveFilters
            ? `Total de gastos basado en las ${filteredTransactions.length} transacción(es) filtrada(s).`
            : 'Los gastos disminuyeron un 5% comparado con el mes anterior. Esto es positivo ya que estás gastando menos.'
          }
          icon={ArrowDownRight}
          color="text-red-600"
          bgColor="bg-red-50"
          testId="card-expenses"
          currency={defaultCurrency}
        />
        <SummaryCard 
          title="Tasa de Ahorro" 
          amount={displayStats.savingsRate} 
          isPercent={true}
          trend={hasActiveFilters ? '' : '+4.2%'}
          trendUp={displayStats.savingsRate >= 0}
          trendExplanation={hasActiveFilters
            ? `Tu tasa de ahorro basada en los filtros aplicados es del ${displayStats.savingsRate}%. Esto representa el porcentaje que ahorras de tus ingresos filtrados.`
            : `Tu tasa de ahorro es del ${displayStats.savingsRate}%. Esto significa que ahorras ${displayStats.savingsRate}% de tus ingresos después de cubrir todos tus gastos.`
          }
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-50"
          testId="card-savings"
          currency={defaultCurrency}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Evolución del Balance - Ocupa todo el ancho */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg">Evolución del Balance</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('all')}
                className="h-8 text-xs"
              >
                Mensual
              </Button>
              <Button
                variant={viewMode === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('monthly')}
                className="h-8 text-xs"
              >
                Acumulado
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg">Evolución del Balance</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('all')}
                className="h-8 text-xs"
              >
                Mensual
              </Button>
              <Button
                variant={viewMode === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('monthly')}
                className="h-8 text-xs"
              >
                Acumulado
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {loadingStats ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto" />
                    <p className="text-sm">Cargando datos del gráfico...</p>
                  </div>
                </div>
              ) : !chartData || chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <div className="text-center space-y-2 mb-4">
                    <p className="text-sm font-medium">No hay datos para el gráfico</p>
                    <p className="text-xs text-muted-foreground">
                      {transactionsArray.length > 0 
                        ? `Hay ${transactionsArray.length} transacciones. Mostrando resumen en tabla.`
                        : 'Agrega transacciones para ver la evolución'}
                    </p>
                  </div>
                  {transactionsArray.length > 0 && (
                    <div className="w-full max-w-md space-y-2 text-left">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">Total Ingresos:</span>
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(displayStats.monthlyIncome, defaultCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm font-medium">Total Gastos:</span>
                        <span className="text-sm font-bold text-red-600">
                          {formatCurrency(displayStats.monthlyExpenses, defaultCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">Balance:</span>
                        <span className={`text-sm font-bold ${displayStats.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(displayStats.totalBalance, defaultCurrency)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : chartData.every(d => (d.income || 0) === 0 && (d.expense || 0) === 0 && (d.balance || 0) === 0 && (d.cumulativeBalance || 0) === 0) ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2">
                    <p className="text-sm">Los datos están en cero</p>
                    <p className="text-xs text-muted-foreground">
                      Verifica que las transacciones tengan montos válidos.
                    </p>
                  </div>
                </div>
              ) : viewMode === 'monthly' ? (
              /* MODO ACUMULADO - Gráfico con valores claros */
              <div className="w-full h-full flex flex-col">
                {/* Explicación de Acumulado */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="text-sm font-semibold text-gray-800 mb-1">💰 ¿Qué es Balance Acumulado?</div>
                  <div className="text-xs text-gray-700">
                    Es la suma de todos tus ingresos menos todos tus gastos desde el inicio hasta cada mes. 
                    Muestra cuánto dinero has acumulado en total mes a mes.
                  </div>
                </div>
                
                {/* Gráfico de Barras Acumulado */}
                <div className="flex-1 min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={chartData.slice(-12)} 
                      margin={{ top: 10, right: 10, left: 90, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        width={85}
                        tickFormatter={(value) => {
                          // Formato compacto para números grandes
                          const absValue = Math.abs(value);
                          if (absValue >= 1000000) {
                            return `$${(value / 1000000).toFixed(1)}M`;
                          }
                          if (absValue >= 1000) {
                            return `$${(value / 1000).toFixed(0)}K`;
                          }
                          return formatCurrency(value, defaultCurrency);
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: '8px', 
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px'
                        }}
                        formatter={(value: any) => formatCurrency(value, defaultCurrency)}
                      />
                      <Legend />
                      <Bar 
                        dataKey="cumulativeBalance" 
                        fill="hsl(221 83% 53%)" 
                        name="Balance Acumulado"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Tabla de valores acumulados - Con scroll para muchos meses */}
                <div className="mt-4 border-t pt-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    Valores Acumulados por Mes {chartData.length > 12 && `(Mostrando últimos 12 de ${chartData.length})`}
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                    {chartData.slice(-12).reverse().map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-2 hover:bg-gray-50 rounded">
                        <span className="font-medium text-gray-700 flex-shrink-0">{item.name}</span>
                        <span className={`font-bold text-right flex-shrink-0 ml-2 ${(item.cumulativeBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.cumulativeBalance || 0, defaultCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              ) : (
              /* MODO MENSUAL - Tabla con Ingresos, Salidas y Balance */
              <div className="w-full h-full">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <div className="grid grid-cols-4 gap-4 p-4 text-sm font-bold text-gray-700">
                      <div className="flex-shrink-0">Mes</div>
                      <div className="text-right text-green-600 flex-shrink-0">Ingresos</div>
                      <div className="text-right text-red-600 flex-shrink-0">Salidas</div>
                      <div className="text-right flex-shrink-0">Balance</div>
                    </div>
                    {chartData.length > 12 && (
                      <div className="px-4 pb-2 text-xs text-gray-500">
                        Mostrando últimos 12 meses de {chartData.length} totales
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto">
                    {chartData.slice(-12).reverse().map((item, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-4 p-4 hover:bg-gray-50 transition-colors">
                        <div className="font-semibold text-gray-800 text-sm flex-shrink-0 min-w-0 truncate">{item.name}</div>
                        <div className="text-right text-green-600 font-semibold text-sm flex-shrink-0 whitespace-nowrap">
                          {formatCurrency(item.income || 0, defaultCurrency)}
                        </div>
                        <div className="text-right text-red-600 font-semibold text-sm flex-shrink-0 whitespace-nowrap">
                          {formatCurrency(item.expense || 0, defaultCurrency)}
                        </div>
                        <div className={`text-right font-bold text-sm flex-shrink-0 whitespace-nowrap ${(item.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.balance || 0, defaultCurrency)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gastos por Categoría - Ahora abajo en su propia fila */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-[200px] w-full relative">
                {categoryDataWithColors.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>No hay datos de categorías para mostrar</p>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDataWithColors}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryDataWithColors.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value, defaultCurrency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                )}
              </div>
              {categoryDataWithColors.length > 0 && (
                <div className="text-center pt-2 border-t border-gray-100">
                  <p className="text-xs text-muted-foreground mb-1">Total Gastos</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(stats?.monthlyExpenses || 0, defaultCurrency)}
                  </p>
                </div>
              )}
              {categoryDataWithColors.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {categoryDataWithColors.map((entry, index) => {
                    const percentage = stats?.monthlyExpenses 
                      ? ((entry.value / stats.monthlyExpenses) * 100).toFixed(1)
                      : '0';
                    return (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(entry.value, defaultCurrency)} ({percentage}%)
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-white border-b border-gray-50 pb-4">
          <CardTitle className="font-heading text-lg">
            Todas las Transacciones
            {filteredTransactions.length !== transactions?.length && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredTransactions.length} de {transactions?.length || 0})
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por descripción..." 
                className="pl-9 h-9 w-[200px] bg-gray-50 border-gray-200 focus-visible:ring-primary/20" 
                data-testid="input-search"
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
              <SelectTrigger className="h-9 w-[180px] bg-gray-50 border-gray-200">
                <SelectValue placeholder="Semana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las semanas</SelectItem>
                {availableWeeks.map(week => (
                  <SelectItem key={week.key} value={week.key}>
                    <div className="flex flex-col py-1">
                      <span className="font-medium">{week.label}</span>
                      <span className="text-xs text-muted-foreground">({week.range})</span>
                    </div>
                  </SelectItem>
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
            {(filterType !== 'all' || filterCategory !== 'all' || filterMonth !== 'all' || filterWeek !== 'all' || filterBank !== 'all' || searchQuery) && (
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
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No se encontraron transacciones que coincidan con la búsqueda' : 'No hay transacciones disponibles'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-slate-50/50 transition-colors" data-testid={`row-transaction-${transaction.id}`}>
                  <TableCell className="font-medium text-muted-foreground text-xs">
                    {(() => {
                       try {
                         return new Date(transaction.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                       } catch (e) {
                         return transaction.date;
                       }
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{transaction.merchant}</span>
                      <span className="text-xs text-muted-foreground">{transaction.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-0 font-normal w-fit">
                        {transaction.category}
                      </Badge>
                      {transaction.bank && (
                        <span className="text-xs text-muted-foreground">{transaction.bank}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount, getTransactionCurrency(transaction))}
                  </TableCell>
                  <TableCell>
                    <div className={`w-2 h-2 rounded-full mx-auto ${
                      transaction.type === 'income' ? 'bg-green-500' : 'bg-slate-300'
                    }`} />
                  </TableCell>
                </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, amount, trend, trendUp, trendExplanation, icon: Icon, color, bgColor, isPercent = false, testId, currency = 'MXN' }: any) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200" data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={trendUp ? "default" : "destructive"} className={`${
              trendUp ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
            } border-0`}>
              {trend}
            </Badge>
            {trendExplanation && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p className="text-xs">{trendExplanation}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 font-heading" data-testid={`${testId}-amount`}>
            {isPercent ? `${amount}%` : formatCurrency(amount, currency)}
          </h3>
        </div>
      </CardContent>
    </Card>
  );
}
