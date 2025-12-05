/**
 * Script DEFINITIVO para corregir el schema usando el SDK de PocketBase
 * Elimina y recrea la colección con el formato correcto
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

async function fixSchemaDefinitivo() {
  try {
    console.log("🔧 CORRECCIÓN DEFINITIVA DEL SCHEMA USANDO SDK\n");
    console.log("=" .repeat(60));
    console.log("\n");
    
    // Importar PocketBase SDK
    const { default: PocketBase } = await import("pocketbase");
    
    // Limpiar URL para el SDK
    let apiUrl = POCKETBASE_URL.trim();
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.slice(0, -3);
    }
    if (!apiUrl.endsWith("/")) {
      apiUrl += "/";
    }
    
    console.log(`🔗 Conectando a: ${apiUrl}\n`);
    const pb = new PocketBase(apiUrl);
    
    // Autenticar
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD son requeridos");
    }
    
    console.log("🔐 Autenticando...");
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✅ Autenticación exitosa\n");
    
    // Verificar si la colección existe y eliminarla
    console.log("🗑️  Eliminando colección existente si existe...");
    try {
      const existingCollection = await pb.collections.getOne('transactions');
      console.log(`   ✅ Colección encontrada (ID: ${existingCollection.id})`);
      console.log(`   - Campos actuales: ${existingCollection.schema?.length || 0}`);
      
      // Eliminar la colección
      await pb.collections.delete('transactions');
      console.log("   ✅ Colección eliminada\n");
      
      // Esperar un poco para que la eliminación se complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      if (error.status === 404) {
        console.log("   ℹ️  La colección no existe, se creará nueva\n");
      } else {
        throw error;
      }
    }
    
    // Crear la colección con el schema correcto usando el SDK
    console.log("📦 Creando colección con schema completo usando SDK...\n");
    
    // Definir los campos con el formato exacto que espera PocketBase
    const schemaFields = [
      {
        name: "id_number",
        type: "number",
        required: false,
      },
      {
        name: "date",
        type: "text",
        required: true,
      },
      {
        name: "description",
        type: "text",
        required: true,
      },
      {
        name: "amount",
        type: "number",
        required: true,
      },
      {
        name: "type",
        type: "text",
        required: true,
      },
      {
        name: "category",
        type: "text",
        required: true,
      },
      {
        name: "merchant",
        type: "text",
        required: true,
      },
      {
        name: "currency",
        type: "text",
        required: true,
        options: {
          defaultValue: "MXN",
        },
      },
    ];
    
    console.log(`   Creando colección con ${schemaFields.length} campos...`);
    
    try {
      const newCollection = await pb.collections.create({
        name: "transactions",
        type: "base",
        schema: schemaFields,
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      });
      
      console.log("✅ Colección creada exitosamente!");
      console.log(`   - ID: ${newCollection.id}`);
      console.log(`   - Nombre: ${newCollection.name}`);
      console.log(`   - Tipo: ${newCollection.type}`);
      
      // Verificar inmediatamente el schema
      console.log("\n🔍 Verificando schema guardado...\n");
      
      // Esperar un poco para que se guarde
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Obtener la colección nuevamente para verificar
      const verifyCollection = await pb.collections.getOne('transactions');
      
      console.log(`   - Campos en schema: ${verifyCollection.schema?.length || 0}`);
      
      if (verifyCollection.schema && verifyCollection.schema.length > 0) {
        console.log("\n✅ ¡ÉXITO! Los campos se guardaron correctamente:\n");
        verifyCollection.schema.forEach((field: any, idx: number) => {
          console.log(`   ${idx + 1}. ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
        });
        
        // Probar crear un registro
        console.log("\n🧪 Creando registro de prueba...\n");
        try {
          const testRecord = await pb.collection('transactions').create({
            id_number: 1,
            date: "2025-01-01",
            description: "Prueba de transacción",
            amount: 100.50,
            type: "expense",
            category: "Prueba",
            merchant: "Test Merchant",
            currency: "MXN",
          });
          
          console.log("✅ Registro de prueba creado exitosamente!");
          console.log(`   - ID: ${testRecord.id}`);
          console.log(`   - Descripción: ${testRecord.description}`);
          console.log(`   - Monto: ${testRecord.amount}`);
          console.log(`   - Tipo: ${testRecord.type}\n`);
          
          // Obtener el registro completo para verificar todos los campos
          const fullRecord = await pb.collection('transactions').getOne(testRecord.id);
          console.log("📋 Registro completo:");
          console.log(JSON.stringify(fullRecord, null, 2));
          console.log("");
          
          // Eliminar el registro de prueba
          console.log("🗑️  Eliminando registro de prueba...");
          await pb.collection('transactions').delete(testRecord.id);
          console.log("✅ Registro de prueba eliminado\n");
          
          console.log("=" .repeat(60));
          console.log("\n✅ ¡TODO FUNCIONA CORRECTAMENTE!");
          console.log("💡 La colección está lista para usar. Puedes subir tus archivos CSV/PDF.\n");
          
        } catch (testError: any) {
          console.error(`❌ Error creando registro de prueba: ${testError.message}`);
          if (testError.response) {
            console.error("Response:", JSON.stringify(testError.response, null, 2));
          }
        }
        
      } else {
        console.log("\n❌ PROBLEMA: El schema sigue sin campos después de crear la colección");
        console.log("💡 Esto puede indicar un problema con la versión de PocketBase o su configuración\n");
        
        // Intentar agregar campos usando el método de actualización
        console.log("🔧 Intentando agregar campos mediante actualización...\n");
        
        try {
          const updateCollection = await pb.collections.update('transactions', {
            schema: schemaFields,
          });
          
          console.log(`   Campos después de actualización: ${updateCollection.schema?.length || 0}`);
          
          if (updateCollection.schema && updateCollection.schema.length > 0) {
            console.log("✅ Campos agregados mediante actualización\n");
          }
        } catch (updateError: any) {
          console.log(`❌ Error en actualización: ${updateError.message}\n`);
        }
      }
      
    } catch (createError: any) {
      console.error(`❌ Error creando colección: ${createError.message}`);
      if (createError.response) {
        console.error("Response:", JSON.stringify(createError.response, null, 2));
      }
      throw createError;
    }
    
  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    if (error.response) {
      console.error("Response:", JSON.stringify(error.response, null, 2));
    }
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

fixSchemaDefinitivo();


