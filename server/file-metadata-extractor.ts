/**
 * Extrae metadata del archivo (mes, año) para verificación de duplicados
 * antes de procesar con IA
 */

export interface FileMetadata {
  month: number | null; // 1-12
  year: number | null;
  extractedFrom: 'filename' | 'content' | null;
}

/**
 * Extrae mes y año del nombre del archivo
 */
export function extractMetadataFromFilename(fileName: string): FileMetadata {
  const lowerFileName = fileName.toLowerCase();
  
  // Patrones de meses en español
  const monthPatterns = [
    { names: ['enero', 'ene'], number: 1 },
    { names: ['febrero', 'feb'], number: 2 },
    { names: ['marzo', 'mar'], number: 3 },
    { names: ['abril', 'abr'], number: 4 },
    { names: ['mayo', 'may'], number: 5 },
    { names: ['junio', 'jun'], number: 6 },
    { names: ['julio', 'jul'], number: 7 },
    { names: ['agosto', 'ago'], number: 8 },
    { names: ['septiembre', 'sep', 'sept'], number: 9 },
    { names: ['octubre', 'oct'], number: 10 },
    { names: ['noviembre', 'nov'], number: 11 },
    { names: ['diciembre', 'dic'], number: 12 },
  ];

  // Buscar mes en el nombre del archivo
  let foundMonth: number | null = null;
  for (const pattern of monthPatterns) {
    for (const name of pattern.names) {
      if (lowerFileName.includes(name)) {
        foundMonth = pattern.number;
        break;
      }
    }
    if (foundMonth) break;
  }

  // Buscar año (4 dígitos: 2020-2099)
  const yearMatch = lowerFileName.match(/\b(20[0-9]{2})\b/);
  const foundYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

  // También buscar formato MM/YYYY o MM-YYYY
  const dateFormatMatch = lowerFileName.match(/\b(0?[1-9]|1[0-2])[\/\-](20[0-9]{2})\b/);
  if (dateFormatMatch) {
    const monthFromFormat = parseInt(dateFormatMatch[1], 10);
    const yearFromFormat = parseInt(dateFormatMatch[2], 10);
    if (!foundMonth) foundMonth = monthFromFormat;
    if (!foundYear) return { month: monthFromFormat, year: yearFromFormat, extractedFrom: 'filename' };
  }

  return {
    month: foundMonth,
    year: foundYear,
    extractedFrom: foundMonth || foundYear ? 'filename' : null,
  };
}

/**
 * Extrae mes y año del contenido del PDF (primera página)
 */
export function extractMetadataFromContent(text: string): FileMetadata {
  const lowerText = text.toLowerCase();
  
  // Patrones de meses en español
  const monthPatterns = [
    { names: ['enero', 'ene'], number: 1 },
    { names: ['febrero', 'feb'], number: 2 },
    { names: ['marzo', 'mar'], number: 3 },
    { names: ['abril', 'abr'], number: 4 },
    { names: ['mayo', 'may'], number: 5 },
    { names: ['junio', 'jun'], number: 6 },
    { names: ['julio', 'jul'], number: 7 },
    { names: ['agosto', 'ago'], number: 8 },
    { names: ['septiembre', 'sep', 'sept'], number: 9 },
    { names: ['octubre', 'oct'], number: 10 },
    { names: ['noviembre', 'nov'], number: 11 },
    { names: ['diciembre', 'dic'], number: 12 },
  ];

  // Buscar mes en el texto (solo primeros 2000 caracteres para velocidad)
  const searchText = lowerText.substring(0, 2000);
  let foundMonth: number | null = null;
  for (const pattern of monthPatterns) {
    for (const name of pattern.names) {
      if (searchText.includes(name)) {
        foundMonth = pattern.number;
        break;
      }
    }
    if (foundMonth) break;
  }

  // Buscar año (4 dígitos: 2020-2099)
  const yearMatch = searchText.match(/\b(20[0-9]{2})\b/);
  const foundYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

  // Buscar formato de fecha común en estados de cuenta: "Periodo: Noviembre 2024"
  const periodoMatch = searchText.match(/periodo[:\s]+([a-z]+)[\s]+(20[0-9]{2})/i);
  if (periodoMatch) {
    const monthName = periodoMatch[1].toLowerCase();
    const yearFromPeriodo = parseInt(periodoMatch[2], 10);
    for (const pattern of monthPatterns) {
      if (pattern.names.some(name => monthName.includes(name) || name.includes(monthName))) {
        return {
          month: pattern.number,
          year: yearFromPeriodo,
          extractedFrom: 'content',
        };
      }
    }
  }

  return {
    month: foundMonth,
    year: foundYear,
    extractedFrom: foundMonth || foundYear ? 'content' : null,
  };
}

/**
 * Verifica si un archivo ya fue procesado basándose en mes/año/banco
 */
export function checkIfFileAlreadyProcessed(
  existingTransactions: Array<{ date: string; bank?: string }>,
  month: number,
  year: number,
  bank?: string
): boolean {
  if (!month || !year) {
    return false; // No podemos verificar sin mes/año
  }

  // Crear un set de meses/años/bancos únicos de las transacciones existentes
  const processedCombinations = new Set<string>();
  
  for (const transaction of existingTransactions) {
    try {
      const date = new Date(transaction.date);
      if (isNaN(date.getTime())) continue;
      
      const transMonth = date.getMonth() + 1;
      const transYear = date.getFullYear();
      const transBank = (transaction.bank || '').trim().toLowerCase();
      
      // Crear clave: mes-año-banco
      const key = `${transYear}-${String(transMonth).padStart(2, '0')}-${transBank}`;
      processedCombinations.add(key);
    } catch (e) {
      // Ignorar fechas inválidas
      continue;
    }
  }

  // Verificar si esta combinación ya existe
  const checkBank = (bank || '').trim().toLowerCase();
  const checkKey = `${year}-${String(month).padStart(2, '0')}-${checkBank}`;
  
  return processedCombinations.has(checkKey);
}

