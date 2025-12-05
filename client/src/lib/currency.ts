/**
 * Utilidades para formateo de moneda en el cliente
 */

export const CURRENCY_LOCALES: Record<string, string> = {
  'MXN': 'es-MX',
  'USD': 'en-US',
  'EUR': 'es-ES',
  'GBP': 'en-GB',
  'CAD': 'en-CA',
  'ARS': 'es-AR',
  'CLP': 'es-CL',
  'COP': 'es-CO',
  'PEN': 'es-PE',
  'BRL': 'pt-BR',
};

/**
 * Formatea un monto con la moneda especificada
 */
export function formatCurrency(amount: number | string, currencyCode: string = 'MXN'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0.00';
  
  const locale = CURRENCY_LOCALES[currencyCode] || 'es-MX';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  } catch (error) {
    // Fallback si hay error
    const symbols: Record<string, string> = {
      'MXN': '$',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'ARS': '$',
      'CLP': '$',
      'COP': '$',
      'PEN': 'S/',
      'BRL': 'R$',
    };
    const symbol = symbols[currencyCode] || '$';
    return `${symbol}${numAmount.toFixed(2)}`;
  }
}

/**
 * Obtiene la moneda de una transacción o usa el default
 */
export function getTransactionCurrency(transaction: { currency?: string }, defaultCurrency: string = 'MXN'): string {
  return transaction.currency || defaultCurrency;
}






