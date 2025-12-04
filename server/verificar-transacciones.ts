/**
 * Script para verificar transacciones en PocketBase
 * Ejecutar: tsx server/verificar-transacciones.ts
 */

// Cargar variables de entorno
try {
  const dotenv = await import("dotenv");
  if (dotenv.default) {
    dotenv.default.config();
  } else if (dotenv.config) {
    dotenv.config();
  }
} catch (e) {
  console.log("dotenv no disponible, usando variables de entorno del sistema");
}

import { storage } from "./storage";

async function verificarTransacciones() {
  try {
    console.log("🔍 Verificando transacciones en PocketBase...\n");
    
    const transactions = await storage.getAllTransactions();
    
    console.log(`📊 Total de transacciones encontradas: ${transactions.length}\n`);
    
    if (transactions.length === 0) {
      console.log("❌ NO hay transacciones guardadas en PocketBase");
      console.log("💡 El usuario necesita volver a subir el PDF\n");
      return;
    }
    
    // Estadísticas
    const income = transactions.filter(t => t.type === 'income').length;
    const expense = transactions.filter(t => t.type === 'expense').length;
    
    console.log(`✅ Transacciones guardadas:`);
    console.log(`   - Ingresos: ${income}`);
    console.log(`   - Gastos: ${expense}\n`);
    
    // Mostrar últimas 10 transacciones
    const recent = transactions
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .slice(0, 10);
    
    console.log("📋 Últimas 10 transacciones guardadas:");
    recent.forEach((t, idx) => {
      console.log(`   ${idx + 1}. [${t.date}] ${t.type} - ${t.description?.substring(0, 50)} - $${t.amount}`);
    });
    
    // Verificar si hay aproximadamente 149 transacciones (las que se extrajeron)
    if (transactions.length >= 140 && transactions.length <= 160) {
      console.log(`\n✅ Hay aproximadamente ${transactions.length} transacciones (cerca de las 149 extraídas)`);
      console.log("✅ Las transacciones SÍ están guardadas en PocketBase");
      console.log("💡 El usuario NO necesita volver a subir el PDF\n");
    } else {
      console.log(`\n⚠️  Hay ${transactions.length} transacciones guardadas`);
      console.log("⚠️  No coincide con las 149 transacciones extraídas");
      console.log("💡 El usuario debería verificar o volver a subir el PDF\n");
    }
    
  } catch (error: any) {
    console.error("❌ Error verificando transacciones:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

verificarTransacciones();

