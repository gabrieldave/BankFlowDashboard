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
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function main() {
  try {
    // Intentar importar PocketBase SDK
    const { default: PocketBase } = await import("pocketbase");
    
    console.log(`🔐 Conectando a PocketBase...`);
    console.log(`URL configurada: ${POCKETBASE_URL}`);
    
    // Asegurar que la URL no tenga /_/ al final para el SDK
    let apiUrl = POCKETBASE_URL.trim();
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.slice(0, -3); // Remover "/_/"
    }
    if (!apiUrl.endsWith("/")) {
      apiUrl += "/";
    }
    console.log(`URL API: ${apiUrl}\n`);

    const pb = new PocketBase(apiUrl);

    // Autenticar como admin
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      console.log("🔑 Autenticando como administrador...");
      console.log(`   Email: ${ADMIN_EMAIL}`);
      try {
        const authData = await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log("✓ Autenticación exitosa\n");
        console.log(`   Token obtenido: ${authData.token ? 'Sí' : 'No'}\n`);
      } catch (error: any) {
        console.error(`✗ Error de autenticación: ${error.message}`);
        console.error(`   Status: ${error.status || 'N/A'}`);
        console.error(`   Response: ${JSON.stringify(error.response || {})}`);
        console.log("\n⚠️  No se pudo autenticar, pero intentaremos crear la colección de todas formas...\n");
      }
    } else {
      console.log("⚠️  No hay credenciales de admin configuradas\n");
      console.log("   Continuando sin autenticación...\n");
    }

    // Verificar colecciones existentes
    console.log("📦 Verificando colecciones existentes...");
    try {
      // Intentar obtener colecciones (puede fallar sin auth)
      let collections: any[] = [];
      try {
        collections = await pb.collections.getFullList();
      } catch (e: any) {
        console.log("   ⚠️  No se pudieron obtener colecciones (requiere autenticación)");
        console.log("   Intentando crear colección directamente...\n");
        
        // Intentar crear directamente sin verificar
        console.log("📝 Creando colección 'users' (tipo auth)...");
        try {
          await pb.collections.create({
            name: "users",
            type: "auth",
            schema: [
              {
                name: "name",
                type: "text",
                required: false,
              },
              {
                name: "avatar",
                type: "file",
                required: false,
                options: {
                  maxSelect: 1,
                  maxSize: 5242880,
                  mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
                },
              },
            ],
            options: {
              allowEmailAuth: true,
              allowOAuth2Auth: false,
              allowUsernameAuth: false,
              exceptEmailDomains: [],
              onlyEmailDomains: [],
              requireEmail: true,
              minPasswordLength: 8,
            },
            listRule: "",
            viewRule: "id = @request.auth.id",
            createRule: "",
            updateRule: "id = @request.auth.id",
            deleteRule: "id = @request.auth.id",
          });
          console.log("✅ Colección 'users' creada exitosamente!\n");
          return;
        } catch (createError: any) {
          console.error(`❌ Error creando 'users': ${createError.message}`);
          console.error(`   Status: ${createError.status || 'N/A'}`);
          throw createError;
        }
      }
      
      collections = await pb.collections.getFullList();
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
        console.log("📝 Creando colección 'users' (tipo auth)...");
        try {
          await pb.collections.create({
            name: "users",
            type: "auth",
            schema: [
              {
                name: "name",
                type: "text",
                required: false,
              },
              {
                name: "avatar",
                type: "file",
                required: false,
                options: {
                  maxSelect: 1,
                  maxSize: 5242880, // 5MB
                  mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
                },
              },
            ],
            options: {
              allowEmailAuth: true,
              allowOAuth2Auth: false,
              allowUsernameAuth: false,
              exceptEmailDomains: [],
              onlyEmailDomains: [],
              requireEmail: true,
              minPasswordLength: 8,
            },
            listRule: "",
            viewRule: "id = @request.auth.id",
            createRule: "",
            updateRule: "id = @request.auth.id",
            deleteRule: "id = @request.auth.id",
          });
          console.log("✓ Colección 'users' creada exitosamente\n");
        } catch (error: any) {
          console.error(`✗ Error creando 'users': ${error.message}\n`);
        }
      } else {
        console.log("✓ Colección 'users' ya existe\n");
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

