// test-send-now.ts
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';
const INSTANCE_ID = 'e5271e6f-9463-468d-a985-1f799b089ea0';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZmZkOTg2NC0wYzgzLTRmZWEtOTlkNS05ODFiN2UzMDExM2UiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwidGVuYW50SWQiOiI0YzgyYmFkZC04M2M1LTQ5NGQtOWY1OC0zZTNhOGRkY2EwMjkiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDgyMTExMTMsImV4cCI6MTc0ODgxNTkxM30.7FIZM5VTyqgwVKWyd0aXOfLBDAa1gLsS5fje4XcxP9Q';

async function sendTestMessage() {
  const to = process.argv[2] || '51991351213';  // Número por defecto
  const text = process.argv[3] || 'Hola! Este es un mensaje de prueba desde mi SaaS de WhatsApp 🚀';

  console.log('📤 Enviando mensaje...');
  console.log(`   Para: ${to}`);
  console.log(`   Texto: ${text}\n`);

  try {
    const response = await axios.post(
      `${API_URL}/whatsapp/instances/${INSTANCE_ID}/messages/send`,
      { to, text },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ ¡MENSAJE ENVIADO EXITOSAMENTE!');
    console.log('\nRespuesta del servidor:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n🎉 ¡Tu SaaS de WhatsApp está funcionando perfectamente!');
    console.log('\n💡 Próximos pasos:');
    console.log('1. Abre el archivo dashboard.html en tu navegador');
    console.log('2. Envía más mensajes desde la interfaz web');
    console.log('3. Crea tu propio frontend personalizado');
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  El token puede haber expirado. Ejecuta:');
      console.log('   npx ts-node import-existing-instance.ts');
      console.log('   Para obtener un nuevo token');
    }
  }
}

sendTestMessage();