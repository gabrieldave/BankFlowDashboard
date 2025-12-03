import type { InsertTransaction } from "@shared/schema";
import { classifyTransaction, classifyTransactionsBatch } from "./ai-service";

let pdfParse: any;

async function getPdfParser() {
  if (!pdfParse) {
    pdfParse = (await import("pdf-parse")).default;
  }
  return pdfParse;
}

export async function parseCSV(content: string): Promise<InsertTransaction[]> {
  const lines = content.trim().split('\n');
  const rawTransactions: Array<{ date: string; description: string; amount: number }> = [];
  
  // Primero extraer todas las transacciones
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
    
    if (cols.length >= 3) {
      const amount = parseFloat(cols[2]);
      if (isNaN(amount)) continue;
      
      rawTransactions.push({
        date: cols[0] || new Date().toISOString().split('T')[0],
        description: cols[1] || 'Sin descripción',
        amount: amount,
      });
    }
  }

  if (rawTransactions.length === 0) {
    return [];
  }

  // Clasificar todas las transacciones usando IA (en batch para eficiencia)
  const classifications = await classifyTransactionsBatch(rawTransactions);
  
  // Combinar datos con clasificaciones
  const transactions: InsertTransaction[] = rawTransactions.map((raw, idx) => {
    const classification = classifications[idx] || {
      category: 'General',
      merchant: raw.description.split(' ').slice(0, 3).join(' ') || 'Desconocido',
      confidence: 0.5,
    };

    return {
      date: raw.date,
      description: raw.description,
      amount: Math.abs(raw.amount).toString(),
      type: raw.amount >= 0 ? 'income' : 'expense',
      category: classification.category,
      merchant: classification.merchant,
    };
  });
  
  return transactions;
}

export async function parsePDF(buffer: Buffer): Promise<InsertTransaction[]> {
  try {
    const parser = await getPdfParser();
    const data = await parser(buffer);
    const text = data.text;
    
    const rawTransactions: Array<{ date: string; description: string; amount: number }> = [];
    const lines = text.split('\n');
    
    // Extraer todas las transacciones primero
    for (const line of lines) {
      const transaction = extractTransactionFromLine(line);
      if (transaction) {
        rawTransactions.push({
          date: transaction.date,
          description: transaction.description,
          amount: parseFloat(transaction.amount) * (transaction.type === 'income' ? 1 : -1),
        });
      }
    }

    if (rawTransactions.length === 0) {
      return [];
    }

    // Clasificar todas las transacciones usando IA
    const classifications = await classifyTransactionsBatch(rawTransactions);
    
    // Combinar datos con clasificaciones
    const transactions: InsertTransaction[] = rawTransactions.map((raw, idx) => {
      const classification = classifications[idx] || {
        category: 'General',
        merchant: raw.description.split(' ').slice(0, 3).join(' ') || 'Desconocido',
        confidence: 0.5,
      };

      return {
        date: raw.date,
        description: raw.description,
        amount: Math.abs(raw.amount).toString(),
        type: raw.amount >= 0 ? 'income' : 'expense',
        category: classification.category,
        merchant: classification.merchant,
      };
    });
    
    return transactions;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('No se pudo procesar el PDF. Intenta con un archivo CSV.');
  }
}

function extractTransactionFromLine(line: string): { date: string; description: string; amount: string } | null {
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  const amountPattern = /([\-]?\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2}))/;
  
  const dateMatch = line.match(datePattern);
  const amountMatches = line.match(new RegExp(amountPattern, 'g'));
  
  if (!dateMatch || !amountMatches || amountMatches.length === 0) {
    return null;
  }
  
  const date = normalizeDate(dateMatch[1]);
  const amountStr = amountMatches[amountMatches.length - 1]
    .replace(/\./g, '')
    .replace(',', '.');
  const amount = parseFloat(amountStr);
  
  if (isNaN(amount)) return null;
  
  const description = line
    .replace(datePattern, '')
    .replace(amountPattern, '')
    .trim()
    .slice(0, 200);
  
  if (!description) return null;
  
  return {
    date,
    description,
    amount: Math.abs(amount).toString(),
  };
}

function normalizeDate(dateStr: string): string {
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return new Date().toISOString().split('T')[0];
  
  let [day, month, year] = parts;
  
  if (year.length === 2) {
    year = '20' + year;
  }
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Funciones de categorización básica movidas a ai-service.ts
// Se mantienen aquí solo como fallback si la IA no está disponible
