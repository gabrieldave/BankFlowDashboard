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
  balanceTrend?: number;
  largestExpenses?: Array<{ id: number; description: string; merchant: string; category: string; amount: number; date: string }>;
  largestIncomes?: Array<{ id: number; description: string; merchant: string; category: string; amount: number; date: string }>;
  totalTransactions?: number;
  avgTransactionAmount?: number;
  avgDailyExpense?: number;
  avgDailyIncome?: number;
  mostSpentDay?: { day: string; amount: number } | null;
  topCategory?: { name: string; amount: number; count: number } | null;
  mostFrequentMerchant?: { name: string; count: number } | null;
}

export async function uploadFile(file: File, signal?: AbortSignal): Promise<{ message: string; count: number; duplicates?: number; skipped?: number; transactions: Transaction[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    signal, // Pasar el signal para poder cancelar
    keepalive: true, // Mantener la petición activa aunque la pestaña esté inactiva
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

export async function updateTransactionsCurrency(currency: string = 'MXN', updateAll: boolean = true): Promise<{ message: string; updated: number; errors?: number }> {
  const response = await fetch('/api/transactions/update-currency', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currency, updateAll }),
  });

  if (!response.ok) {
    // Intentar parsear como JSON, si falla, usar el texto
    let errorMessage = 'Error actualizando currency';
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = 'Error desconocido al actualizar currency';
      }
    } else {
      // Si no es JSON, probablemente es HTML (error 404/500)
      const text = await response.text();
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        errorMessage = `Error del servidor (${response.status}). El endpoint puede no estar disponible.`;
      } else {
        errorMessage = text.substring(0, 200) || errorMessage;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
