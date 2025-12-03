/**
 * Script para inicializar PocketBase usando el SDK oficial
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
  console.log("dotenv no disponible");
}

let POCKETBASE_URL = process.env.POCKETBASE_URL || "https://estadosdecuenta-db.david-cloud.online/_/";
// Usar la URL exactamente como está configurada - NO remover nada
if (POCKETBASE_URL.endsWith("/") && !POCKETBASE_URL.endsWith("/_/")) {
  POCKETBASE_URL = POCKETBASE_URL.slice(0, -1);
}

const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function main() {
  try {
    // Intentar importar PocketBase SDK
    const { default: PocketBase } = await import("pocketbase");
    
    console.log(`🔐 Conectando a PocketBase...`);
    console.log(`URL configurada: ${POCKETBASE_URL}`);
    
    // SDK de PocketBase necesita la URL base sin /_/ para la API
    let apiUrl = POCKETBASE_URL;
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.replace("/_/", "/");
    }
    console.log(`URL API: ${apiUrl}\n`);

    const pb = new PocketBase(apiUrl);

    // Autenticar como admin
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      console.log("🔑 Autenticando como administrador...");
      try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log("✓ Autenticación exitosa\n");
      } catch (error: any) {
        console.error(`✗ Error de autenticación: ${error.message}`);
        console.log("\n💡 Nota: Si el endpoint de admin no está disponible, crea las colecciones manualmente desde el panel web.\n");
        return;
      }
    } else {
      console.log("⚠️  No hay credenciales de admin configuradas\n");
      return;
    }

    // Verificar colecciones existentes
    console.log("📦 Verificando colecciones existentes...");
    try {
      const collections = await pb.collections.getFullList();
      console.log(`   Encontradas ${collections.length} colecciones:`);
      collections.forEach((c: any) => {
        console.log(`     - ${c.name} (${c.type})`);
      });
      console.log("");

      const hasUsers = collections.some((c: any) => c.name === "users");
      const hasTransactions = collections.some((c: any) => c.name === "transactions");

      if (hasUsers && hasTransactions) {
        console.log("✅ Todas las colecciones necesarias ya existen!");
        return;
      }

      // Crear colección users si no existe
      if (!hasUsers) {
        console.log("📝 Creando colección 'users'...");
        try {
          await pb.collections.create({
            name: "users",
            type: "auth",
            schema: [
              { name: "username", type: "text", required: true, unique: true },
              { name: "password", type: "text", required: true },
            ],
          });
          console.log("✓ Colección 'users' creada\n");
        } catch (error: any) {
          console.error(`✗ Error creando 'users': ${error.message}\n`);
        }
      }

      // Crear colección transactions si no existe
      if (!hasTransactions) {
        console.log("📝 Creando colección 'transactions'...");
        try {
          await pb.collections.create({
            name: "transactions",
            type: "base",
            schema: [
              { name: "id_number", type: "number", required: false },
              { name: "date", type: "text", required: true },
              { name: "description", type: "text", required: true },
              { name: "amount", type: "number", required: true },
              { name: "type", type: "text", required: true },
              { name: "category", type: "text", required: true },
              { name: "merchant", type: "text", required: true },
              { name: "currency", type: "text", required: true, options: { defaultValue: "MXN" } },
            ],
          });
          console.log("✓ Colección 'transactions' creada\n");
        } catch (error: any) {
          console.error(`✗ Error creando 'transactions': ${error.message}\n`);
        }
      }

      console.log("✅ Inicialización completada!");
    } catch (error: any) {
      console.error(`✗ Error accediendo a colecciones: ${error.message}`);
    }
  } catch (error: any) {
    if (error.message.includes("Cannot find module")) {
      console.error("❌ El SDK de PocketBase no está instalado.");
      console.log("   Ejecuta: npm install pocketbase");
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();

