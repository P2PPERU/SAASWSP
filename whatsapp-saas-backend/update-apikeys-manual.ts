// update-apikeys-manual.ts
import { DataSource } from 'typeorm';

async function updateApiKeysManually() {
  const db = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'whatsapp_saas',
  });
  
  await db.initialize();
  
  console.log('🔄 Actualizando API Keys manualmente...\n');
  
  // Mapa de instanceKey -> apiKey desde Evolution Manager
  const apiKeyMap = {
    'cc891cff_47964a7e': '373FFB7E-659A-4EC8-A621-0401697192CF', // Alexander
    'cc891cff_ff9d96fe': '6EB173E1-6972-4A46-8464-E54618E863AB'  // McStore
  };
  
  for (const [instanceKey, apiKey] of Object.entries(apiKeyMap)) {
    try {
      console.log(`Actualizando ${instanceKey}...`);
      
      const result = await db.query(
        `UPDATE whatsapp_instances 
         SET "apiKey" = $1 
         WHERE "instanceKey" = $2 
         RETURNING id, name`,
        [apiKey, instanceKey]
      );
      
      if (result.length > 0) {
        console.log(`✅ ${result[0].name}: API Key actualizada`);
      } else {
        console.log(`⚠️  No se encontró la instancia ${instanceKey}`);
      }
      
    } catch (error: any) {
      console.log(`❌ Error actualizando ${instanceKey}: ${error.message}`);
    }
  }
  
  // Verificar el resultado
  console.log('\n📊 Verificando resultado final:');
  const instances = await db.query(`
    SELECT name, "instanceKey", 
           CASE WHEN "apiKey" IS NOT NULL THEN '✅ Tiene API Key' ELSE '❌ Sin API Key' END as status
    FROM whatsapp_instances
    ORDER BY name
  `);
  
  console.table(instances);
  
  await db.destroy();
  console.log('\n✅ Proceso completado');
}

updateApiKeysManually();