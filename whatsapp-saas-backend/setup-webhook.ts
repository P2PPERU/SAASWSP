// setup-webhook.ts
// Ejecutar con: npx ts-node setup-webhook.ts <instance-name>

import axios from 'axios';

async function setupWebhook(instanceName: string) {
  const EVOLUTION_URL = 'http://localhost:8080';
  const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
  
  // Como Evolution API está en Docker, usa tu IP local
  // En Windows, puedes obtenerla con: ipconfig
  // Busca tu IPv4 Address (ej: 192.168.1.100)
  const YOUR_HOST_IP = 'host.docker.internal'; // Para Windows/Mac
  // const YOUR_HOST_IP = '192.168.1.100'; // Reemplaza con tu IP real si es necesario
  
  const WEBHOOK_URL = `http://${YOUR_HOST_IP}:3000/api/v1/whatsapp/webhook/${instanceName}`;

  console.log(`🔗 Configurando webhook para instancia: ${instanceName}`);
  console.log(`📍 Webhook URL: ${WEBHOOK_URL}\n`);

  try {
    // Evolution API v2 usa una estructura diferente
    const response = await axios.put(
      `${EVOLUTION_URL}/instance/webhook/${instanceName}`,
      {
        enabled: true,
        url: WEBHOOK_URL,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED',
          'MESSAGES_SET',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'SEND_MESSAGE',
          'CONNECTION_UPDATE',
          'PRESENCE_UPDATE',
          'GROUPS_UPSERT',
          'GROUPS_UPDATE',
          'GROUP_PARTICIPANTS_UPDATE',
          'NEW_JWT_TOKEN',
        ],
      },
      {
        headers: {
          'apikey': API_KEY,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Webhook configurado exitosamente');
    console.log('📝 Respuesta:', JSON.stringify(response.data, null, 2));
    
    console.log('\n🧪 Para probar el webhook:');
    console.log('   1. Envía un mensaje a tu número de WhatsApp (+51 991 351 213)');
    console.log('   2. Verifica los logs en la consola de NestJS');
    console.log('   3. Deberías ver: "🔔 Webhook recibido para instancia: alexandrgm"');
    
    console.log('\n💡 Si no funciona:');
    console.log('   1. Verifica que tu IP sea accesible desde Docker');
    console.log('   2. Prueba con tu IP local en lugar de host.docker.internal');
    console.log('   3. Asegúrate de que el firewall permita conexiones al puerto 3000');

  } catch (error: any) {
    console.error('❌ Error configurando webhook:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Detalles completos:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 404) {
        console.log('\n💡 Posible solución:');
        console.log('   La instancia no existe o el endpoint cambió.');
        console.log('   Verifica que la instancia "alexandrgm" existe en Evolution API');
      }
    }
  }
}

// Verificar argumentos
if (process.argv.length < 3) {
  console.log('❌ Uso: npx ts-node setup-webhook.ts <nombre-instancia>');
  console.log('Ejemplo: npx ts-node setup-webhook.ts alexandrgm');
  process.exit(1);
}

const instanceName = process.argv[2];
setupWebhook(instanceName); // Solo una vez!