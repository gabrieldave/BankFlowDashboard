/**
 * Detector de moneda automático
 * Detecta la moneda desde símbolos, códigos ISO y patrones en el texto
 */

export interface CurrencyInfo {
  code: string; // Código ISO (MXN, USD, EUR, etc.)
  symbol: string; // Símbolo ($, €, £, etc.)
  name: string; // Nombre completo
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  MXN: { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  USD: { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'Libra Esterlina' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Dólar Canadiense' },
  ARS: { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
  CLP: { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
  COP: { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' },
};

/**
 * Detecta la moneda desde un texto (CSV o PDF extraído)
 */
export function detectCurrencyFromText(text: string, defaultCurrency: string = 'MXN'): string {
  const upperText = text.toUpperCase();
  
  // 1. Buscar códigos ISO de moneda explícitos (MXN, USD, EUR, etc.)
  for (const [code, info] of Object.entries(SUPPORTED_CURRENCIES)) {
    // Buscar código ISO seguido de espacio, número, o al final de línea
    const codePattern = new RegExp(`\\b${code}\\b`, 'i');
    if (codePattern.test(upperText)) {
      console.log(`Moneda detectada por código ISO: ${code}`);
      return code;
    }
  }
  
  // 2. Buscar símbolos de moneda específicos
  const symbolPatterns: Array<{ symbol: string; currency: string }> = [
    { symbol: '€', currency: 'EUR' },
    { symbol: '£', currency: 'GBP' },
    { symbol: 'R$', currency: 'BRL' },
    { symbol: 'S/', currency: 'PEN' },
    { symbol: 'C$', currency: 'CAD' },
  ];
  
  for (const { symbol, currency } of symbolPatterns) {
    if (text.includes(symbol)) {
      console.log(`Moneda detectada por símbolo: ${currency} (${symbol})`);
      return currency;
    }
  }
  
  // 3. Detectar por contexto geográfico y patrones
  // México
  if (upperText.includes('MEXICO') || upperText.includes('MÉXICO') || 
      upperText.includes('BANAMEX') || upperText.includes('BANCOMER') ||
      upperText.includes('BBVA') || upperText.includes('SANTANDER MEXICO')) {
    console.log('Moneda detectada por contexto: MXN (México)');
    return 'MXN';
  }
  
  // Estados Unidos
  if (upperText.includes('USA') || upperText.includes('UNITED STATES') ||
      upperText.includes('AMERICAN') || upperText.includes('US BANK')) {
    console.log('Moneda detectada por contexto: USD (Estados Unidos)');
    return 'USD';
  }
  
  // Europa
  if (upperText.includes('EUROPA') || upperText.includes('SPAIN') ||
      upperText.includes('ESPAÑA') || upperText.includes('FRANCE') ||
      upperText.includes('GERMANY') || upperText.includes('ITALY')) {
    console.log('Moneda detectada por contexto: EUR (Europa)');
    return 'EUR';
  }
  
  // Reino Unido
  if (upperText.includes('UK') || upperText.includes('UNITED KINGDOM') ||
      upperText.includes('BRITISH')) {
    console.log('Moneda detectada por contexto: GBP (Reino Unido)');
    return 'GBP';
  }
  
  // Argentina
  if (upperText.includes('ARGENTINA') || upperText.includes('BANCO NACION')) {
    console.log('Moneda detectada por contexto: ARS (Argentina)');
    return 'ARS';
  }
  
  // Chile
  if (upperText.includes('CHILE') || upperText.includes('BANCO DE CHILE')) {
    console.log('Moneda detectada por contexto: CLP (Chile)');
    return 'CLP';
  }
  
  // Colombia
  if (upperText.includes('COLOMBIA') || upperText.includes('BANCO DE BOGOTA')) {
    console.log('Moneda detectada por contexto: COP (Colombia)');
    return 'COP';
  }
  
  // 4. Detectar formato de número (pistas sobre moneda)
  // Si hay muchos números con formato mexicano (1,234.56), probablemente MXN
  const mexicanFormat = /\d{1,3}(,\d{3})*\.\d{2}/g;
  const mexicanMatches = text.match(mexicanFormat);
  if (mexicanMatches && mexicanMatches.length > 3) {
    console.log('Moneda detectada por formato numérico: MXN');
    return 'MXN';
  }
  
  // Si hay muchos números con formato europeo (1.234,56), probablemente EUR
  const europeanFormat = /\d{1,3}(\.\d{3})*,\d{2}/g;
  const europeanMatches = text.match(europeanFormat);
  if (europeanMatches && europeanMatches.length > 3) {
    console.log('Moneda detectada por formato numérico: EUR');
    return 'EUR';
  }
  
  console.log(`No se pudo detectar moneda, usando default: ${defaultCurrency}`);
  return defaultCurrency;
}

/**
 * Obtiene información de una moneda por su código
 */
export function getCurrencyInfo(code: string): CurrencyInfo {
  return SUPPORTED_CURRENCIES[code.toUpperCase()] || SUPPORTED_CURRENCIES.MXN;
}

/**
 * Formatea un monto con la moneda especificada
 */
export function formatCurrency(amount: number, currencyCode: string, locale: string = 'es-MX'): string {
  const info = getCurrencyInfo(currencyCode);
  
  // Mapeo de códigos de moneda a locales
  const localeMap: Record<string, string> = {
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
  
  const localeToUse = localeMap[currencyCode] || locale;
  
  try {
    return new Intl.NumberFormat(localeToUse, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback si hay error
    return `${info.symbol}${amount.toFixed(2)}`;
  }
}

