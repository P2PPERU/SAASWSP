// test-ai-api.ts
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';
let TOKEN = '';

// Configuración de prueba
const TEST_CONFIG = {
  email: 'test1@example.com',
  password: 'Test123'
};

async function getAuthToken() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, TEST_CONFIG);
    TOKEN = response.data.data.accessToken;
    console.log('✅ Autenticación exitosa\n');
    return TOKEN;
  } catch (error: any) {
    console.error('❌ Error de autenticación:', error.response?.data || error.message);
    throw error;
  }
}

async function testAIAPI() {
  console.log('🤖 Probando API de Configuración de IA\n');

  const headers = { Authorization: `Bearer ${TOKEN}` };

  try {
    // 1. Obtener configuración actual
    console.log('1️⃣ Obteniendo configuración actual...');
    const configResponse = await axios.get(`${API_URL}/ai/config`, { headers });
    console.log('Configuración actual:', {
      enabled: configResponse.data.enabled,
      model: configResponse.data.model,
      personality: configResponse.data.personality,
      responseMode: configResponse.data.responseMode
    });
    console.log('');

    // 2. Activar IA
    console.log('2️⃣ Activando IA...');
    const toggleResponse = await axios.post(
      `${API_URL}/ai/toggle`,
      { enabled: true },
      { headers }
    );
    console.log('Respuesta:', toggleResponse.data);
    console.log('');

    // 3. Actualizar configuración
    console.log('3️⃣ Actualizando configuración...');
    const updateResponse = await axios.put(
      `${API_URL}/ai/config`,
      {
        personality: 'friendly',
        systemPrompt: 'Eres un asistente muy amigable de una tienda de tecnología. Ayuda a los clientes con sus compras.',
        settings: {
          temperature: 0.8,
          maxTokens: 200,
          responseDelay: 1000
        },
        keywords: ['ayuda', 'precio', 'producto', 'comprar']
      },
      { headers }
    );
    console.log('Configuración actualizada:', {
      personality: updateResponse.data.personality,
      keywords: updateResponse.data.keywords
    });
    console.log('');

    // 4. Probar prompt
    console.log('4️⃣ Probando generación de respuesta...');
    const testResponse = await axios.post(
      `${API_URL}/ai/test`,
      {
        message: 'Hola, ¿qué productos tienen disponibles?',
        context: [
          'Hola, bienvenido a TechStore',
          '¿En qué puedo ayudarte?'
        ]
      },
      { headers }
    );
    console.log('Mensaje de prueba:', testResponse.data.message);
    console.log('Respuesta IA:', testResponse.data.response);
    console.log('Tokens usados:', testResponse.data.metadata.tokensUsed);
    console.log('');

    // 5. Obtener estadísticas
    console.log('5️⃣ Obteniendo estadísticas...');
    const statsResponse = await axios.get(`${API_URL}/ai/stats?period=week`, { headers });
    console.log('Estadísticas semanales:', {
      totalMessages: statsResponse.data.messages.total,
      handledByAI: statsResponse.data.messages.handledByAI,
      aiResponseRate: `${statsResponse.data.messages.aiResponseRate}%`,
      tokensUsed: statsResponse.data.performance.tokensUsed
    });
    console.log('');

    // 6. Obtener plantillas de industria
    console.log('6️⃣ Obteniendo plantillas disponibles...');
    const templatesResponse = await axios.get(`${API_URL}/ai/templates`, { headers });
    console.log('Plantillas disponibles:', templatesResponse.data.map((t: any) => t.industry));
    console.log('');

    // 7. Aplicar plantilla de ecommerce
    console.log('7️⃣ Aplicando plantilla de ecommerce...');
    const applyTemplateResponse = await axios.post(
      `${API_URL}/ai/templates/apply`,
      { industry: 'ecommerce' },
      { headers }
    );
    console.log('Plantilla aplicada:', {
      personality: applyTemplateResponse.data.personality,
      welcomeMessage: applyTemplateResponse.data.welcomeMessage
    });
    console.log('');

    // 8. Verificar salud del servicio
    console.log('8️⃣ Verificando salud del servicio...');
    const healthResponse = await axios.get(`${API_URL}/ai/health`, { headers });
    console.log('Estado del servicio:', healthResponse.data);
    console.log('');

    console.log('✅ ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📊 Resumen de endpoints disponibles:');
    console.log('- GET  /ai/config - Obtener configuración');
    console.log('- PUT  /ai/config - Actualizar configuración');
    console.log('- POST /ai/toggle - Activar/Desactivar IA');
    console.log('- GET  /ai/stats - Obtener estadísticas');
    console.log('- POST /ai/test - Probar respuesta');
    console.log('- GET  /ai/templates - Ver plantillas');
    console.log('- POST /ai/templates/apply - Aplicar plantilla');
    console.log('- GET  /ai/health - Estado del servicio');
    console.log('- POST /ai/reset-usage - Resetear contadores');
    console.log('- GET  /ai/custom-responses - Ver respuestas personalizadas');
    console.log('- PUT  /ai/custom-responses - Actualizar respuestas');

  } catch (error: any) {
    console.error('❌ Error en prueba:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.error('\n⚠️  Parece que los endpoints no están disponibles.');
      console.error('Asegúrate de:');
      console.error('1. Haber guardado todos los archivos');
      console.error('2. Reiniciar el servidor: npm run start:dev');
    }
  }
}

// Script principal
async function main() {
  try {
    await getAuthToken();
    await testAIAPI();

    console.log('\n🎯 Próximos pasos:');
    console.log('1. Integrar estos endpoints en tu frontend');
    console.log('2. Crear un dashboard de IA');
    console.log('3. Agregar gráficos de estadísticas');
    console.log('4. Implementar gestión de respuestas personalizadas');

  } catch (error) {
    console.error('Error fatal:', error.message);
  }
}

// Ejecutar
console.log('🚀 Test de API de IA - WhatsApp SaaS');
console.log('=====================================\n');
main();