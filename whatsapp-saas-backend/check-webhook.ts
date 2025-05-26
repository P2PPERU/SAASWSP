// check-webhook.ts
// Script para verificar y configurar webhooks correctamente

import axios from 'axios';

async function checkAndSetupWebhook(instanceName: string) {
  const EVOLUTION_URL = 'http://localhost:8080';
  const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
  
  console.log(`🔍 Verificando webhook para instancia: ${instanceName}\n`);

  try {
    // Primero, intentar obtener el webhook actual
    console.log('1️⃣ Obteniendo configuración actual del webhook...');
    try {
      const getResponse = await axios.get(
        `${EVOLUTION_URL}/instance/webhook/${instanceName}`,
        {
          headers: { 'apikey': API_KEY }
        }
      );
      console.log('Webhook actual:', JSON.stringify(getResponse.data, null, 2));
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('No hay webhook configurado actualmente');
      } else {
        console.log('Error obteniendo webhook:', error.message);
      }
    }

    // Obtener tu IP local
    console.log('\n2️⃣ Detectando tu IP local...');
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = '';
    
    Object.keys(networkInterfaces).forEach(interfaceName => {
      networkInterfaces[interfaceName].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIP = iface.address;
        }
      });
    });

    console.log(`Tu IP local es: ${localIP}`);
    
    // Diferentes URLs para probar
    const urlOptions = [
      `http://host.docker.internal:3000/api/v1/whatsapp/webhook/${instanceName}`,
      `http://${localIP}:3000/api/v1/whatsapp/webhook/${instanceName}`,
      `http://localhost:3000/api/v1/whatsapp/webhook/${instanceName}`,
    ];

    console.log('\n3️⃣ URLs de webhook disponibles:');
    urlOptions.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });

    // Usar la primera opción por defecto (host.docker.internal)
    const WEBHOOK_URL = urlOptions[0];
    
    console.log(`\n4️⃣ Configurando webhook con: ${WEBHOOK_URL}`);

    // Probar diferentes formatos de configuración
    const configs = [
      // Formato 1: PUT con estructura plana
      {
        method: 'PUT',
        url: `${EVOLUTION_URL}/instance/webhook/${instanceName}`,
        data: {
          enabled: true,
          url: WEBHOOK_URL,
          webhook_by_events: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        }
      },
      // Formato 2: POST con webhook anidado
      {
        method: 'POST',
        url: `${EVOLUTION_URL}/webhook/set/${instanceName}`,
        data: {
          webhook: {
            enabled: true,
            url: WEBHOOK_URL,
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
          }
        }
      },
      // Formato 3: POST directo
      {
        method: 'POST',
        url: `${EVOLUTION_URL}/instance/${instanceName}/webhook`,
        data: {
          url: WEBHOOK_URL,
          enabled: true,
        }
      }
    ];

    let success = false;
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      console.log(`\n🔧 Intentando formato ${i + 1}...`);
      
      try {
        const response = await axios({
          method: config.method,
          url: config.url,
          data: config.data,
          headers: {
            'apikey': API_KEY,
            'Content-Type': 'application/json',
          },
        });

        console.log('✅ ¡Webhook configurado exitosamente!');
        console.log('Respuesta:', JSON.stringify(response.data, null, 2));
        success = true;
        break;
      } catch (error: any) {
        console.log(`❌ Formato ${i + 1} falló:`, error.response?.status || error.message);
        if (error.response?.data) {
          console.log('Detalles:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    if (!success) {
      console.log('\n😔 No se pudo configurar el webhook con ningún formato');
      console.log('\n💡 Alternativa: Configura el webhook manualmente en Evolution API Manager');
      console.log('   1. Abre http://localhost:8080/manager');
      console.log('   2. Usuario: admin, Contraseña: admin');
      console.log('   3. Busca tu instancia y configura el webhook manualmente');
    } else {
      console.log('\n🎉 ¡Webhook configurado correctamente!');
      console.log('\n🧪 Para probar:');
      console.log('   1. Envía un mensaje a tu WhatsApp');
      console.log('   2. Revisa los logs de NestJS');
    }

  } catch (error: any) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar
const instanceName = process.argv[2] || 'alexandrgm';
checkAndSetupWebhook(instanceName);