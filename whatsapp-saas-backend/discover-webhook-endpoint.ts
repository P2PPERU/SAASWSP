// discover-webhook-endpoint.ts
// Script para descubrir el endpoint correcto de webhook

import axios from 'axios';

async function discoverWebhookEndpoint() {
  const EVOLUTION_URL = 'http://localhost:8080';
  const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
  const INSTANCE_NAME = 'alexandrgm';
  
  console.log('🔍 Descubriendo endpoints de Evolution API...\n');

  const headers = {
    'apikey': API_KEY,
    'Content-Type': 'application/json',
  };

  // 1. Verificar que la instancia existe
  console.log('1️⃣ Verificando que la instancia existe...');
  try {
    const instances = await axios.get(`${EVOLUTION_URL}/instance/fetchInstances`, { headers });
    const instance = instances.data.find((i: any) => 
      i.name === INSTANCE_NAME || 
      i.instanceName === INSTANCE_NAME || 
      i.instance?.instanceName === INSTANCE_NAME
    );
    
    if (instance) {
      console.log('✅ Instancia encontrada:', instance.name || instance.instanceName);
    } else {
      console.log('❌ Instancia no encontrada');
      return;
    }
  } catch (error) {
    console.error('Error obteniendo instancias:', error.message);
    return;
  }

  // 2. Probar diferentes endpoints de webhook
  console.log('\n2️⃣ Probando diferentes endpoints de webhook...\n');
  
  const endpoints = [
    // Webhooks generales
    { method: 'GET', url: `/webhook/find` },
    { method: 'GET', url: `/webhook/list` },
    { method: 'GET', url: `/webhook` },
    
    // Webhooks por instancia - diferentes formatos
    { method: 'GET', url: `/webhook/${INSTANCE_NAME}` },
    { method: 'GET', url: `/webhook/find/${INSTANCE_NAME}` },
    { method: 'GET', url: `/instance/${INSTANCE_NAME}/webhook` },
    { method: 'GET', url: `/instance/webhook/${INSTANCE_NAME}` },
    
    // Settings de instancia
    { method: 'GET', url: `/instance/settings/${INSTANCE_NAME}` },
    { method: 'GET', url: `/instance/${INSTANCE_NAME}/settings` },
    
    // Configuración general
    { method: 'GET', url: `/instance/${INSTANCE_NAME}` },
  ];

  const workingEndpoints = [];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${EVOLUTION_URL}${endpoint.url}`,
        headers,
      });
      
      console.log(`✅ ${endpoint.method} ${endpoint.url} - Status: ${response.status}`);
      console.log('   Respuesta:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...\n');
      workingEndpoints.push(endpoint);
    } catch (error: any) {
      console.log(`❌ ${endpoint.method} ${endpoint.url} - Status: ${error.response?.status || 'Error'}`);
    }
  }

  // 3. Probar endpoints de configuración
  console.log('\n3️⃣ Probando endpoints de configuración de webhook...\n');
  
  const YOUR_HOST_IP = 'host.docker.internal';
  const WEBHOOK_URL = `http://${YOUR_HOST_IP}:3000/api/v1/whatsapp/webhook/${INSTANCE_NAME}`;
  
  const setEndpoints = [
    // Formato más simple
    {
      method: 'POST',
      url: `/webhook/${INSTANCE_NAME}`,
      data: {
        url: WEBHOOK_URL,
        enabled: true,
      }
    },
    // Con eventos específicos
    {
      method: 'POST',
      url: `/webhook/instance/${INSTANCE_NAME}`,
      data: {
        url: WEBHOOK_URL,
        enabled: true,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      }
    },
    // Settings generales
    {
      method: 'PUT',
      url: `/instance/settings/${INSTANCE_NAME}`,
      data: {
        webhook: {
          url: WEBHOOK_URL,
          enabled: true,
        }
      }
    },
    // Formato webhook_url
    {
      method: 'POST',
      url: `/instance/${INSTANCE_NAME}/webhook`,
      data: {
        webhook_url: WEBHOOK_URL,
        webhook_enabled: true,
      }
    },
  ];

  console.log(`Webhook URL a configurar: ${WEBHOOK_URL}\n`);

  for (const endpoint of setEndpoints) {
    try {
      console.log(`🔧 Intentando ${endpoint.method} ${endpoint.url}`);
      console.log('   Data:', JSON.stringify(endpoint.data, null, 2));
      
      const response = await axios({
        method: endpoint.method,
        url: `${EVOLUTION_URL}${endpoint.url}`,
        data: endpoint.data,
        headers,
      });
      
      console.log(`✅ ¡ÉXITO! Webhook configurado`);
      console.log('   Respuesta:', JSON.stringify(response.data, null, 2));
      
      // Si funciona, crear el script correcto
      console.log('\n📝 Usa este código en tu setup-webhook.ts:');
      console.log(`
const response = await axios.${endpoint.method.toLowerCase()}(
  \`\${EVOLUTION_URL}${endpoint.url}\`,
  ${JSON.stringify(endpoint.data, null, 2)},
  { headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' } }
);
      `);
      
      return;
    } catch (error: any) {
      console.log(`❌ Falló - Status: ${error.response?.status || 'Error'}\n`);
    }
  }

  // 4. Si nada funciona, mostrar alternativas
  console.log('\n😔 No se encontró un endpoint funcional para webhooks');
  console.log('\n💡 Alternativas:');
  console.log('1. Revisa la documentación de Evolution API en: http://localhost:8080/docs');
  console.log('2. Usa el Manager en: http://localhost:8080/manager');
  console.log('3. Verifica la versión de Evolution API que estás usando');
  
  if (workingEndpoints.length > 0) {
    console.log('\n📋 Endpoints que funcionan (podrían dar pistas):');
    workingEndpoints.forEach(ep => {
      console.log(`   - ${ep.method} ${ep.url}`);
    });
  }
}

// Ejecutar
discoverWebhookEndpoint();