/**
 * Script para borrar transacciones vacías de PocketBase
 * Ejecutar: tsx server/borrar-transacciones-vacias.ts
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

async function borrarTransaccionesVacias() {
  try {
    console.log("🗑️  Borrando transacciones vacías de PocketBase...\n");
    
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
    
    // Obtener todas las transacciones
    console.log("📊 Obteniendo transacciones...");
    let allRecords: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const result = await pb.collection('transactions').getList(page, 500);
      allRecords.push(...(result.items || []));
      hasMore = result.items && result.items.length === 500;
      page++;
      console.log(`   Página ${page - 1}: ${result.items?.length || 0} transacciones`);
    }
    
    console.log(`\n📊 Total encontrado: ${allRecords.length} transacciones\n`);
    
    if (allRecords.length === 0) {
      console.log("✅ No hay transacciones para borrar\n");
      return;
    }
    
    // Filtrar transacciones vacías (sin datos)
    const transaccionesVacias = allRecords.filter((t: any) => 
      !t.date && !t.description && !t.amount && !t.type
    );
    
    const transaccionesConDatos = allRecords.filter((t: any) => 
      t.date || t.description || t.amount || t.type
    );
    
    console.log(`📊 Análisis:`);
    console.log(`   - Total: ${allRecords.length}`);
    console.log(`   - Vacías (sin datos): ${transaccionesVacias.length}`);
    console.log(`   - Con datos: ${transaccionesConDatos.length}\n`);
    
    if (transaccionesVacias.length === 0) {
      console.log("✅ No hay transacciones vacías para borrar\n");
      return;
    }
    
    // Confirmar borrado
    console.log(`⚠️  Se van a borrar ${transaccionesVacias.length} transacciones vacías`);
    console.log(`⚠️  Se conservarán ${transaccionesConDatos.length} transacciones con datos\n`);
    
    // Borrar transacciones vacías
    console.log("🗑️  Borrando transacciones vacías...");
    let borradas = 0;
    let errores = 0;
    
    for (const record of transaccionesVacias) {
      try {
        await pb.collection('transactions').delete(record.id);
        borradas++;
        if (borradas % 10 === 0) {
          console.log(`   Borradas: ${borradas}/${transaccionesVacias.length}`);
        }
      } catch (error: any) {
        errores++;
        console.error(`   Error borrando ${record.id}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Proceso completado:`);
    console.log(`   - Transacciones borradas: ${borradas}`);
    console.log(`   - Errores: ${errores}`);
    console.log(`   - Transacciones conservadas: ${transaccionesConDatos.length}\n`);
    
    // Verificar resultado final
    console.log("🔍 Verificando resultado final...");
    const finalResult = await pb.collection('transactions').getList(1, 1);
    const totalFinal = finalResult.totalItems || 0;
    console.log(`📊 Total de transacciones restantes: ${totalFinal}\n`);
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

borrarTransaccionesVacias();

