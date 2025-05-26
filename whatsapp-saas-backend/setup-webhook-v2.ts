// setup-webhook-v2.ts
// Configurar webhook para Evolution API v2

import axios from 'axios';
import * as os from 'os';

async function setupWebhookV2() {
  const EVOLUTION_URL = 'http://localhost:8080';
  const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
  const INSTANCE_NAME = 'alexandrgm';
  
  console.log('🔧 Configurando webhook para Evolution API v2...\n');

  // Obtener IP local
  const networkInterfaces = os.networkInterfaces();
  let localIP = '';
  
Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName]?.forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
        }
    });
});

  console.log(`📍 Tu IP local: ${localIP}`);

  // Probar diferentes URLs
  const urlOptions = [
    `http://host.docker.internal:3000/api/v1/whatsapp/webhook/${INSTANCE_NAME}`,
    `http://${localIP}:3000/api/v1/whatsapp/webhook/${INSTANCE_NAME}`,
    `http://172.17.0.1:3000/api/v1/whatsapp/webhook/${INSTANCE_NAME}`, // IP del host Docker en Linux
  ];

  const headers = {
    'apikey': API_KEY,
    'Content-Type': 'application/json',
  };

  // Intentar diferentes formatos de Evolution API v2
  const attempts = [
    // Formato 1: POST directo con webhook_
    {
      method: 'POST',
      url: `${EVOLUTION_URL}/webhook/set/${INSTANCE_NAME}`,
      data: {
        enabled: true,
        url: urlOptions[0],
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'CONNECTION_UPDATE',
        ],
      }
    },
    // Formato 2: Actualizar instance con webhook
    {
      method: 'PUT',
      url: `${EVOLUTION_URL}/instance/update/${INSTANCE_NAME}`,
      data: {
        webhook: {
          enabled: true,
          url: urlOptions[0],
        }
      }
    },
    // Formato 3: Settings con webhook
    {
      method: 'POST',
      url: `${EVOLUTION_URL}/settings/webhook/${INSTANCE_NAME}`,
      data: {
        enabled: true,
        url: urlOptions[0],
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      }
    },
    // Formato 4: Instance settings
    {
      method: 'PUT',
      url: `${EVOLUTION_URL}/instance/${INSTANCE_NAME}/settings`,
      data: {
        webhookUrl: urlOptions[0],
        webhookEnabled: true,
      }
    },
  ];

  console.log('\n🔄 Intentando configurar webhook...\n');

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    
    for (let j = 0; j < urlOptions.length && j < 2; j++) {
      const webhookUrl = urlOptions[j];
      attempt.data.url = webhookUrl;
      
      if (attempt.data.webhook) {
        attempt.data.webhook.url = webhookUrl;
      }
      if (attempt.data.webhookUrl) {
        attempt.data.webhookUrl = webhookUrl;
      }
      
      console.log(`Intento ${i + 1}.${j + 1}: ${attempt.method} ${attempt.url}`);
      console.log(`Webhook URL: ${webhookUrl}`);
      
      try {
        const response = await axios({
          method: attempt.method,
          url: attempt.url,
          data: attempt.data,
          headers,
        });
        
        console.log('✅ ¡ÉXITO! Webhook configurado');
        console.log('Respuesta:', JSON.stringify(response.data, null, 2));
        
        // Verificar configuración
        console.log('\n🔍 Verificando configuración...');
        try {
          const check = await axios.get(
            `${EVOLUTION_URL}/webhook/find/${INSTANCE_NAME}`,
            { headers }
          );
          console.log('Webhook actual:', JSON.stringify(check.data, null, 2));
        } catch (e) {
          console.log('No se pudo verificar');
        }
        
        console.log('\n🎉 ¡Webhook configurado correctamente!');
        console.log('\n📝 Para probar:');
        console.log('1. Envía un mensaje a tu WhatsApp (+51 991 351 213)');
        console.log('2. Revisa los logs de tu backend NestJS');
        console.log('3. Deberías ver: "🔔 Webhook recibido"');
        
        return;
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.log(`❌ Error ${error.response?.status}: ${error.response?.data?.message || error.message}`);
        }
      }
    }
  }

  // Si llegamos aquí, ningún método funcionó
  console.log('\n😔 No se pudo configurar el webhook automáticamente');
  console.log('\n🌐 SOLUCIÓN: Configura manualmente desde Evolution Manager');
  console.log('\n1. Abre: http://localhost:8080/manager');
  console.log('2. Login: admin / admin');
  console.log('3. Busca la instancia "alexandrgm"');
  console.log('4. En configuración de webhook, agrega:');
  console.log(`   URL: http://${localIP}:3000/api/v1/whatsapp/webhook/alexandrgm`);
  console.log('   Events: MESSAGES_UPSERT, CONNECTION_UPDATE');
  
  console.log('\n📚 O revisa la documentación:');
  console.log('- Swagger: http://localhost:8080/docs');
  console.log('- API Docs: http://localhost:8080/api-docs');
  
  console.log('\n💡 IMPORTANTE: Mientras tanto, puedes:');
  console.log('✅ Enviar mensajes (funciona sin webhook)');
  console.log('✅ Ver estado de conexión');
  console.log('✅ Gestionar instancias');
  console.log('❌ Recibir mensajes (requiere webhook)');
}

// Ejecutar
setupWebhookV2();