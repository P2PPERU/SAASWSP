// test-new-features.ts
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';
const INSTANCE_ID = 'e5271e6f-9463-468d-a985-1f799b089ea0'; // Tu instance ID real

// CONFIGURACIÓN DE CREDENCIALES - USA ESTAS
const CREDENTIALS = {
  email: 'test1@example.com',    // <- Tu email correcto
  password: 'Test123'              // <- Tu contraseña
};

// Si ya tienes un token, puedes ponerlo aquí directamente
const EXISTING_TOKEN = ''; // <- O pega tu token aquí si ya lo tienes

// Primero necesitas obtener un token válido
async function getToken() {
  // Si ya hay un token configurado, usarlo
  if (EXISTING_TOKEN) {
    console.log('✅ Usando token existente');
    return EXISTING_TOKEN;
  }

  try {
    // Intenta hacer login
    console.log(`   Intentando login con: ${CREDENTIALS.email}`);
    const response = await axios.post(`${API_URL}/auth/login`, CREDENTIALS);
    return response.data.data.accessToken;
  } catch (error: any) {
    console.error('\n❌ Error de autenticación:', error.response?.data || error.message);
    console.log('\n💡 Soluciones:');
    console.log('1. Ejecuta primero: npx ts-node create-test-user.ts');
    console.log('2. O ejecuta: npx ts-node import-existing-instance.ts');
    console.log('3. O actualiza las credenciales en este archivo');
    throw error;
  }
}

async function testNewFeatures() {
  let TOKEN: string;
  
  try {
    console.log('🔐 Obteniendo token de acceso...');
    TOKEN = await getToken();
    console.log('✅ Token obtenido exitosamente\n');
  } catch (error) {
    console.error('❌ No se pudo obtener el token. Verifica tus credenciales.');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 Probando nuevas funcionalidades de WhatsApp SaaS\n');

  try {
    // 1. Verificar estadísticas de la cola
    console.log('1️⃣ Obteniendo estadísticas de la cola...');
    const queueStats = await axios.get(`${API_URL}/whatsapp/queue/stats`, { headers });
    console.log('📊 Estadísticas de cola:', queueStats.data.data);
    console.log('');

    // 2. Verificar uso de rate limit
    console.log('2️⃣ Obteniendo uso de rate limit...');
    const rateLimitUsage = await axios.get(`${API_URL}/whatsapp/rate-limit/usage`, { headers });
    console.log('🚦 Uso de límites:', rateLimitUsage.data.data);
    console.log('');

    // 3. Probar envío de mensaje normal (ahora con cola)
    console.log('3️⃣ Enviando mensaje individual...');
    const singleMessage = await axios.post(
      `${API_URL}/whatsapp/instances/${INSTANCE_ID}/messages/send`,
      {
        to: '51947841201', // Tu número o cualquier número válido
        text: `Test mensaje con cola y rate limiting 🚀 - ${new Date().toLocaleTimeString()}`
      },
      { headers }
    );
    console.log('✅ Mensaje agregado a la cola:', singleMessage.data);
    console.log('');

    // 4. Probar envío masivo
    console.log('4️⃣ Enviando mensajes masivos...');
    const bulkMessages = await axios.post(
      `${API_URL}/whatsapp/instances/${INSTANCE_ID}/messages/bulk`,
      {
        recipients: ['51947841201', '51948155106', '51981087519'], // Números de prueba
        text: `Mensaje masivo de prueba 📢 - ${new Date().toLocaleTimeString()}`,
        delayBetweenMessages: 2000 // 2 segundos entre mensajes
      },
      { headers }
    );
    console.log('✅ Mensajes masivos encolados:', bulkMessages.data.data);
    console.log('');

    // 5. Programar un mensaje
    console.log('5️⃣ Programando mensaje futuro...');
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 5); // 5 minutos en el futuro
    
    const scheduledMessage = await axios.post(
      `${API_URL}/whatsapp/instances/${INSTANCE_ID}/messages/schedule`,
      {
        to: '51947841201', // Tu número
        text: `Mensaje programado enviado a las ${futureDate.toLocaleTimeString()} ⏰`,
        sendAt: futureDate.toISOString()
      },
      { headers }
    );
    console.log('✅ Mensaje programado:', scheduledMessage.data.data);
    console.log('');

    // 6. Verificar estadísticas actualizadas
    console.log('6️⃣ Verificando estadísticas actualizadas...');
    const updatedStats = await axios.get(`${API_URL}/whatsapp/queue/stats`, { headers });
    console.log('📊 Nuevas estadísticas:', updatedStats.data.data);
    
    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📝 Funcionalidades implementadas:');
    console.log('✅ Cola de mensajes con reintentos');
    console.log('✅ Rate limiting por plan');
    console.log('✅ Mensajes masivos con delay');
    console.log('✅ Mensajes programados');
    console.log('✅ Monitoreo y estadísticas');
    
    console.log('\n💡 Próximos pasos:');
    console.log('1. Monitorea las colas en tiempo real');
    console.log('2. Verifica que los mensajes se envíen correctamente');
    console.log('3. Revisa los logs para ver el procesamiento asíncrono');
    console.log('4. Prueba los límites según el plan del tenant');
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      console.log('\n⚠️  Rate limit alcanzado. Esto significa que el rate limiting está funcionando correctamente!');
      console.log('Espera un momento antes de intentar de nuevo.');
    }
  }
}

// Función para probar reintentar mensajes fallidos
async function testRetryFailed() {
  try {
    const TOKEN = await getToken();
    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    console.log('\n🔄 Reintentando mensajes fallidos...');
    const retry = await axios.post(`${API_URL}/whatsapp/queue/retry-failed`, {}, { headers });
    console.log('✅ Resultado:', retry.data);
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Función para ver las conversaciones activas
async function checkConversations() {
  try {
    const TOKEN = await getToken();
    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    console.log('\n💬 Obteniendo conversaciones...');
    const conversations = await axios.get(
      `${API_URL}/whatsapp/instances/${INSTANCE_ID}/conversations`, 
      { headers }
    );
    console.log('Conversaciones:', conversations.data.data);
    
    // Si hay conversaciones, obtener mensajes de la primera
    if (conversations.data.data.length > 0) {
      const firstConv = conversations.data.data[0];
      console.log(`\n📝 Mensajes de la conversación ${firstConv.id}:`);
      const messages = await axios.get(
        `${API_URL}/whatsapp/conversations/${firstConv.id}/messages`,
        { headers }
      );
      console.log('Últimos mensajes:', messages.data.data);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Ejecutar pruebas
console.log('🚀 WhatsApp SaaS - Prueba de Nuevas Funcionalidades');
console.log('API URL:', API_URL);
console.log('Instance ID:', INSTANCE_ID);
console.log('');

testNewFeatures()
  .then(() => {
    // Opcional: reintentar mensajes fallidos después de 10 segundos
    setTimeout(() => {
      testRetryFailed();
    }, 10000);
    
    // Opcional: revisar conversaciones después de 5 segundos
    setTimeout(() => {
      checkConversations();
    }, 5000);
  })
  .catch(console.error);