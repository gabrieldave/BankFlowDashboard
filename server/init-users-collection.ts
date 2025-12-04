/**
 * Script para crear la colección de usuarios tipo "auth" en PocketBase usando el SDK
 * Ejecutar: tsx server/init-users-collection.ts
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
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD son requeridos");
    }

    console.log("🔑 Autenticando como administrador...");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    try {
      const authData = await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log("✓ Autenticación exitosa\n");
    } catch (error: any) {
      console.error(`✗ Error de autenticación: ${error.message}`);
      console.error(`   Status: ${error.status || 'N/A'}`);
      throw error;
    }

    // Verificar si la colección ya existe
    console.log("📦 Verificando colecciones existentes...");
    let collections: any[] = [];
    try {
      collections = await pb.collections.getFullList();
      console.log(`   Encontradas ${collections.length} colecciones:`);
      collections.forEach((c: any) => {
        console.log(`     - ${c.name} (${c.type})`);
      });
      console.log("");
    } catch (error: any) {
      console.error(`✗ Error obteniendo colecciones: ${error.message}`);
      throw error;
    }

    const hasUsers = collections.some((c: any) => c.name === "users");

    if (hasUsers) {
      console.log("✓ Colección 'users' ya existe");
      console.log("\n✅ La colección 'users' está lista para autenticación.");
      return;
    }

    // Crear colección users si no existe
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
      if (error.message?.includes("already exists") || error.status === 400) {
        console.log("✓ Colección 'users' ya existe\n");
      } else {
        console.error(`✗ Error creando 'users': ${error.message}`);
        throw error;
      }
    }

    console.log("✅ Inicialización completada!");
    console.log("\nLa colección 'users' está lista para autenticación.");
    console.log("\nNota: Los usuarios pueden registrarse desde la aplicación.");
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
