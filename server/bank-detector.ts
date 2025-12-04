/**
 * Detector de bancos basado en palabras clave y patrones
 * Soporta bancos de Latinoamérica y EEUU
 */

export interface BankInfo {
  id: string;
  name: string;
  keywords: string[];
  patterns: RegExp[];
  country?: string;
}

export const SUPPORTED_BANKS: BankInfo[] = [
  // México
  {
    id: 'banamex',
    name: 'Banamex',
    keywords: ['banamex', 'citibanamex', 'citibank méxico'],
    patterns: [/banamex/i, /citibanamex/i],
    country: 'México'
  },
  {
    id: 'bbva',
    name: 'BBVA México',
    keywords: ['bbva', 'bbva bancomer'],
    patterns: [/bbva/i, /bancomer/i],
    country: 'México'
  },
  {
    id: 'santander',
    name: 'Santander México',
    keywords: ['santander', 'banco santander'],
    patterns: [/santander/i],
    country: 'México'
  },
  {
    id: 'hsbc',
    name: 'HSBC México',
    keywords: ['hsbc'],
    patterns: [/hsbc/i],
    country: 'México'
  },
  {
    id: 'banorte',
    name: 'Banorte',
    keywords: ['banorte'],
    patterns: [/banorte/i],
    country: 'México'
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank México',
    keywords: ['scotiabank', 'scotia'],
    patterns: [/scotiabank/i, /scotia/i],
    country: 'México'
  },
  {
    id: 'inbursa',
    name: 'Banco Inbursa',
    keywords: ['inbursa'],
    patterns: [/inbursa/i],
    country: 'México'
  },
  {
    id: 'mercadolibre',
    name: 'Mercado Pago / Mercado Libre',
    keywords: ['mercado pago', 'mercado libre', 'mercadopago', 'mercadolibre'],
    patterns: [/mercado\s*(pago|libre)/i, /mercadopago/i, /mercadolibre/i],
    country: 'México/Latinoamérica'
  },
  {
    id: 'openbank',
    name: 'Open Bank',
    keywords: ['open bank', 'openbank'],
    patterns: [/open\s*bank/i, /openbank/i],
    country: 'México'
  },
  {
    id: 'a-banco',
    name: 'A Banco',
    keywords: ['a banco', 'abanco'],
    patterns: [/a\s*banco/i, /abanco/i],
    country: 'México'
  },
  {
    id: 'nu',
    name: 'Nu México',
    keywords: ['nu mexico', 'nu bank', 'nubank'],
    patterns: [/nu\s*(mexico|bank)/i, /nubank/i],
    country: 'México'
  },
  {
    id: 'stori',
    name: 'Stori',
    keywords: ['stori'],
    patterns: [/stori/i],
    country: 'México'
  },
  {
    id: 'uala',
    name: 'Ualá',
    keywords: ['uala', 'ualá'],
    patterns: [/uala/i, /ualá/i],
    country: 'México/Argentina'
  },
  // EEUU
  {
    id: 'chase',
    name: 'Chase Bank',
    keywords: ['chase', 'jpmorgan chase'],
    patterns: [/chase/i, /jpmorgan/i],
    country: 'EEUU'
  },
  {
    id: 'bank-of-america',
    name: 'Bank of America',
    keywords: ['bank of america', 'bofa'],
    patterns: [/bank\s*of\s*america/i, /bofa/i],
    country: 'EEUU'
  },
  {
    id: 'wells-fargo',
    name: 'Wells Fargo',
    keywords: ['wells fargo'],
    patterns: [/wells\s*fargo/i],
    country: 'EEUU'
  },
  {
    id: 'citi',
    name: 'Citibank',
    keywords: ['citibank', 'citi'],
    patterns: [/citibank/i, /^citi\b/i],
    country: 'EEUU'
  },
  {
    id: 'us-bank',
    name: 'U.S. Bank',
    keywords: ['us bank', 'u.s. bank'],
    patterns: [/u\.?s\.?\s*bank/i],
    country: 'EEUU'
  },
  // Otros países Latinoamérica
  {
    id: 'bancolombia',
    name: 'Bancolombia',
    keywords: ['bancolombia'],
    patterns: [/bancolombia/i],
    country: 'Colombia'
  },
  {
    id: 'banco-de-chile',
    name: 'Banco de Chile',
    keywords: ['banco de chile'],
    patterns: [/banco\s*de\s*chile/i],
    country: 'Chile'
  },
  {
    id: 'itau',
    name: 'Itaú',
    keywords: ['itau', 'itaú'],
    patterns: [/itau/i, /itaú/i],
    country: 'Brasil'
  },
  {
    id: 'bradesco',
    name: 'Bradesco',
    keywords: ['bradesco'],
    patterns: [/bradesco/i],
    country: 'Brasil'
  },
];

/**
 * Detecta el banco basado en el contenido del archivo o nombre
 */
export function detectBank(
  fileName: string,
  fileContent?: string,
  firstPageText?: string
): { bank: BankInfo | null; confidence: number } {
  const searchText = [
    fileName.toLowerCase(),
    fileContent?.toLowerCase() || '',
    firstPageText?.toLowerCase() || ''
  ].join(' ');

  let bestMatch: { bank: BankInfo; score: number } | null = null;

  for (const bank of SUPPORTED_BANKS) {
    let score = 0;

    // Buscar keywords
    for (const keyword of bank.keywords) {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matches = searchText.match(regex);
      if (matches) {
        score += matches.length * 2; // Keywords tienen más peso
      }
    }

    // Buscar patterns
    for (const pattern of bank.patterns) {
      const matches = searchText.match(pattern);
      if (matches) {
        score += matches.length * 3; // Patterns tienen aún más peso
      }
    }

    // Si el nombre del archivo contiene el nombre del banco, dar bonus
    if (fileName.toLowerCase().includes(bank.name.toLowerCase())) {
      score += 5;
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { bank, score };
    }
  }

  if (bestMatch && bestMatch.score >= 2) {
    const confidence = Math.min(100, (bestMatch.score / 10) * 100);
    return { bank: bestMatch.bank, confidence };
  }

  return { bank: null, confidence: 0 };
}

/**
 * Obtiene la lista de bancos soportados para mostrar en el selector
 */
export function getSupportedBanksList(): Array<{ id: string; name: string; country?: string }> {
  return SUPPORTED_BANKS.map(bank => ({
    id: bank.id,
    name: bank.name,
    country: bank.country
  }));
}

