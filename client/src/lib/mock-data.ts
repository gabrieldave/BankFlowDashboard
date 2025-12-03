export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2023-10-25', description: 'Nómina Octubre', amount: 3500.00, type: 'income', category: 'Salario', merchant: 'Empresa S.A.' },
  { id: 't2', date: '2023-10-26', description: 'Supermercado Mercadona', amount: 124.50, type: 'expense', category: 'Alimentación', merchant: 'Mercadona' },
  { id: 't3', date: '2023-10-27', description: 'Netflix Suscripción', amount: 17.99, type: 'expense', category: 'Entretenimiento', merchant: 'Netflix' },
  { id: 't4', date: '2023-10-28', description: 'Gasolinera Repsol', amount: 55.00, type: 'expense', category: 'Transporte', merchant: 'Repsol' },
  { id: 't5', date: '2023-10-30', description: 'Restaurante Vips', amount: 45.20, type: 'expense', category: 'Restaurantes', merchant: 'Vips' },
  { id: 't6', date: '2023-11-01', description: 'Alquiler Noviembre', amount: 950.00, type: 'expense', category: 'Vivienda', merchant: 'Propietario' },
  { id: 't7', date: '2023-11-02', description: 'Transferencia Recibida', amount: 150.00, type: 'income', category: 'Otros Ingresos', merchant: 'Bizum' },
  { id: 't8', date: '2023-11-03', description: 'Spotify Premium', amount: 9.99, type: 'expense', category: 'Entretenimiento', merchant: 'Spotify' },
  { id: 't9', date: '2023-11-05', description: 'Zara Ropa', amount: 89.90, type: 'expense', category: 'Compras', merchant: 'Zara' },
  { id: 't10', date: '2023-11-07', description: 'Farmacia', amount: 23.40, type: 'expense', category: 'Salud', merchant: 'Farmacia Central' },
  { id: 't11', date: '2023-11-10', description: 'Uber Trip', amount: 12.50, type: 'expense', category: 'Transporte', merchant: 'Uber' },
  { id: 't12', date: '2023-11-12', description: 'Cine Yelmo', amount: 32.00, type: 'expense', category: 'Entretenimiento', merchant: 'Cines Yelmo' },
  { id: 't13', date: '2023-11-15', description: 'Gimnasio Mensualidad', amount: 39.90, type: 'expense', category: 'Salud', merchant: 'McFit' },
  { id: 't14', date: '2023-11-25', description: 'Nómina Noviembre', amount: 3500.00, type: 'income', category: 'Salario', merchant: 'Empresa S.A.' },
  { id: 't15', date: '2023-11-26', description: 'Supermercado Carrefour', amount: 156.70, type: 'expense', category: 'Alimentación', merchant: 'Carrefour' },
];

export const SUMMARY_STATS = {
  totalBalance: 14250.50,
  monthlyIncome: 3650.00,
  monthlyExpenses: 1556.98,
  savingsRate: 57.3,
};

export const MONTHLY_DATA = [
  { name: 'Ene', income: 3200, expense: 2100 },
  { name: 'Feb', income: 3400, expense: 1800 },
  { name: 'Mar', income: 3100, expense: 2400 },
  { name: 'Abr', income: 3500, expense: 1900 },
  { name: 'May', income: 3500, expense: 2100 },
  { name: 'Jun', income: 4200, expense: 2800 },
];

export const CATEGORY_DATA = [
  { name: 'Vivienda', value: 950, color: 'hsl(221 83% 53%)' },
  { name: 'Alimentación', value: 450, color: 'hsl(142 76% 36%)' },
  { name: 'Transporte', value: 200, color: 'hsl(43 96% 56%)' },
  { name: 'Entretenimiento', value: 150, color: 'hsl(27 96% 61%)' },
  { name: 'Otros', value: 100, color: 'hsl(0 84.2% 60.2%)' },
];
