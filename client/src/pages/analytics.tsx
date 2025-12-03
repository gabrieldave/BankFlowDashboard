import { useQuery } from "@tanstack/react-query";
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
  Target
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
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  });

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

  if (!stats) {
    return (
      <div className="text-center space-y-4 py-12">
        <h2 className="text-2xl font-heading font-bold">No hay datos disponibles</h2>
        <p className="text-muted-foreground">Sube tu primer archivo para comenzar a analizar tus finanzas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900">Análisis Avanzado</h1>
        <p className="text-muted-foreground">Insights detallados sobre tus finanzas y patrones de gasto</p>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Tendencia de Gastos</p>
              {stats.expenseTrend && stats.expenseTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.expenseTrend ? (
                <>
                  {stats.expenseTrend > 0 ? '+' : ''}
                  {stats.expenseTrend.toFixed(1)}%
                </>
              ) : (
                'N/A'
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">vs últimos 3 meses</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Transacciones</p>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.totalTransactions || 0}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">registradas</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Gasto Promedio</p>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.avgTransactionAmount || 0, defaultCurrency)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">por transacción</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Tasa de Ahorro</p>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.savingsRate.toFixed(1)}%
            </h3>
            <p className="text-xs text-muted-foreground mt-1">del total de ingresos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico diario */}
      {stats.dailyData && stats.dailyData.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Actividad Diaria (Últimos 30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        {stats.topMerchants && stats.topMerchants.length > 0 && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Top Comercios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topMerchants.slice(0, 10).map((merchant, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{merchant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.categoryData.find(c => c.name === merchant.name)?.count || 0} transacciones
                        </p>
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
        {stats.largestExpenses && stats.largestExpenses.length > 0 && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-red-500" />
                Gastos Más Grandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.largestExpenses.map((expense) => (
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
      {stats.categoryData && stats.categoryData.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Gastos por Categoría (Detallado)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryData.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
