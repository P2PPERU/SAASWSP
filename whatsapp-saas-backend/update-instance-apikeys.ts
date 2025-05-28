// update-instance-apikeys.ts
import { DataSource } from 'typeorm';
import axios from 'axios';

async function updateApiKeys() {
  const db = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'whatsapp_saas',
  });
  
  await db.initialize();
  
  console.log('🔄 Actualizando API Keys de instancias existentes...\n');
  
  // Obtener instancias sin API Key
  const instances = await db.query(`
    SELECT id, "instanceKey", name 
    FROM whatsapp_instances 
    WHERE "apiKey" IS NULL
  `);
  
  console.log(`Encontradas ${instances.length} instancias sin API Key\n`);
  
  try {
    // CAMBIO: Obtener TODAS las instancias de Evolution de una vez
    const response = await axios.get(
      'http://localhost:8080/instance/fetchInstances', // <-- Endpoint correcto
      {
        headers: {
          'apikey': '429683C4C977415CAAFCCE10F7D57E11' // Tu API Key global
        }
      }
    );
    
    const evolutionInstances = response.data;
    console.log(`Evolution API tiene ${evolutionInstances.length} instancias\n`);
    
    // Para cada instancia local sin API Key
    for (const instance of instances) {
      try {
        console.log(`Procesando: ${instance.name} (${instance.instanceKey})`);
        
        // Buscar la instancia en la lista de Evolution
        const evolutionInstance = evolutionInstances.find(
          (evo: any) => 
            evo.instance?.instanceName === instance.instanceKey ||
            evo.instanceName === instance.instanceKey ||
            evo.name === instance.instanceKey
        );
        
        if (evolutionInstance) {
          // Obtener la API Key (puede estar en diferentes lugares según la versión)
          const apiKey = 
            evolutionInstance.hash?.apikey || 
            evolutionInstance.apikey ||
            evolutionInstance.instance?.apikey;
          
          if (apiKey) {
            // Actualizar en la BD
            await db.query(
              `UPDATE whatsapp_instances SET "apiKey" = $1 WHERE id = $2`,
              [apiKey, instance.id]
            );
            console.log(`✅ API Key actualizada: ${apiKey.substring(0, 10)}...`);
          } else {
            console.log(`⚠️  Instancia encontrada pero sin API Key`);
          }
        } else {
          console.log(`⚠️  Instancia no encontrada en Evolution API`);
          console.log(`   Puede que haya sido eliminada o recreada`);
        }
        
      } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
  } catch (error: any) {
    console.log(`❌ Error obteniendo instancias de Evolution: ${error.message}`);
    console.log(`   Verifica que Evolution API esté corriendo en http://localhost:8080`);
    console.log(`   y que la API Key global sea correcta`);
  }
  
  await db.destroy();
  console.log('\n✅ Proceso completado');
}

updateApiKeys();