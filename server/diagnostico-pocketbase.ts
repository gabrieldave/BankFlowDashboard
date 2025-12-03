/**
 * Script de diagnóstico completo para PocketBase
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

console.log("🔍 DIAGNÓSTICO DE POCKETBASE\n");
console.log("=" .repeat(50));
console.log(`URL: ${POCKETBASE_URL}`);
console.log(`Email: ${ADMIN_EMAIL ? "✓ Configurado" : "✗ No configurado"}`);
console.log(`Password: ${ADMIN_PASSWORD ? "✓ Configurado" : "✗ No configurado"}`);
console.log("=" .repeat(50) + "\n");

// 1. Health Check
console.log("1️⃣  Health Check...");
// Si la URL termina en /_/, removerlo para los endpoints de API
let apiUrl = POCKETBASE_URL;
if (apiUrl.endsWith("/_/")) {
  apiUrl = apiUrl.replace("/_/", "/");
}
try {
  const healthResponse = await fetch(`${apiUrl}/api/health`);
  if (healthResponse.ok) {
    const data = await healthResponse.json();
    console.log(`   ✓ Servidor responde correctamente`);
    console.log(`   Respuesta: ${JSON.stringify(data)}\n`);
  } else {
    console.log(`   ✗ Servidor responde con error: ${healthResponse.status}\n`);
  }
} catch (error: any) {
  console.log(`   ✗ Error de conexión: ${error.message}\n`);
}

// 2. Probar autenticación con SDK
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  console.log("2️⃣  Autenticación con SDK...");
  try {
    const { default: PocketBase } = await import("pocketbase");
    // SDK de PocketBase necesita la URL base sin /_/
    const pb = new PocketBase(apiUrl);
    
    // Configurar para ignorar SSL si es necesario
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log(`   ✓ Autenticación exitosa con SDK\n`);
    
    // Intentar listar colecciones
    console.log("3️⃣  Verificando colecciones...");
    try {
      const collections = await pb.collections.getFullList();
      console.log(`   ✓ Encontradas ${collections.length} colecciones:`);
      collections.forEach((c: any) => {
        console.log(`     - ${c.name} (${c.type})`);
      });
      
      const hasUsers = collections.some((c: any) => c.name === "users");
      const hasTransactions = collections.some((c: any) => c.name === "transactions");
      
      console.log(`\n   Estado de colecciones necesarias:`);
      console.log(`     users: ${hasUsers ? "✓" : "✗"}`);
      console.log(`     transactions: ${hasTransactions ? "✓" : "✗"}`);
      
      if (!hasUsers || !hasTransactions) {
        console.log(`\n   ⚠️  Faltan colecciones. Creando...\n`);
        
        if (!hasUsers) {
          try {
            await pb.collections.create({
              name: "users",
              type: "auth",
              schema: [
                { name: "username", type: "text", required: true, unique: true },
                { name: "password", type: "text", required: true },
              ],
            });
            console.log(`   ✓ Colección 'users' creada`);
          } catch (e: any) {
            console.log(`   ✗ Error creando 'users': ${e.message}`);
          }
        }
        
        if (!hasTransactions) {
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
            console.log(`   ✓ Colección 'transactions' creada`);
          } catch (e: any) {
            console.log(`   ✗ Error creando 'transactions': ${e.message}`);
          }
        }
      } else {
        console.log(`\n   ✅ Todas las colecciones necesarias existen!`);
      }
    } catch (e: any) {
      console.log(`   ✗ Error accediendo a colecciones: ${e.message}`);
    }
  } catch (error: any) {
    console.log(`   ✗ Error de autenticación: ${error.message}`);
    console.log(`   Detalles: ${error.response?.data || error.cause || "N/A"}\n`);
    
    console.log("   💡 Posibles causas:");
    console.log("      - Las credenciales son incorrectas");
    console.log("      - La API de administración no está habilitada");
    console.log("      - El usuario no tiene permisos de administrador");
    console.log("      - Problema de conexión/SSL\n");
  }
} else {
  console.log("2️⃣  Autenticación: ⚠️  Credenciales no configuradas\n");
}

console.log("\n" + "=" .repeat(50));
console.log("📋 RESUMEN");
console.log("=" .repeat(50));
console.log("\nSi la autenticación falla, puedes crear las colecciones manualmente:");
console.log(`1. Ve a: ${POCKETBASE_URL}/_/`);
console.log("2. Crea las colecciones 'users' y 'transactions'");
console.log("3. La aplicación funcionará automáticamente una vez creadas\n");

