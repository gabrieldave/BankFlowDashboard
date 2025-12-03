/**
 * Script para verificar si las colecciones ya existen en PocketBase
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

let POCKETBASE_URL = process.env.POCKETBASE_URL || "https://estadosdecuenta-db.david-cloud.online";
POCKETBASE_URL = POCKETBASE_URL.replace(/\/_\//g, "").replace(/\/$/, "");

console.log(`🔍 Verificando colecciones en: ${POCKETBASE_URL}\n`);

// Intentar listar colecciones (puede requerir autenticación)
try {
  const response = await fetch(`${POCKETBASE_URL}/api/collections`, {
    method: "GET",
  });
  
  console.log(`Status: ${response.status} ${response.statusText}`);
  
  if (response.ok) {
    const data = await response.json();
    console.log(`\n✅ Colecciones encontradas:`);
    if (data.items && data.items.length > 0) {
      data.items.forEach((collection: any) => {
        console.log(`  - ${collection.name} (${collection.type})`);
      });
      
      const hasUsers = data.items.some((c: any) => c.name === "users");
      const hasTransactions = data.items.some((c: any) => c.name === "transactions");
      
      console.log(`\n📋 Estado:`);
      console.log(`  users: ${hasUsers ? "✓ Existe" : "✗ No existe"}`);
      console.log(`  transactions: ${hasTransactions ? "✓ Existe" : "✗ No existe"}`);
      
      if (hasUsers && hasTransactions) {
        console.log(`\n✅ ¡Todas las colecciones necesarias existen!`);
        console.log(`La aplicación debería funcionar correctamente.`);
      } else {
        console.log(`\n⚠️  Faltan algunas colecciones.`);
        console.log(`Crea las colecciones faltantes desde el panel de administración:`);
        console.log(`  ${POCKETBASE_URL}/_/`);
      }
    } else {
      console.log(`  No se encontraron colecciones.`);
    }
  } else {
    const errorText = await response.text();
    console.log(`\n⚠️  No se pudo acceder a las colecciones (requiere autenticación).`);
    console.log(`Respuesta: ${errorText.substring(0, 200)}`);
    console.log(`\n💡 Opciones:`);
    console.log(`  1. Crea las colecciones manualmente desde el panel:`);
    console.log(`     ${POCKETBASE_URL}/_/`);
    console.log(`  2. O verifica que las colecciones "users" y "transactions" existan.`);
  }
} catch (error: any) {
  console.error(`❌ Error: ${error.message}`);
}

