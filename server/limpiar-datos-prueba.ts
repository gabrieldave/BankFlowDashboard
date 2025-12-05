/**
 * Script para limpiar datos de prueba de PocketBase
 * Ejecutar: tsx server/limpiar-datos-prueba.ts
 * 
 * Este script elimina:
 * - Todas las transacciones
 * - Opcionalmente: usuarios de prueba (excepto el admin)
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

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2);
const borrarUsuarios = args.includes('--usuarios') || args.includes('-u');

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
      await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log("✓ Autenticación exitosa\n");
    } catch (error: any) {
      console.error(`✗ Error de autenticación: ${error.message}`);
      throw error;
    }

    // 1. Borrar todas las transacciones
    console.log("🗑️  Eliminando transacciones...");
    try {
      let totalEliminadas = 0;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const records = await pb.collection('transactions').getList(page, 500);
        const items = records.items || [];

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of items) {
          try {
            await pb.collection('transactions').delete(item.id);
            totalEliminadas++;
          } catch (error: any) {
            console.warn(`   ⚠️  No se pudo eliminar transacción ${item.id}: ${error.message}`);
          }
        }

        console.log(`   Eliminadas ${totalEliminadas} transacciones...`);
        hasMore = items.length === 500;
        page++;
      }

      console.log(`✓ Total de transacciones eliminadas: ${totalEliminadas}\n`);
    } catch (error: any) {
      console.error(`✗ Error eliminando transacciones: ${error.message}`);
    }

    // 2. Opcionalmente borrar usuarios (excepto el admin)
    if (borrarUsuarios) {
      console.log("🗑️  Eliminando usuarios de prueba...");
      try {
        let totalEliminados = 0;
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const records = await pb.collection('users').getList(page, 500);
          const items = records.items || [];

          if (items.length === 0) {
            hasMore = false;
            break;
          }

          for (const item of items) {
            // No eliminar el usuario admin
            if (item.email === ADMIN_EMAIL) {
              console.log(`   ⏭️  Saltando usuario admin: ${item.email}`);
              continue;
            }

            try {
              await pb.collection('users').delete(item.id);
              totalEliminados++;
              console.log(`   ✓ Usuario eliminado: ${item.email || item.id}`);
            } catch (error: any) {
              console.warn(`   ⚠️  No se pudo eliminar usuario ${item.id}: ${error.message}`);
            }
          }

          hasMore = items.length === 500;
          page++;
        }

        console.log(`✓ Total de usuarios eliminados: ${totalEliminados}\n`);
      } catch (error: any) {
        console.error(`✗ Error eliminando usuarios: ${error.message}`);
      }
    } else {
      console.log("ℹ️  Usuarios no eliminados (usa --usuarios o -u para eliminarlos)\n");
    }

    console.log("✅ Limpieza completada!");
    console.log("\n📋 Resumen:");
    console.log("   - Transacciones: eliminadas");
    if (borrarUsuarios) {
      console.log("   - Usuarios: eliminados (excepto admin)");
    } else {
      console.log("   - Usuarios: conservados");
    }
    console.log("\n💡 Para eliminar usuarios también, ejecuta:");
    console.log("   npm run limpiar-datos --usuarios");
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




