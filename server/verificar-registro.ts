/**
 * Script para verificar un registro completo de transacciones en PocketBase
 */

import PocketBase from "pocketbase";
import * as dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

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

    // Obtener un registro usando getList
    console.log("📋 Obteniendo registros con getList (sin fields)...");
    const listResult = await pb.collection("transactions").getList(1, 1);
    
    if (listResult.items.length === 0) {
      console.log("⚠️ No hay registros en la colección");
      return;
    }

    const firstRecord = listResult.items[0];
    console.log("📄 Registro obtenido con getList (sin fields):");
    console.log(JSON.stringify(firstRecord, null, 2));
    console.log("\n");

    // Verificar qué campos tiene
    const hasDate = firstRecord.date !== undefined;
    const hasDescription = firstRecord.description !== undefined;
    const hasAmount = firstRecord.amount !== undefined;
    const hasType = firstRecord.type !== undefined;
    const hasCategory = firstRecord.category !== undefined;
    const hasMerchant = firstRecord.merchant !== undefined;
    const hasBank = (firstRecord as any).bank !== undefined;

    console.log("🔍 Campos presentes:");
    console.log(`  - date: ${hasDate ? "✓" : "✗"}`);
    console.log(`  - description: ${hasDescription ? "✓" : "✗"}`);
    console.log(`  - amount: ${hasAmount ? "✓" : "✗"}`);
    console.log(`  - type: ${hasType ? "✓" : "✗"}`);
    console.log(`  - category: ${hasCategory ? "✓" : "✗"}`);
    console.log(`  - merchant: ${hasMerchant ? "✓" : "✗"}`);
    console.log(`  - bank: ${hasBank ? "✓" : "✗"}`);
    console.log("\n");

    // Intentar obtener con getOne
    console.log("📋 Obteniendo registro con getOne (sin fields)...");
    const oneResult = await pb.collection("transactions").getOne(firstRecord.id);
    console.log("📄 Registro obtenido con getOne (sin fields):");
    console.log(JSON.stringify(oneResult, null, 2));
    console.log("\n");

    // Intentar con API REST directamente
    console.log("📋 Obteniendo registro con API REST (sin fields)...");
    const apiUrl = getApiUrl();
    const token = pb.authStore.token;
    const restResponse = await fetch(`${apiUrl}api/collections/transactions/records/${firstRecord.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (restResponse.ok) {
      const restData = await restResponse.json();
      console.log("📄 Registro obtenido con API REST (sin fields):");
      console.log(JSON.stringify(restData, null, 2));
    } else {
      console.error(`❌ Error en API REST: ${restResponse.status} ${restResponse.statusText}`);
    }

    // Verificar el schema de la colección
    console.log("\n📋 Verificando schema de la colección...");
    const collectionResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (collectionResponse.ok) {
      const collectionData = await collectionResponse.json();
      console.log("📄 Información completa de la colección:");
      console.log(JSON.stringify(collectionData, null, 2));
      console.log("\n📄 Schema de la colección:");
      if (collectionData.schema) {
        console.log(JSON.stringify(collectionData.schema, null, 2));
        console.log("\n🔍 Campos en el schema:");
        collectionData.schema.forEach((field: any) => {
          console.log(`  - ${field.name} (${field.type})${field.required ? ' [REQUERIDO]' : ''}`);
        });
      } else {
        console.log("⚠️ Schema es undefined o null");
      }
    } else {
      console.error(`❌ Error obteniendo colección: ${collectionResponse.status} ${collectionResponse.statusText}`);
      const errorText = await collectionResponse.text();
      console.error("Error:", errorText);
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

