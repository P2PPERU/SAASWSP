// check-instances.ts
// Ejecutar con: npx ts-node check-instances.ts

import axios from 'axios';

async function checkInstances() {
  const EVOLUTION_URL = 'http://localhost:8080';
  const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

  console.log('📱 Verificando instancias en Evolution API...\n');

  try {
    // Obtener todas las instancias
    const response = await axios.get(`${EVOLUTION_URL}/instance/fetchInstances`, {
      headers: { 'apikey': API_KEY }
    });

    const instances = response.data;
    console.log(`Total de instancias: ${instances.length}\n`);

    if (instances.length === 0) {
      console.log('No hay instancias creadas.');
      return;
    }

    // Mostrar detalles de cada instancia
    for (const instance of instances) {
      console.log('─'.repeat(50));
      console.log('📱 Instancia:', JSON.stringify(instance, null, 2));
      
      // Intentar obtener más detalles
      try {
        const instanceName = instance.name || instance.instanceName || instance.instance?.instanceName;
        
        if (instanceName) {
          console.log(`\n🔍 Obteniendo detalles de: ${instanceName}`);
          
          // Estado de conexión
          const statusResponse = await axios.get(
            `${EVOLUTION_URL}/instance/connectionState/${instanceName}`,
            { headers: { 'apikey': API_KEY } }
          );
          
          console.log('Estado:', statusResponse.data);
        }
      } catch (error) {
        console.log('No se pudieron obtener detalles adicionales');
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response.data);
    }
  }
}

checkInstances();