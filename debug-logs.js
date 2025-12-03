/**
 * Script para capturar y analizar logs del servidor
 * Uso: node debug-logs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, 'server-logs.txt');
const ERROR_LOG_FILE = path.join(__dirname, 'server-errors.txt');

console.log('🔍 Analizador de Logs del Servidor\n');

// Leer logs si existen
let logs = '';
let errors = '';

if (fs.existsSync(LOG_FILE)) {
  logs = fs.readFileSync(LOG_FILE, 'utf-8');
}

if (fs.existsSync(ERROR_LOG_FILE)) {
  errors = fs.readFileSync(ERROR_LOG_FILE, 'utf-8');
}

// Analizar logs
function analyzeLogs(logContent) {
  const issues = [];
  const warnings = [];
  const info = [];

  const lines = logContent.split('\n');

  lines.forEach((line, index) => {
    // Detectar errores
    if (line.toLowerCase().includes('error') || 
        line.toLowerCase().includes('failed') ||
        line.toLowerCase().includes('exception') ||
        line.toLowerCase().includes('trace')) {
      errors += `${line}\n`;
      
      // Extraer contexto (líneas anteriores y siguientes)
      const context = [];
      for (let i = Math.max(0, index - 2); i <= Math.min(lines.length - 1, index + 2); i++) {
        if (i !== index) {
          context.push(`  ${i + 1}: ${lines[i]}`);
        }
      }
      
      issues.push({
        type: 'ERROR',
        line: index + 1,
        message: line,
        context: context
      });
    }
    
    // Detectar warnings
    if (line.toLowerCase().includes('warn') || 
        line.toLowerCase().includes('fallback') ||
        line.toLowerCase().includes('tradicional')) {
      warnings.push({
        line: index + 1,
        message: line
      });
    }
    
    // Info importante
    if (line.includes('[PDF Parser]') || 
        line.includes('Vision API') ||
        line.includes('transacciones') ||
        line.includes('DEEPSEEK_API_KEY')) {
      info.push({
        line: index + 1,
        message: line
      });
    }
  });

  return { issues, warnings, info };
}

// Mostrar análisis
if (logs) {
  console.log('📊 Análisis de Logs:\n');
  const analysis = analyzeLogs(logs);
  
  if (analysis.issues.length > 0) {
    console.log('❌ ERRORES ENCONTRADOS:\n');
    analysis.issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. Línea ${issue.line}:`);
      console.log(`   ${issue.message}`);
      if (issue.context.length > 0) {
        console.log('   Contexto:');
        issue.context.forEach(ctx => console.log(ctx));
      }
      console.log('');
    });
  } else {
    console.log('✅ No se encontraron errores críticos\n');
  }
  
  if (analysis.warnings.length > 0) {
    console.log('⚠️  ADVERTENCIAS:\n');
    analysis.warnings.slice(0, 10).forEach((warn, idx) => {
      console.log(`${idx + 1}. Línea ${warn.line}: ${warn.message}`);
    });
    console.log('');
  }
  
  if (analysis.info.length > 0) {
    console.log('ℹ️  INFORMACIÓN RELEVANTE:\n');
    analysis.info.slice(-20).forEach((inf) => {
      console.log(`Línea ${inf.line}: ${inf.message}`);
    });
    console.log('');
  }
} else {
  console.log('⚠️  No se encontraron logs. El servidor puede no estar corriendo.\n');
}

// Mostrar últimos errores
if (errors) {
  console.log('📋 ÚLTIMOS ERRORES:\n');
  const errorLines = errors.split('\n').filter(l => l.trim()).slice(-10);
  errorLines.forEach((line, idx) => {
    console.log(`${idx + 1}. ${line}`);
  });
  console.log('');
}

// Guardar errores en archivo
if (errors) {
  fs.writeFileSync(ERROR_LOG_FILE, errors);
  console.log(`💾 Errores guardados en: ${ERROR_LOG_FILE}\n`);
}

// Sugerencias
console.log('💡 SUGERENCIAS:\n');
console.log('1. Para ver logs en tiempo real, ejecuta: npm run dev');
console.log('2. Para capturar logs, redirige la salida: npm run dev > server-logs.txt 2>&1');
console.log('3. Revisa el archivo .env para verificar DEEPSEEK_API_KEY');
console.log('4. Verifica que el servidor esté corriendo en el puerto correcto\n');

