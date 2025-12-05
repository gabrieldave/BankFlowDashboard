/**
 * Script para verificar transacciones usando el SDK de PocketBase (como en producción)
 */

try {
  const dotenv = await import("dotenv");
  if (dotenv.default) {
    dotenv.default.config();
  } else if (dotenv.config) {
    dotenv.config();
  }
} catch (e) {
  console.log("dotenv no disponible");
}

import PocketBase from "pocketbase";

const baseUrl = process.env.POCKETBASE_URL || "";
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

async function verificarConSDK() {
  try {
    console.log("🔍 Verificando con SDK de PocketBase...\n");
    
    // Configurar URL como en storage.ts
    let apiUrl = baseUrl.trim();
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.slice(0, -3);
    }
    if (!apiUrl.endsWith("/")) {
      apiUrl += "/";
    }
    
    const pb = new PocketBase(apiUrl);
    
    // Autenticar
    console.log("🔐 Autenticando...");
    await pb.collection('_superusers').authWithPassword(adminEmail!, adminPassword!);
    console.log("✅ Autenticación exitosa\n");
    
    // Obtener transacciones usando getFullList (como en getAllTransactions)
    console.log("📊 Obteniendo transacciones...");
    let records: any[] = [];
    
    try {
      records = await pb.collection('transactions').getFullList();
      console.log(`✅ Obtenidas ${records.length} transacciones con getFullList\n`);
    } catch (error: any) {
      console.log(`⚠️  Error con getFullList: ${error.message}`);
      console.log("🔄 Intentando con paginación...\n");
      
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const result = await pb.collection('transactions').getList(page, 500);
        records.push(...(result.items || []));
        hasMore = result.items && result.items.length === 500;
        page++;
        console.log(`   Página ${page - 1}: ${result.items?.length || 0} transacciones`);
      }
    }
    
    console.log(`\n📊 Total encontrado: ${records.length} transacciones\n`);
    
    if (records.length === 0) {
      console.log("❌ NO hay transacciones guardadas");
      return;
    }
    
    // Mostrar estructura completa de la primera transacción
    console.log("📋 Estructura completa de la primera transacción:");
    console.log(JSON.stringify(records[0], null, 2));
    console.log("\n");
    
    // Mostrar algunas transacciones
    console.log("📋 Primeras 5 transacciones:");
    records.slice(0, 5).forEach((t: any, idx: number) => {
      console.log(`   ${idx + 1}. ID: ${t.id}`);
      console.log(`      Campos disponibles: ${Object.keys(t).join(', ')}`);
      if (t.date) console.log(`      Fecha: ${t.date}`);
      if (t.description) console.log(`      Descripción: ${t.description?.substring(0, 50)}`);
      if (t.amount) console.log(`      Monto: ${t.amount}`);
      if (t.type) console.log(`      Tipo: ${t.type}`);
      console.log("");
    });
    
    // Estadísticas
    const withData = records.filter((t: any) => t.date || t.description || t.amount);
    const income = records.filter((t: any) => t.type === 'income').length;
    const expense = records.filter((t: any) => t.type === 'expense').length;
    
    console.log(`📊 Estadísticas:`);
    console.log(`   - Total: ${records.length}`);
    console.log(`   - Con datos: ${withData.length}`);
    console.log(`   - Ingresos: ${income}`);
    console.log(`   - Gastos: ${expense}\n`);
    
    if (records.length >= 140 && records.length <= 160) {
      console.log(`✅ Hay ${records.length} transacciones guardadas (cerca de las 149 extraídas)`);
      if (withData.length === records.length) {
        console.log("✅ Todas las transacciones tienen datos completos");
        console.log("✅ Las transacciones SÍ están guardadas correctamente en PocketBase");
        console.log("💡 El usuario NO necesita volver a subir el PDF\n");
      } else {
        console.log(`⚠️  Solo ${withData.length} de ${records.length} transacciones tienen datos`);
        console.log("⚠️  Puede haber un problema con el guardado de datos\n");
      }
    }
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

verificarConSDK();


