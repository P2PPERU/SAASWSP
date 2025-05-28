// clean-all-instances.ts
import { DataSource } from 'typeorm';
import axios from 'axios';

async function cleanAllInstances() {
  const db = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'whatsapp_saas',
  });
  
  await db.initialize();
  
  console.log('🧹 Limpiando todas las instancias...\n');
  
  // 1. Obtener todas las instancias de la BD
  const instances = await db.query(`
    SELECT id, name, "instanceKey", "apiKey" 
    FROM whatsapp_instances 
    WHERE "deletedAt" IS NULL
  `);
  
  console.log(`Encontradas ${instances.length} instancias para eliminar\n`);
  
  // 2. Eliminar cada instancia de Evolution API
  for (const instance of instances) {
    try {
      console.log(`Eliminando ${instance.name} de Evolution API...`);
      
      const apiKey = instance.apiKey || '429683C4C977415CAAFCCE10F7D57E11';
      
      await axios.delete(
        `http://localhost:8080/instance/delete/${instance.instanceKey}`,
        {
          headers: { 'apikey': apiKey }
        }
      );
      
      console.log(`✅ ${instance.name} eliminada de Evolution`);
    } catch (error: any) {
      console.log(`⚠️  No se pudo eliminar ${instance.name} de Evolution: ${error.message}`);
    }
  }
  
  // 3. Limpiar la base de datos
  console.log('\n🗑️ Limpiando base de datos...');
  
  // Eliminar en orden correcto (por las foreign keys)
  await db.query('DELETE FROM messages');
  console.log('✅ Mensajes eliminados');
  
  await db.query('DELETE FROM conversations');
  console.log('✅ Conversaciones eliminadas');
  
  await db.query('DELETE FROM whatsapp_instances');
  console.log('✅ Instancias eliminadas');
  
  await db.destroy();
  console.log('\n✅ Limpieza completa finalizada');
}

// Confirmar antes de ejecutar
console.log('⚠️  ADVERTENCIA: Esto eliminará TODAS las instancias, conversaciones y mensajes');
console.log('Presiona CTRL+C para cancelar o espera 5 segundos para continuar...\n');

setTimeout(() => {
  cleanAllInstances();
}, 5000);