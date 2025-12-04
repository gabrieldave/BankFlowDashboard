/**
 * Script para agregar todos los campos faltantes a la colección transactions
 */

import * as dotenv from "dotenv";
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

async function authenticateAdmin(): Promise<string> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD son requeridos");
  }

  if (!POCKETBASE_URL) {
    throw new Error("POCKETBASE_URL no está configurada");
  }

  console.log(`🔐 Autenticando con PocketBase...`);
  console.log(`Conectando a: ${POCKETBASE_URL}`);

  if (typeof process !== "undefined" && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "1") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const apiUrl = getApiUrl();
  const endpoint = "api/collections/_superusers/auth-with-password";
  const authUrl = apiUrl + endpoint;
  console.log(`Intentando autenticación en: ${authUrl}`);

  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Error de autenticación: ${response.status} ${response.statusText}`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = `Error de autenticación: ${error.message || errorMessage}`;
    } catch {
      errorMessage = `Error de autenticación: ${errorText || errorMessage}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log("✓ Autenticación exitosa\n");
  return data.token;
}

async function main() {
  try {
    const token = await authenticateAdmin();
    const apiUrl = getApiUrl();

    // Obtener la colección actual
    console.log("📋 Obteniendo información de la colección transactions...");
    const getResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!getResponse.ok) {
      throw new Error(`Error obteniendo colección: ${getResponse.status} ${getResponse.statusText}`);
    }

    const collection = await getResponse.json();
    console.log(`✓ Colección encontrada: ${collection.name}`);
    console.log(`  Campos actuales: ${collection.fields.length}`);
    collection.fields.forEach((field: any) => {
      console.log(`    - ${field.name} (${field.type})`);
    });
    console.log("");

    // Campos que deben existir
    const requiredFields = [
      { name: "id_number", type: "number", required: false },
      { name: "date", type: "text", required: true },
      { name: "description", type: "text", required: true },
      { name: "amount", type: "number", required: true },
      { name: "type", type: "text", required: true },
      { name: "category", type: "text", required: true },
      { name: "merchant", type: "text", required: true },
      { name: "currency", type: "text", required: true },
      { name: "bank", type: "text", required: false }, // Ya existe, pero lo incluimos por si acaso
    ];

    // Verificar qué campos faltan
    const existingFieldNames = new Set(collection.fields.map((f: any) => f.name));
    const fieldsToAdd = requiredFields.filter(f => !existingFieldNames.has(f.name));

    if (fieldsToAdd.length === 0) {
      console.log("✅ Todos los campos ya existen. No hay nada que agregar.");
      return;
    }

    console.log(`📝 Campos a agregar: ${fieldsToAdd.length}`);
    fieldsToAdd.forEach(f => {
      console.log(`    - ${f.name} (${f.type})${f.required ? ' [REQUERIDO]' : ''}`);
    });
    console.log("");

    // Agregar campos faltantes uno por uno
    console.log("🔧 Agregando campos faltantes...");
    for (const field of fieldsToAdd) {
      try {
        const fieldData: any = {
          name: field.name,
          type: field.type,
          required: field.required || false,
        };

        // Agregar opciones específicas según el tipo
        if (field.type === "text" && field.name === "currency") {
          fieldData.options = { defaultValue: "MXN" };
        }

        const addFieldResponse = await fetch(`${apiUrl}api/collections/transactions`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fields: [...collection.fields, fieldData],
          }),
        });

        if (!addFieldResponse.ok) {
          const errorText = await addFieldResponse.text();
          console.error(`❌ Error agregando campo ${field.name}:`, errorText);
          throw new Error(`Error agregando campo ${field.name}: ${addFieldResponse.status} ${addFieldResponse.statusText}`);
        }

        // Actualizar la colección local para el siguiente campo
        const updatedCollection = await addFieldResponse.json();
        collection.fields = updatedCollection.fields;
        console.log(`✓ Campo "${field.name}" agregado exitosamente`);
      } catch (error: any) {
        console.error(`❌ Error agregando campo ${field.name}:`, error.message);
        throw error;
      }
    }

    console.log("\n✅ Todos los campos agregados exitosamente!");
    console.log("\n📋 Campos finales en la colección:");
    collection.fields.forEach((field: any) => {
      if (!field.system) {
        console.log(`    - ${field.name} (${field.type})${field.required ? ' [REQUERIDO]' : ''}`);
      }
    });

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

