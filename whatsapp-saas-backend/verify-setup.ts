// verify-setup.ts
// Ejecutar con: npx ts-node verify-setup.ts

import axios from 'axios';
import { Client } from 'pg';
import * as net from 'net';

async function checkRedis(): Promise<boolean> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      resolve(false);
    }, 1000);

    client.connect(6379, 'localhost', () => {
      clearTimeout(timeout);
      client.end();
      resolve(true);
    });

    client.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function verifySetup() {
  console.log('🔍 Verificando configuración completa del sistema...\n');

  const results = {
    evolutionApi: false,
    backendDb: false,
    evolutionDb: false,
    redis: false,
    backend: false,
  };

  // 1. Verificar Evolution API
  console.log('1️⃣ Verificando Evolution API...');
  try {
    const response = await axios.get('http://localhost:8080/', {
      headers: { 'apikey': '429683C4C977415CAAFCCE10F7D57E11' }
    });
    console.log('✅ Evolution API está activa en puerto 8080');
    results.evolutionApi = true;
  } catch (error) {
    console.error('❌ Evolution API no responde en puerto 8080');
    console.error('   Asegúrate de que esté corriendo con: docker compose up -d');
  }

  // 2. Verificar PostgreSQL del Backend
  console.log('\n2️⃣ Verificando PostgreSQL del Backend...');
  const backendDb = new Client({
    host: 'localhost',
    port: 5433,  // Puerto del backend
    user: 'postgres',
    password: 'postgres',
    database: 'whatsapp_saas',
  });

  try {
    await backendDb.connect();
    const result = await backendDb.query('SELECT NOW()');
    console.log('✅ PostgreSQL del Backend activo en puerto 5433');
    console.log(`   Base de datos: whatsapp_saas`);
    results.backendDb = true;
    await backendDb.end();
  } catch (error) {
    console.error('❌ PostgreSQL del Backend no responde en puerto 5433');
    console.error('   Ejecuta en tu proyecto: docker compose -f docker-compose.dev.yml up -d');
  }

  // 3. Verificar PostgreSQL de Evolution
  console.log('\n3️⃣ Verificando PostgreSQL de Evolution API...');
  const evolutionDb = new Client({
    host: 'localhost',
    port: 5432,  // Puerto de Evolution
    user: 'evolution',
    password: 'evolution',
    database: 'evolution',
  });

  try {
    await evolutionDb.connect();
    const result = await evolutionDb.query('SELECT NOW()');
    console.log('✅ PostgreSQL de Evolution activo en puerto 5432');
    console.log(`   Base de datos: evolution`);
    results.evolutionDb = true;
    await evolutionDb.end();
  } catch (error) {
    console.error('❌ PostgreSQL de Evolution no responde en puerto 5432');
  }

  // 4. Verificar Redis
  console.log('\n4️⃣ Verificando Redis...');
  const redisRunning = await checkRedis();
  if (redisRunning) {
    console.log('✅ Redis está activo en puerto 6379');
    results.redis = true;
  } else {
    console.error('❌ Redis no responde en puerto 6379');
  }

  // 5. Verificar Backend NestJS
  console.log('\n5️⃣ Verificando Backend NestJS...');
  try {
    const response = await axios.get('http://localhost:3000/api/v1/auth/me').catch(e => e);
    if (response.status === 401 || response.response?.status === 401) {
      console.log('✅ Backend NestJS activo en puerto 3000');
      console.log('   Endpoint de auth respondiendo correctamente');
      results.backend = true;
    }
  } catch (error) {
    console.error('❌ Backend NestJS no responde en puerto 3000');
    console.error('   Ejecuta: npm run start:dev');
  }

  // Resumen
  console.log('\n📊 RESUMEN DE VERIFICACIÓN:');
  console.log('────────────────────────────');
  console.log(`Evolution API:        ${results.evolutionApi ? '✅' : '❌'}`);
  console.log(`PostgreSQL Backend:   ${results.backendDb ? '✅' : '❌'}`);
  console.log(`PostgreSQL Evolution: ${results.evolutionDb ? '✅' : '❌'}`);
  console.log(`Redis:               ${results.redis ? '✅' : '❌'}`);
  console.log(`Backend NestJS:      ${results.backend ? '✅' : '❌'}`);

  const allOk = Object.values(results).every(v => v);
  
  if (allOk) {
    console.log('\n🎉 ¡Todo está funcionando correctamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Crea una instancia de WhatsApp desde tu aplicación');
    console.log('2. Escanea el código QR');
    console.log('3. Configura el webhook con: npx ts-node setup-webhook.ts <instance-name>');
  } else {
    console.log('\n⚠️  Hay servicios que no están funcionando.');
    console.log('\n📝 Pasos para solucionarlo:');
    
    if (!results.evolutionApi || !results.evolutionDb || !results.redis) {
      console.log('\n1. En la carpeta de Evolution API:');
      console.log('   cd E:\\clonevolutionapi\\evolution-api');
      console.log('   docker compose up -d');
    }
    
    if (!results.backendDb) {
      console.log('\n2. En tu proyecto backend:');
      console.log('   cd whatsapp-saas-backend');
      console.log('   docker compose -f docker-compose.dev.yml up -d');
    }
    
    if (!results.backend) {
      console.log('\n3. Iniciar el backend NestJS:');
      console.log('   cd whatsapp-saas-backend');
      console.log('   npm run start:dev');
    }
  }
}

// Ejecutar verificación
verifySetup().catch(console.error);