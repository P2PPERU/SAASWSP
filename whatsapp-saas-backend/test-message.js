// test-message.js
const axios = require('axios');

async function testMessage() {
  console.log('🚀 Probando envío de mensaje directo a Evolution API...\n');
  
  try {
    // 1. Verificar estado de la instancia
    console.log('1️⃣ Verificando estado de la instancia...');
    const status = await axios.get(
      'http://localhost:8080/instance/connectionState/cded169b_29af3b0a',
      {
        headers: { apikey: 'B6D711FCDE4D4FD5936544120E713976' },
        timeout: 5000
      }
    );
    console.log('Estado:', status.data.instance.state);
    
    if (status.data.instance.state !== 'open') {
      console.log('❌ WhatsApp no está conectado. Conecta primero.');
      return;
    }
    
    // 2. Enviar mensaje
    console.log('\n2️⃣ Enviando mensaje...');
    const startTime = Date.now();
    
    const message = await axios.post(
      'http://localhost:8080/message/sendText/cded169b_29af3b0a',
      {
        number: '51947841201@s.whatsapp.net',
        text: `🚀 Mensaje de prueba enviado a las ${new Date().toLocaleTimeString()}`,
        delay: 1000
      },
      {
        headers: {
          'apikey': 'B6D711FCDE4D4FD5936544120E713976',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    const duration = Date.now() - startTime;
    console.log(`✅ Mensaje enviado exitosamente en ${duration}ms`);
    console.log('Respuesta:', message.data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response.data);
    }
  }
}

testMessage();