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
  Legend
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

  // Obtener semanas únicas
  const getAvailableWeeks = () => {
    if (transactionsLength === 0) return [];
    try {
      const weekMap = new Map<string, string>();
      transactionsArray.forEach(t => {
        try {
          if (!t?.date) return;
          const date = new Date(t.date);
          if (!isNaN(date.getTime())) {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)).padStart(2, '0')}`;
            if (!weekMap.has(weekKey)) {
              const weekLabel = `Semana del ${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
              weekMap.set(weekKey, weekLabel);
            }
          }
        } catch {}
      });
      return Array.from(weekMap.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => b.key.localeCompare(a.key));
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
            const date = new Date(t.date);
            if (isNaN(date.getTime())) return false;
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)).padStart(2, '0')}`;
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

  // Calcular datos del gráfico según el modo de vista
  const getChartData = () => {
    if (!stats?.monthlyData || !Array.isArray(stats.monthlyData) || stats.monthlyData.length === 0) {
      return [];
    }
    
    try {
      if (viewMode === 'monthly') {
        let cumulativeBalance = 0;
        let cumulativeIncome = 0;
        let cumulativeExpense = 0;
        
        return stats.monthlyData.map((month) => {
          if (!month || typeof month !== 'object') return null;
          cumulativeIncome += (month.income || 0);
          cumulativeExpense += (month.expense || 0);
          cumulativeBalance = cumulativeIncome - cumulativeExpense;
          
          return {
            ...month,
            cumulativeBalance: parseFloat(cumulativeBalance.toFixed(2)),
            cumulativeIncome: parseFloat(cumulativeIncome.toFixed(2)),
            cumulativeExpense: parseFloat(cumulativeExpense.toFixed(2)),
          };
        }).filter((item): item is NonNullable<typeof item> => item !== null);
      }
      return stats.monthlyData.filter((month) => month && typeof month === 'object');
    } catch {
      return [];
    }
  };
  const chartData = getChartData();

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
          amount={stats?.totalBalance || 0} 
          trend={stats?.balanceTrend !== undefined 
            ? `${stats.balanceTrend >= 0 ? '+' : ''}${stats.balanceTrend.toFixed(1)}%`
            : 'N/A'
          }
          trendUp={stats?.balanceTrend === undefined || stats.balanceTrend >= 0}
          trendExplanation={stats?.balanceTrend !== undefined 
            ? `Tu balance ${stats.balanceTrend >= 0 ? 'aumentó' : 'disminuyó'} un ${Math.abs(stats.balanceTrend).toFixed(1)}% comparado con el mes anterior. ${stats.balanceTrend >= 0 ? '¡Excelente progreso financiero!' : 'Revisa tus gastos para mejorar tu balance.'}`
            : 'Tu balance total representa la diferencia entre todos tus ingresos y gastos registrados.'
          }
          icon={Wallet}
          color="text-primary"
          bgColor="bg-blue-50"
          testId="card-balance"
          currency={defaultCurrency}
        />
        <SummaryCard 
          title="Ingresos" 
          amount={stats?.monthlyIncome || 0} 
          trend="+12%" 
          trendUp={true}
          trendExplanation="Los ingresos aumentaron un 12% comparado con el mes anterior. Esto indica un crecimiento positivo en tus entradas de dinero."
          icon={ArrowUpRight}
          color="text-green-600"
          bgColor="bg-green-50"
          testId="card-income"
          currency={defaultCurrency}
        />
        <SummaryCard 
          title="Gastos" 
          amount={stats?.monthlyExpenses || 0} 
          trend="-5%" 
          trendUp={false}
          trendExplanation="Los gastos disminuyeron un 5% comparado con el mes anterior. Esto es positivo ya que estás gastando menos."
          icon={ArrowDownRight}
          color="text-red-600"
          bgColor="bg-red-50"
          testId="card-expenses"
          currency={defaultCurrency}
        />
        <SummaryCard 
          title="Tasa de Ahorro" 
          amount={stats?.savingsRate || 0} 
          isPercent={true}
          trend="+4.2%" 
          trendUp={true}
          trendExplanation={`Tu tasa de ahorro es del ${stats?.savingsRate || 0}%. Esto significa que ahorras ${stats?.savingsRate || 0}% de tus ingresos después de cubrir todos tus gastos.`}
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-50"
          testId="card-savings"
          currency={defaultCurrency}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <div className="h-[300px] w-full">
              {!chartData || chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2">
                    <p className="text-sm">No hay datos para mostrar en el gráfico</p>
                    {loadingStats && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto" />
                    )}
                  </div>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={chartData} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0 84.2% 60.2%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(0 84.2% 60.2%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dy={10}
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
                    formatter={tooltipFormatter}
                  />
                  <Legend />
                  {viewMode === 'monthly' ? (
                    <>
                      <Area 
                        type="monotone" 
                        dataKey="cumulativeBalance" 
                        stroke="hsl(221 83% 53%)" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorBalance)"
                        name="Balance Acumulado"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulativeIncome" 
                        stroke="hsl(142 76% 36%)" 
                        strokeWidth={2}
                        fillOpacity={0.2} 
                        fill="url(#colorIncome)"
                        name="Ingresos Acumulados"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulativeExpense" 
                        stroke="hsl(0 84.2% 60.2%)" 
                        strokeWidth={2}
                        fillOpacity={0.2} 
                        fill="url(#colorExpense)"
                        name="Gastos Acumulados"
                      />
                    </>
                  ) : (
                    <>
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stroke="hsl(142 76% 36%)" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorIncome)"
                        name="Ingresos"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expense" 
                        stroke="hsl(0 84.2% 60.2%)" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorExpense)"
                        name="Gastos"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="hsl(221 83% 53%)" 
                        strokeWidth={2}
                        fillOpacity={0.3} 
                        fill="url(#colorBalance)"
                        name="Balance"
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full relative">
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
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryDataWithColors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Total Gastos</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(stats?.monthlyExpenses || 0, defaultCurrency)}
                  </p>
                </div>
              </div>
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
