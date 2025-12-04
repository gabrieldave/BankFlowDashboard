/**
 * Script para verificar y corregir la colección de transacciones en PocketBase
 * Verifica las reglas de acceso y la estructura de los registros
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

async function verificarYCorregir() {
  try {
    console.log("🔍 Verificando y corrigiendo la colección de transacciones...\n");
    console.log(`URL: ${POCKETBASE_URL}\n`);
    
    // Limpiar URL
    let apiUrl = POCKETBASE_URL.trim();
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.slice(0, -3);
    }
    if (!apiUrl.endsWith("/")) {
      apiUrl += "/";
    }
    
    // Autenticar usando _superusers (PocketBase v0.23+)
    console.log("🔐 Autenticando...");
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
    const token = authData.token;
    console.log("✅ Autenticación exitosa\n");
    
    // Obtener información de la colección
    console.log("📋 Obteniendo información de la colección 'transactions'...");
    const collectionResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!collectionResponse.ok) {
      throw new Error(`Error obteniendo colección: ${collectionResponse.status}`);
    }
    
    const collection = await collectionResponse.json();
    console.log("✅ Colección encontrada\n");
    
    // Mostrar información actual
    console.log("📊 Información actual de la colección:");
    console.log(`   - Nombre: ${collection.name}`);
    console.log(`   - Tipo: ${collection.type}`);
    console.log(`   - List Rule: "${collection.listRule || '(vacía)'}"`);
    console.log(`   - View Rule: "${collection.viewRule || '(vacía)'}"`);
    console.log(`   - Create Rule: "${collection.createRule || '(vacía)'}"`);
    console.log(`   - Update Rule: "${collection.updateRule || '(vacía)'}"`);
    console.log(`   - Delete Rule: "${collection.deleteRule || '(vacía)'}"`);
    console.log(`   - Campos del schema: ${collection.schema?.length || 0}\n`);
    
    if (collection.schema && collection.schema.length > 0) {
      console.log("   Campos configurados:");
      collection.schema.forEach((field: any) => {
        console.log(`     - ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
      });
      console.log("");
    }
    
    // Verificar y actualizar reglas si es necesario
    const rulesNeedUpdate = 
      collection.listRule !== "" ||
      collection.viewRule !== "" ||
      collection.createRule !== "" ||
      collection.updateRule !== "" ||
      collection.deleteRule !== "";
    
    if (rulesNeedUpdate) {
      console.log("⚠️  Las reglas de acceso no están vacías (pueden estar bloqueando acceso)");
      console.log("🔧 Actualizando reglas de acceso a vacías (acceso completo para admin)...\n");
      
      const updateData = {
        ...collection,
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      };
      
      const updateResponse = await fetch(`${apiUrl}api/collections/transactions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Error actualizando colección: ${updateResponse.status} - ${errorText}`);
      }
      
      console.log("✅ Reglas de acceso actualizadas\n");
    } else {
      console.log("✅ Las reglas de acceso ya están configuradas correctamente (vacías)\n");
    }
    
    // Obtener algunos registros para verificar
    console.log("📊 Obteniendo registros para verificar estructura...");
    const recordsResponse = await fetch(`${apiUrl}api/collections/transactions/records?page=1&perPage=5`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!recordsResponse.ok) {
      const errorText = await recordsResponse.text();
      throw new Error(`Error obteniendo registros: ${recordsResponse.status} - ${errorText}`);
    }
    
    const recordsData = await recordsResponse.json();
    const records = recordsData.items || [];
    
    console.log(`✅ Se encontraron ${recordsData.totalItems || 0} registros totales\n`);
    
    if (records.length > 0) {
      console.log("📋 Estructura del primer registro:");
      const firstRecord = records[0];
      const keys = Object.keys(firstRecord);
      console.log(`   Claves disponibles: ${keys.join(', ')}\n`);
      
      // Verificar campos de datos
      const camposEsperados = ['date', 'description', 'amount', 'type', 'category', 'merchant', 'currency', 'id_number'];
      console.log("🔍 Verificación de campos:");
      
      let todosVacios = true;
      camposEsperados.forEach(campo => {
        const valor = firstRecord[campo];
        const estaVacio = valor === null || valor === undefined || valor === '';
        const tieneValor = !estaVacio;
        
        if (tieneValor) {
          todosVacios = false;
        }
        
        console.log(`   ${campo}: ${estaVacio ? '❌ VACÍO' : '✅ ' + JSON.stringify(valor)}`);
      });
      
      console.log("");
      
      if (todosVacios) {
        console.log("⚠️  PROBLEMA DETECTADO: Todos los campos de datos están vacíos");
        console.log("💡 Esto significa que los registros se crearon pero sin datos");
        console.log("💡 Necesitas verificar cómo se están creando los registros\n");
      }
      
      // Mostrar registro completo
      console.log("📋 Registro completo (JSON):");
      console.log(JSON.stringify(firstRecord, null, 2));
      console.log("");
    } else {
      console.log("⚠️  No se encontraron registros en la colección\n");
    }
    
    // Verificar total de registros
    console.log(`📊 Resumen:`);
    console.log(`   - Total de registros: ${recordsData.totalItems || 0}`);
    console.log(`   - Registros con metadata: ${records.length}`);
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

verificarYCorregir();

