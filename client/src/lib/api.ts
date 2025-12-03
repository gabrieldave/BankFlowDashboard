export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
  currency?: string;
  createdAt: Date;
}

export interface Stats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  categoryData: { name: string; value: number; count?: number; average?: number }[];
  monthlyData: { name: string; income: number; expense: number; balance?: number }[];
  dailyData?: { date: string; name: string; income: number; expense: number }[];
  topMerchants?: { name: string; value: number }[];
  expenseTrend?: number;
  largestExpenses?: Array<{ id: number; description: string; merchant: string; category: string; amount: number; date: string }>;
  largestIncomes?: Array<{ id: number; description: string; merchant: string; category: string; amount: number; date: string }>;
  totalTransactions?: number;
  avgTransactionAmount?: number;
}

export async function uploadFile(file: File): Promise<{ message: string; count: number; transactions: Transaction[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error subiendo archivo');
  }

  return response.json();
}

export async function getTransactions(): Promise<Transaction[]> {
  const response = await fetch('/api/transactions');
  
  if (!response.ok) {
    throw new Error('Error obteniendo transacciones');
  }

  return response.json();
}

export async function getStats(): Promise<Stats> {
  const response = await fetch('/api/stats');
  
  if (!response.ok) {
    throw new Error('Error obteniendo estadísticas');
  }

  return response.json();
}

export async function deleteTransaction(id: number): Promise<void> {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Error eliminando transacción');
  }
}

export async function deleteAllTransactions(): Promise<void> {
  const response = await fetch('/api/transactions', {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Error eliminando transacciones');
  }
}

export async function updateTransactionsCurrency(currency: string = 'MXN'): Promise<{ message: string; updated: number }> {
  const response = await fetch('/api/transactions/update-currency', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currency }),
  });

  if (!response.ok) {
    // Intentar parsear como JSON, si falla, usar el texto
    let errorMessage = 'Error actualizando currency';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (e) {
      const text = await response.text();
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
