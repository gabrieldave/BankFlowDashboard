/**
 * Auditoría completa de PocketBase - Verifica configuración y estado
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

const POCKETBASE_URL = process.env.POCKETBASE_URL || "https://estadosdecuenta-db.david-cloud.online";
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

// Helper para obtener la URL limpia de la API
function getApiUrl(): string {
  let apiUrl = POCKETBASE_URL.trim();
  if (apiUrl.endsWith("/_/")) {
    apiUrl = apiUrl.slice(0, -3);
  }
  if (!apiUrl.endsWith("/")) {
    apiUrl += "/";
  }
  return apiUrl;
}

async function auditoriaCompleta() {
  try {
    console.log("🔍 AUDITORÍA COMPLETA DE POCKETBASE\n");
    console.log("=" .repeat(60));
    console.log("\n");
    
    // 1. Verificar variables de entorno
    console.log("📋 1. VERIFICACIÓN DE VARIABLES DE ENTORNO\n");
    console.log(`   POCKETBASE_URL: ${POCKETBASE_URL}`);
    console.log(`   POCKETBASE_ADMIN_EMAIL: ${ADMIN_EMAIL ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   POCKETBASE_ADMIN_PASSWORD: ${ADMIN_PASSWORD ? '✅ Configurado' : '❌ No configurado'}`);
    
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("Las credenciales de admin no están configuradas");
    }
    
    const apiUrl = getApiUrl();
    console.log(`   URL API limpia: ${apiUrl}\n`);
    
    // 2. Autenticación
    console.log("🔐 2. AUTENTICACIÓN\n");
    let token: string;
    
    try {
      const authResponse = await fetch(`${apiUrl}api/collections/_superusers/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        }),
      });
      
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        throw new Error(`Error de autenticación: ${authResponse.status} - ${errorText}`);
      }
      
      const authData = await authResponse.json();
      token = authData.token;
      console.log("   ✅ Autenticación exitosa");
      console.log(`   Token obtenido: ${token ? 'Sí' : 'No'}\n`);
    } catch (error: any) {
      console.error(`   ❌ Error de autenticación: ${error.message}\n`);
      throw error;
    }
    
    // 3. Verificar colección transactions
    console.log("📦 3. VERIFICACIÓN DE COLECCIÓN 'transactions'\n");
    
    let collection: any = null;
    try {
      const collectionResponse = await fetch(`${apiUrl}api/collections/transactions`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (collectionResponse.ok) {
        collection = await collectionResponse.json();
        console.log("   ✅ Colección encontrada");
        console.log(`   - ID: ${collection.id}`);
        console.log(`   - Nombre: ${collection.name}`);
        console.log(`   - Tipo: ${collection.type}`);
        const userFields = collection.fields?.filter((f: any) => !f.system) || [];
        console.log(`   - Campos en schema: ${collection.schema?.length || 0}`);
        console.log(`   - Campos en fields (sin system): ${userFields.length}`);
        console.log(`   - Total fields: ${collection.fields?.length || 0}`);
        console.log(`   - List Rule: "${collection.listRule || '(vacía)'}"`);
        console.log(`   - View Rule: "${collection.viewRule || '(vacía)'}"`);
        console.log(`   - Create Rule: "${collection.createRule || '(vacía)'}"`);
        console.log(`   - Update Rule: "${collection.updateRule || '(vacía)'}"`);
        console.log(`   - Delete Rule: "${collection.deleteRule || '(vacía)'}"\n`);
        
        if (userFields.length > 0) {
          console.log("   Campos configurados:");
          userFields.forEach((field: any, idx: number) => {
            console.log(`     ${idx + 1}. ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
          });
          console.log("");
        } else if (collection.schema && collection.schema.length > 0) {
          console.log("   Campos en schema:");
          collection.schema.forEach((field: any, idx: number) => {
            console.log(`     ${idx + 1}. ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
          });
          console.log("");
        } else {
          console.log("   ⚠️  PROBLEMA: No hay campos configurados\n");
        }
      } else if (collectionResponse.status === 404) {
        console.log("   ❌ Colección no existe\n");
      } else {
        const errorText = await collectionResponse.text();
        throw new Error(`Error obteniendo colección: ${collectionResponse.status} - ${errorText}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
    
    // 4. Verificar registros
    console.log("📊 4. VERIFICACIÓN DE REGISTROS\n");
    
    try {
      const recordsResponse = await fetch(`${apiUrl}api/collections/transactions/records?page=1&perPage=5`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        console.log(`   ✅ Total de registros: ${recordsData.totalItems || 0}`);
        console.log(`   - Páginas totales: ${recordsData.totalPages || 0}\n`);
        
        if (recordsData.items && recordsData.items.length > 0) {
          console.log("   Ejemplo del primer registro:");
          const firstRecord = recordsData.items[0];
          const keys = Object.keys(firstRecord);
          console.log(`   - Claves disponibles: ${keys.join(', ')}`);
          
          // Verificar campos de datos
          const camposEsperados = ['date', 'description', 'amount', 'type', 'category', 'merchant', 'currency', 'id_number'];
          const camposPresentes = camposEsperados.filter(campo => firstRecord[campo] !== undefined);
          
          if (camposPresentes.length > 0) {
            console.log(`   ✅ Registros tienen ${camposPresentes.length}/${camposEsperados.length} campos esperados`);
            console.log(`   - Campos presentes: ${camposPresentes.join(', ')}`);
          } else {
            console.log(`   ❌ PROBLEMA: Los registros solo tienen metadata (sin campos de datos)`);
            console.log(`   - Estructura completa:`, JSON.stringify(firstRecord, null, 2));
          }
        } else {
          console.log("   ℹ️  No hay registros en la colección\n");
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error obteniendo registros: ${error.message}\n`);
    }
    
    // 5. Resumen y recomendaciones
    console.log("📝 5. RESUMEN Y RECOMENDACIONES\n");
    console.log("=" .repeat(60));
    
    if (!collection) {
      console.log("\n❌ PROBLEMA CRÍTICO: La colección 'transactions' no existe");
      console.log("💡 SOLUCIÓN: Ejecuta 'npm run init-pocketbase' para crear la colección\n");
    } else {
      const userFields = collection.fields?.filter((f: any) => !f.system) || [];
      const camposEsperados = ['date', 'description', 'amount', 'type', 'category', 'merchant', 'currency', 'id_number'];
      const camposExistentes = userFields.map((f: any) => f.name);
      const camposFaltantes = camposEsperados.filter(c => !camposExistentes.includes(c));
      
      if (userFields.length === 0 && (!collection.schema || collection.schema.length === 0)) {
        console.log("\n❌ PROBLEMA CRÍTICO: La colección existe pero no tiene campos configurados");
        console.log("💡 SOLUCIÓN: Ejecuta 'npm run agregar-campos' para agregar los campos\n");
      } else if (camposFaltantes.length > 0) {
        console.log(`\n⚠️  ADVERTENCIA: Faltan ${camposFaltantes.length} campos en el schema`);
        console.log(`   Campos faltantes: ${camposFaltantes.join(', ')}`);
        console.log("💡 SOLUCIÓN: Ejecuta 'npm run agregar-campos' para agregar los campos faltantes\n");
      } else {
        console.log("\n✅ TODO CORRECTO: La colección tiene todos los campos necesarios\n");
      }
    }
    
    return { collection, token, apiUrl };
    
  } catch (error: any) {
    console.error("\n❌ ERROR EN AUDITORÍA:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

auditoriaCompleta().then(result => {
  if (result) {
    console.log("\n✅ Auditoría completada\n");
  }
});

