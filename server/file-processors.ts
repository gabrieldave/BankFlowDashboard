import type { InsertTransaction } from "@shared/schema";

let pdfParse: any;

async function getPdfParser() {
  if (!pdfParse) {
    pdfParse = (await import("pdf-parse")).default;
  }
  return pdfParse;
}

export async function parseCSV(content: string): Promise<InsertTransaction[]> {
  const lines = content.trim().split('\n');
  const transactions: InsertTransaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
    
    if (cols.length >= 3) {
      const amount = parseFloat(cols[2]);
      if (isNaN(amount)) continue;
      
      transactions.push({
        date: cols[0] || new Date().toISOString().split('T')[0],
        description: cols[1] || 'Sin descripción',
        amount: Math.abs(amount).toString(),
        type: amount >= 0 ? 'income' : 'expense',
        category: cols[3] || categorizeTransaction(cols[1]),
        merchant: cols[4] || cols[1] || 'Desconocido',
      });
    }
  }
  
  return transactions;
}

export async function parsePDF(buffer: Buffer): Promise<InsertTransaction[]> {
  try {
    const parser = await getPdfParser();
    const data = await parser(buffer);
    const text = data.text;
    
    const transactions: InsertTransaction[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const transaction = extractTransactionFromLine(line);
      if (transaction) {
        transactions.push(transaction);
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('No se pudo procesar el PDF. Intenta con un archivo CSV.');
  }
}

function extractTransactionFromLine(line: string): InsertTransaction | null {
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
    type: amount >= 0 ? 'income' : 'expense',
    category: categorizeTransaction(description),
    merchant: extractMerchant(description),
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

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  const categories: Record<string, string[]> = {
    'Alimentación': ['mercadona', 'carrefour', 'lidl', 'dia', 'supermercado', 'alimentacion'],
    'Transporte': ['uber', 'cabify', 'gasolinera', 'repsol', 'cepsa', 'metro', 'renfe'],
    'Restaurantes': ['restaurante', 'vips', 'mcdonalds', 'burger', 'pizza', 'cafe', 'bar'],
    'Entretenimiento': ['netflix', 'spotify', 'hbo', 'prime', 'cine', 'teatro'],
    'Compras': ['zara', 'amazon', 'ebay', 'corte ingles', 'fnac', 'media markt'],
    'Salud': ['farmacia', 'hospital', 'medico', 'clinica', 'dentista'],
    'Vivienda': ['alquiler', 'hipoteca', 'luz', 'agua', 'gas', 'internet'],
    'Salario': ['nomina', 'salario', 'sueldo', 'paga'],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return category;
    }
  }
  
  return 'General';
}

function extractMerchant(description: string): string {
  const words = description.split(' ').filter(w => w.length > 2);
  return words.slice(0, 3).join(' ') || 'Desconocido';
}
