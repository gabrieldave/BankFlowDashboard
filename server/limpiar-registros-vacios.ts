/**
 * Script para limpiar registros vacíos de la colección transactions
 * Los registros vacíos son aquellos que solo tienen el campo "bank" pero no tienen
 * date, description, amount válidos (se crearon cuando solo existía el campo bank)
 */

import * as dotenv from "dotenv";
dotenv.config();

import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.POCKETBASE_URL?.trim() || "";
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL?.trim() || "";
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD?.trim() || "";

function getApiUrl(): string {
  let apiUrl = POCKETBASE_URL;
  if (apiUrl.endsWith("/_/")) {
    apiUrl = apiUrl.slice(0, -3);
  }
  if (!apiUrl.endsWith("/")) {
    apiUrl += "/";
  }
  return apiUrl;
}

async function main() {
  if (!POCKETBASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("❌ Variables de entorno faltantes");
    process.exit(1);
  }

  console.log("🔐 Conectando a PocketBase...");
  const pb = new PocketBase(POCKETBASE_URL.replace("/_/", ""));

  try {
    // Autenticar
    await pb.collection("_superusers").authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Autenticación exitosa\n");

    // Obtener todos los registros
    console.log("📋 Analizando registros...");
    let allRecords: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await pb.collection("transactions").getList(page, 500);
      allRecords.push(...result.items);
      hasMore = result.items.length === 500;
      page++;
    }

    console.log(`✓ Total de registros encontrados: ${allRecords.length}\n`);

    // Identificar registros vacíos
    // Un registro está vacío si:
    // - No tiene date válido O
    // - No tiene description válido O
    // - No tiene amount válido (0, null, undefined, o string vacío)
    const emptyRecords = allRecords.filter((record: any) => {
      const hasDate = record.date && String(record.date).trim() !== '';
      const hasDescription = record.description && String(record.description).trim() !== '';
      const amount = record.amount;
      const hasAmount = amount !== undefined && amount !== null && 
                       String(amount).trim() !== '' && 
                       parseFloat(String(amount)) !== 0;

      // Si no tiene al menos date Y description Y amount válido, es un registro vacío
      return !(hasDate && hasDescription && hasAmount);
    });

    console.log(`📊 Análisis de registros:`);
    console.log(`   - Total: ${allRecords.length}`);
    console.log(`   - Válidos: ${allRecords.length - emptyRecords.length}`);
    console.log(`   - Vacíos: ${emptyRecords.length}\n`);

    if (emptyRecords.length === 0) {
      console.log("✅ No hay registros vacíos. Todo está bien!");
      return;
    }

    // Mostrar algunos ejemplos
    console.log("📄 Ejemplos de registros vacíos:");
    emptyRecords.slice(0, 3).forEach((record: any, idx: number) => {
      console.log(`\n   ${idx + 1}. ID: ${record.id}`);
      console.log(`      - date: "${record.date || '(vacío)'}"`);
      console.log(`      - description: "${record.description || '(vacío)'}"`);
      console.log(`      - amount: ${record.amount !== undefined ? record.amount : '(vacío)'}`);
      console.log(`      - bank: "${record.bank || '(vacío)'}"`);
    });

    // Preguntar qué hacer
    console.log("\n" + "=".repeat(60));
    console.log("⚠️  OPCIONES:");
    console.log("1. ELIMINAR registros vacíos (recomendado)");
    console.log("2. MANTENER registros vacíos (no afectan estadísticas pero ocupan espacio)");
    console.log("=".repeat(60));
    console.log("\n💡 RECOMENDACIÓN:");
    console.log("   - Los registros vacíos NO afectan las estadísticas (se filtran)");
    console.log("   - Pero ocupan espacio en la base de datos");
    console.log("   - Pueden aparecer en el dashboard como transacciones sin datos");
    console.log("   - Recomendamos ELIMINARLOS para mantener la base de datos limpia\n");

    // Por defecto, eliminar (puedes cambiar esto si quieres)
    const shouldDelete = process.env.DELETE_EMPTY_RECORDS !== "false"; // Por defecto true

    if (shouldDelete) {
      console.log("🗑️  Eliminando registros vacíos...\n");
      
      let deleted = 0;
      let errors = 0;

      for (const record of emptyRecords) {
        try {
          await pb.collection("transactions").delete(record.id);
          deleted++;
          if (deleted % 10 === 0) {
            process.stdout.write(`\r   Progreso: ${deleted}/${emptyRecords.length} eliminados...`);
          }
        } catch (error: any) {
          errors++;
          console.error(`\n   ❌ Error eliminando ${record.id}: ${error.message}`);
        }
      }

      console.log(`\n\n✅ Proceso completado:`);
      console.log(`   - Eliminados: ${deleted}`);
      console.log(`   - Errores: ${errors}`);
      console.log(`   - Restantes: ${allRecords.length - deleted} registros válidos\n`);
    } else {
      console.log("ℹ️  Manteniendo registros vacíos (no se eliminaron)\n");
      console.log("💡 Para eliminarlos en el futuro, ejecuta este script con DELETE_EMPTY_RECORDS=true");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

