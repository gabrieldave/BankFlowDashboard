/**
 * Script para corregir completamente el schema de la colección transactions
 * Intenta múltiples métodos hasta que funcione
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

async function corregirSchema() {
  try {
    console.log("🔧 CORRECCIÓN COMPLETA DEL SCHEMA DE TRANSACTIONS\n");
    console.log("=" .repeat(60));
    console.log("\n");
    
    const apiUrl = getApiUrl();
    
    // Autenticar
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
    
    // Obtener la colección actual
    console.log("📋 Obteniendo información de la colección...");
    const collectionResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!collectionResponse.ok) {
      throw new Error(`Error obteniendo colección: ${collectionResponse.status}`);
    }
    
    const collection = await collectionResponse.json();
    console.log(`✅ Colección encontrada: ${collection.name}`);
    console.log(`   - Campos actuales: ${collection.schema?.length || 0}\n`);
    
    // Definir los campos que necesitamos
    const camposRequeridos = [
      { name: "id_number", type: "number", required: false },
      { name: "date", type: "text", required: true },
      { name: "description", type: "text", required: true },
      { name: "amount", type: "number", required: true },
      { name: "type", type: "text", required: true },
      { name: "category", type: "text", required: true },
      { name: "merchant", type: "text", required: true },
      { name: "currency", type: "text", required: true, options: { defaultValue: "MXN" } },
    ];
    
    console.log("🔧 MÉTODO 1: Actualizar colección completa con PATCH\n");
    
    // Método 1: Actualizar toda la colección con PATCH
    try {
      const updateData = {
        ...collection,
        schema: camposRequeridos.map(campo => ({
          name: campo.name,
          type: campo.type,
          required: campo.required || false,
          ...(campo.options || {}),
        })),
      };
      
      console.log("   Intentando actualizar colección completa...");
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
        console.log(`   ❌ Error: ${errorText}`);
        throw new Error(`Error en PATCH: ${updateResponse.status}`);
      }
      
      const updatedCollection = await updateResponse.json();
      console.log(`   ✅ Colección actualizada`);
      console.log(`   - Campos después de actualizar: ${updatedCollection.schema?.length || 0}`);
      
      if (updatedCollection.schema && updatedCollection.schema.length > 0) {
        console.log("\n✅ ¡ÉXITO! Los campos se agregaron correctamente\n");
        console.log("   Campos en schema:");
        updatedCollection.schema.forEach((field: any, idx: number) => {
          console.log(`     ${idx + 1}. ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
        });
        console.log("");
        return;
      } else {
        console.log("   ⚠️  La actualización no agregó campos, intentando método alternativo...\n");
      }
    } catch (error: any) {
      console.log(`   ❌ Método 1 falló: ${error.message}\n`);
    }
    
    // Método 2: Agregar campos uno por uno usando el endpoint de schema
    console.log("🔧 MÉTODO 2: Agregar campos uno por uno\n");
    
    for (const campo of camposRequeridos) {
      try {
        console.log(`   Agregando campo: ${campo.name}...`);
        
        const fieldData: any = {
          name: campo.name,
          type: campo.type,
          required: campo.required || false,
        };
        
        if (campo.options) {
          Object.assign(fieldData, campo.options);
        }
        
        // Intentar agregar usando el endpoint de schema
        const schemaResponse = await fetch(`${apiUrl}api/collections/transactions/schema`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(fieldData),
        });
        
        if (schemaResponse.ok) {
          console.log(`     ✅ Campo ${campo.name} agregado`);
        } else {
          const errorText = await schemaResponse.text();
          console.log(`     ⚠️  Error agregando ${campo.name}: ${errorText}`);
          
          // Si el endpoint de schema no funciona, intentar actualizar toda la colección
          const currentCollectionResponse = await fetch(`${apiUrl}api/collections/transactions`, {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          
          if (currentCollectionResponse.ok) {
            const currentCollection = await currentCollectionResponse.json();
            const currentSchema = currentCollection.schema || [];
            
            // Verificar si el campo ya existe
            const fieldExists = currentSchema.some((f: any) => f.name === campo.name);
            
            if (!fieldExists) {
              // Agregar el campo al schema existente
              const newSchema = [...currentSchema, fieldData];
              
              const updateResponse = await fetch(`${apiUrl}api/collections/transactions`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                  ...currentCollection,
                  schema: newSchema,
                }),
              });
              
              if (updateResponse.ok) {
                console.log(`     ✅ Campo ${campo.name} agregado mediante PATCH completo`);
              } else {
                console.log(`     ❌ Error agregando ${campo.name} mediante PATCH`);
              }
            } else {
              console.log(`     ℹ️  Campo ${campo.name} ya existe`);
            }
          }
        }
      } catch (error: any) {
        console.log(`     ❌ Error con campo ${campo.name}: ${error.message}`);
      }
    }
    
    // Verificar resultado final
    console.log("\n🔍 Verificando resultado final...\n");
    
    const finalResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (finalResponse.ok) {
      const finalCollection = await finalResponse.json();
      console.log(`✅ Verificación final:`);
      console.log(`   - Campos en schema: ${finalCollection.schema?.length || 0}\n`);
      
      if (finalCollection.schema && finalCollection.schema.length > 0) {
        console.log("   Campos configurados:");
        finalCollection.schema.forEach((field: any, idx: number) => {
          console.log(`     ${idx + 1}. ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
        });
        console.log("");
        
        // Verificar que tenemos todos los campos necesarios
        const camposEsperados = camposRequeridos.map(c => c.name);
        const camposExistentes = finalCollection.schema.map((f: any) => f.name);
        const camposFaltantes = camposEsperados.filter(c => !camposExistentes.includes(c));
        
        if (camposFaltantes.length === 0) {
          console.log("✅ ¡PERFECTO! Todos los campos están en el schema\n");
          
          // Crear un registro de prueba
          console.log("🧪 Creando registro de prueba...\n");
          try {
            const testRecord = {
              id_number: 1,
              date: "2025-01-01",
              description: "Prueba de transacción",
              amount: 100.50,
              type: "expense",
              category: "Prueba",
              merchant: "Test Merchant",
              currency: "MXN",
            };
            
            const createResponse = await fetch(`${apiUrl}api/collections/transactions/records`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify(testRecord),
            });
            
            if (createResponse.ok) {
              const createdRecord = await createResponse.json();
              console.log("✅ Registro de prueba creado exitosamente!");
              console.log(`   - ID: ${createdRecord.id}`);
              console.log(`   - Descripción: ${createdRecord.description}`);
              console.log(`   - Monto: ${createdRecord.amount}`);
              
              // Eliminar el registro de prueba
              console.log("\n🗑️  Eliminando registro de prueba...");
              await fetch(`${apiUrl}api/collections/transactions/records/${createdRecord.id}`, {
                method: "DELETE",
                headers: {
                  "Authorization": `Bearer ${token}`,
                },
              });
              console.log("✅ Registro de prueba eliminado\n");
            } else {
              const errorText = await createResponse.text();
              console.log(`⚠️  Error creando registro de prueba: ${errorText}`);
            }
          } catch (error: any) {
            console.log(`⚠️  Error en prueba: ${error.message}`);
          }
          
        } else {
          console.log(`⚠️  Faltan ${camposFaltantes.length} campos: ${camposFaltantes.join(', ')}\n`);
        }
      } else {
        console.log("❌ PROBLEMA: El schema sigue sin campos después de todos los intentos\n");
        console.log("💡 RECOMENDACIÓN: Agregar los campos manualmente desde la interfaz web de PocketBase\n");
      }
    }
    
  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

corregirSchema();

