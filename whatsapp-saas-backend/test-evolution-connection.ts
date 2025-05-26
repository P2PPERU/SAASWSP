// test-evolution-connection.ts
// Ejecutar con: npx ts-node test-evolution-connection.ts

import axios from 'axios';

async function testEvolutionAPI() {
  const EVOLUTION_URL = 'http://localhost:8080';
  const API_KEY = '429683C4C977415CAAFCCE10F7D57E11'; // API Key de Evolution API

  console.log('🔍 Probando conexión con Evolution API...\n');

  try {
    // 1. Probar endpoint básico
    console.log('1️⃣ Verificando que Evolution API está activa...');
    const healthCheck = await axios.get(`${EVOLUTION_URL}/`, {
      headers: { 'apikey': API_KEY }
    });
    console.log('✅ Evolution API está activa\n');

    // 2. Obtener instancias
    console.log('2️⃣ Obteniendo lista de instancias...');
    const instances = await axios.get(`${EVOLUTION_URL}/instance/fetchInstances`, {
      headers: { 'apikey': API_KEY }
    });
    console.log(`✅ Instancias encontradas: ${instances.data.length || 0}`);
    if (instances.data.length > 0) {
      console.log('Instancias:', instances.data.map((i: any) => ({
        name: i.instance?.instanceName,
        status: i.instance?.connectionStatus
      })));
    }
    console.log('');

    // 3. Crear una instancia de prueba
    console.log('3️⃣ Creando instancia de prueba...');
    const testInstanceName = `test_${Date.now()}`;
    try {
      const createResponse = await axios.post(
        `${EVOLUTION_URL}/instance/create`,
        {
          instanceName: testInstanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        },
        {
          headers: { 
            'apikey': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Instancia creada exitosamente');
      console.log('   - Nombre:', testInstanceName);
      console.log('   - Estado:', createResponse.data.instance?.status);
      
      // 4. Eliminar instancia de prueba
      console.log('\n4️⃣ Eliminando instancia de prueba...');
      await axios.delete(
        `${EVOLUTION_URL}/instance/delete/${testInstanceName}`,
        {
          headers: { 'apikey': API_KEY }
        }
      );
      console.log('✅ Instancia de prueba eliminada\n');
      
    } catch (createError: any) {
      if (createError.response?.status === 409) {
        console.log('⚠️  Ya existe una instancia con nombre similar\n');
      } else {
        throw createError;
      }
    }

    console.log('🎉 ¡Todas las pruebas pasaron! Evolution API está funcionando correctamente.');
    console.log('\n📝 Configuración verificada:');
    console.log(`   - URL: ${EVOLUTION_URL}`);
    console.log(`   - API Key: ${API_KEY.substring(0, 10)}...`);

  } catch (error: any) {
    console.error('❌ Error al conectar con Evolution API:');
    console.error('   - Mensaje:', error.message);
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Data:', error.response.data);
    }
    console.error('\n💡 Verifica que:');
    console.error('   1. Evolution API esté corriendo en el puerto 8080');
    console.error('   2. La API Key sea correcta');
    console.error('   3. No haya firewall bloqueando la conexión');
  }
}

// Ejecutar las pruebas
testEvolutionAPI();