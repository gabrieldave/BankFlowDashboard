/**
 * Agregar campos usando el formato correcto de PocketBase (fields en lugar de schema)
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

async function agregarCamposCorrecto() {
  try {
    console.log("🔧 AGREGANDO CAMPOS USANDO FORMATO CORRECTO\n");
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
      throw new Error(`Error de autenticación: ${errorText}`);
    }
    
    const authData = await authResponse.json();
    const token = authData.token;
    console.log("✅ Autenticación exitosa\n");
    
    // Obtener la colección actual
    console.log("📋 Obteniendo colección actual...");
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
    console.log(`   - Fields actuales: ${collection.fields?.length || 0}`);
    console.log(`   - Schema actuales: ${collection.schema?.length || 0}\n`);
    
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
    
    // Obtener fields existentes (excluyendo el campo id del sistema)
    const existingFields = collection.fields?.filter((f: any) => !f.system) || [];
    const existingFieldNames = existingFields.map((f: any) => f.name);
    
    // Agregar solo los campos que no existen
    const fieldsToAdd = camposRequeridos.filter(c => !existingFieldNames.includes(c.name));
    
    if (fieldsToAdd.length === 0) {
      console.log("✅ Todos los campos ya existen\n");
      return;
    }
    
    console.log(`🔧 Agregando ${fieldsToAdd.length} campos...\n`);
    
    // Agregar campos uno por uno usando el endpoint correcto
    for (const campo of fieldsToAdd) {
      try {
        console.log(`   Agregando: ${campo.name} (${campo.type})...`);
        
        const fieldData: any = {
          name: campo.name,
          type: campo.type,
          required: campo.required || false,
        };
        
        if (campo.options) {
          Object.assign(fieldData, campo.options);
        }
        
        // Usar el endpoint de schema para agregar campos
        const addFieldResponse = await fetch(`${apiUrl}api/collections/transactions/schema`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(fieldData),
        });
        
        if (addFieldResponse.ok) {
          console.log(`     ✅ Campo ${campo.name} agregado`);
        } else {
          const errorText = await addFieldResponse.text();
          console.log(`     ⚠️  Error: ${errorText}`);
          
          // Si el endpoint de schema no funciona, intentar actualizar toda la colección
          console.log(`     Intentando método alternativo...`);
          
          // Obtener la colección actualizada
          const currentResponse = await fetch(`${apiUrl}api/collections/transactions`, {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          
          if (currentResponse.ok) {
            const currentCollection = await currentResponse.json();
            const currentFields = currentCollection.fields || [];
            
            // Crear el nuevo field
            const newField: any = {
              name: campo.name,
              type: campo.type,
              required: campo.required || false,
            };
            
            if (campo.type === "number") {
              newField.min = null;
              newField.max = null;
            }
            
            if (campo.options) {
              if (campo.options.defaultValue) {
                newField.defaultValue = campo.options.defaultValue;
              }
            }
            
            // Agregar el field a la lista
            const updatedFields = [...currentFields, newField];
            
            // Actualizar la colección
            const updateResponse = await fetch(`${apiUrl}api/collections/transactions`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify({
                fields: updatedFields,
              }),
            });
            
            if (updateResponse.ok) {
              console.log(`     ✅ Campo ${campo.name} agregado mediante PATCH`);
            } else {
              const updateErrorText = await updateResponse.text();
              console.log(`     ❌ Error en PATCH: ${updateErrorText}`);
            }
          }
        }
      } catch (error: any) {
        console.log(`     ❌ Error: ${error.message}`);
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
      const userFields = finalCollection.fields?.filter((f: any) => !f.system) || [];
      
      console.log(`✅ Campos en la colección: ${userFields.length}\n`);
      
      if (userFields.length > 0) {
        console.log("   Campos configurados:");
        userFields.forEach((field: any, idx: number) => {
          console.log(`     ${idx + 1}. ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
        });
        console.log("");
        
        // Verificar que tenemos todos los campos necesarios
        const camposEsperados = camposRequeridos.map(c => c.name);
        const camposExistentes = userFields.map((f: any) => f.name);
        const camposFaltantes = camposEsperados.filter(c => !camposExistentes.includes(c));
        
        if (camposFaltantes.length === 0) {
          console.log("✅ ¡PERFECTO! Todos los campos están configurados\n");
          
          // Probar crear un registro
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
              console.log(`   - Monto: ${createdRecord.amount}\n`);
              
              // Eliminar el registro de prueba
              await fetch(`${apiUrl}api/collections/transactions/records/${createdRecord.id}`, {
                method: "DELETE",
                headers: {
                  "Authorization": `Bearer ${token}`,
                },
              });
              console.log("✅ Registro de prueba eliminado\n");
              
              console.log("=" .repeat(60));
              console.log("\n✅ ¡TODO FUNCIONA CORRECTAMENTE!");
              console.log("💡 La colección está lista para usar. Puedes subir tus archivos CSV/PDF.\n");
              
            } else {
              const errorText = await createResponse.text();
              console.log(`❌ Error creando registro: ${errorText}\n`);
            }
          } catch (error: any) {
            console.log(`❌ Error: ${error.message}\n`);
          }
        } else {
          console.log(`⚠️  Faltan campos: ${camposFaltantes.join(', ')}\n`);
        }
      } else {
        console.log("❌ PROBLEMA: No hay campos en la colección\n");
      }
    }
    
  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

agregarCamposCorrecto();


