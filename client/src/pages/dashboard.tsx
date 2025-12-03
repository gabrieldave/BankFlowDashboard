import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  TrendingUp,
  Search,
  Filter,
  Download,
  Loader2
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
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: transactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });

  // Filtrar y ordenar transacciones
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    let filtered = [...transactions];
    
    // Aplicar búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(query) ||
        t.merchant.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.amount.includes(query)
      );
    }
    
    // Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    return filtered;
  }, [transactions, searchQuery]);

  if (loadingTransactions || loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (!transactions || !stats) {
    return (
      <div className="text-center space-y-4 py-12">
        <h2 className="text-2xl font-heading font-bold">No hay datos disponibles</h2>
        <p className="text-muted-foreground">Sube tu primer archivo para comenzar a visualizar tus finanzas.</p>
      </div>
    );
  }

  const categoryDataWithColors = stats.categoryData.map((cat, idx) => ({
    ...cat,
    color: CHART_COLORS[idx % CHART_COLORS.length]
  }));

  // Obtener la moneda más común de las transacciones, o usar MXN por defecto
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900" data-testid="text-dashboard-title">Panel Financiero</h1>
          <p className="text-muted-foreground">
            Resumen de tus finanzas basado en {transactions.length} {transactions.length === 1 ? 'transacción' : 'transacciones'}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" data-testid="button-export">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" data-testid="button-new-report">
            <TrendingUp className="h-4 w-4" />
            Nuevo Reporte
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Balance Total" 
          amount={stats.totalBalance} 
          trend="+2.5%" 
          trendUp={true}
          icon={Wallet}
          color="text-primary"
          bgColor="bg-blue-50"
          testId="card-balance"
          currency={defaultCurrency}
        />
        <SummaryCard 
          title="Ingresos" 
          amount={stats.monthlyIncome} 
          trend="+12%" 
          trendUp={true}
          icon={ArrowUpRight}
          color="text-green-600"
          bgColor="bg-green-50"
          testId="card-income"
          currency={defaultCurrency}
        />
        <SummaryCard 
          title="Gastos" 
          amount={stats.monthlyExpenses} 
          trend="-5%" 
          trendUp={true}
          icon={ArrowDownRight}
          color="text-red-600"
          bgColor="bg-red-50"
          testId="card-expenses"
          currency={defaultCurrency}
        />
        <SummaryCard 
          title="Tasa de Ahorro" 
          amount={stats.savingsRate} 
          isPercent={true}
          trend="+4.2%" 
          trendUp={true}
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-50"
          testId="card-savings"
          currency={defaultCurrency}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Evolución del Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0 84.2% 60.2%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(0 84.2% 60.2%)" stopOpacity={0}/>
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
                  />
                  <Legend />
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
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full relative">
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
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Total Gastos</p>
                  <p className="text-xl font-bold text-foreground">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.monthlyExpenses)}
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
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                className="pl-9 h-9 w-[200px] bg-gray-50 border-gray-200 focus-visible:ring-primary/20" 
                data-testid="input-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200" data-testid="button-filter">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </Button>
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
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-0 font-normal">
                      {transaction.category}
                    </Badge>
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

function SummaryCard({ title, amount, trend, trendUp, icon: Icon, color, bgColor, isPercent = false, testId, currency = 'MXN' }: any) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200" data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <Badge variant={trendUp ? "default" : "destructive"} className={`${
            trendUp ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
          } border-0`}>
            {trend}
          </Badge>
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
