

import axios from 'axios';
import { DataSource } from 'typeorm';

async function importExistingInstance() {
  console.log('📥 Importando instancia existente al backend...\n');

  const API_URL = 'http://localhost:3000/api/v1';
  
  try {
    // 1. Login o registro
    console.log('1️⃣ Haciendo login...');
    let tokens;
    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@test.com',
        password: '123456'
      });
      tokens = loginResponse.data.data;
      console.log('✅ Login exitoso');
    } catch (error) {
      console.log('Registrando nuevo usuario...');
      const registerResponse = await axios.post(`${API_URL}/auth/register`, {
        email: 'admin@test.com',
        password: '123456',
        name: 'Admin',
        organizationName: 'Mi Empresa'
      });
      tokens = registerResponse.data.data;
      console.log('✅ Usuario registrado');
    }

    // 2. Conectar directamente a la base de datos para importar
    const dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'postgres',
      password: 'postgres',
      database: 'whatsapp_saas',
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    console.log('\n2️⃣ Conectado a la base de datos');

    // 3. Obtener el tenant del usuario
    const authHeaders = { Authorization: `Bearer ${tokens.accessToken}` };
    const meResponse = await axios.get(`${API_URL}/auth/me`, { headers: authHeaders });
    const tenantId = meResponse.data.data.tenantId;
    console.log(`✅ Tenant ID: ${tenantId}`);

    // 4. Insertar la instancia existente
    console.log('\n3️⃣ Importando instancia "alexandrgm"...');
    
    const result = await dataSource.query(`
      INSERT INTO whatsapp_instances (
        id,
        name,
        "instanceKey",
        "phoneNumber",
        status,
        "tenantId",
        settings,
        "createdAt",
        "updatedAt",
        "lastConnectionAt"
      ) VALUES (
        gen_random_uuid(), -- Generar nuevo UUID
        $1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW(), NOW()
      )
      ON CONFLICT ("instanceKey") DO UPDATE SET
        status = $4,
        "phoneNumber" = $3,
        "lastConnectionAt" = NOW(),
        "updatedAt" = NOW()
      RETURNING id
    `, [
      'alexandrgm',     // Nombre
      'alexandrgm',     // Instance Key
      '51991351213',    // Número
      'connected',      // Estado
      tenantId,         // Tu tenant ID
      JSON.stringify({  // Settings
        evolutionInstanceId: '93369b5a-8052-44dd-9b8a-da24acd03e86',
        imported: true,
        importedAt: new Date().toISOString()
      })
    ]);

    console.log('✅ Instancia importada exitosamente');
    console.log(`   ID: ${result[0].id}`);

    await dataSource.destroy();

    // 5. Verificar que aparece en el listado
    console.log('\n4️⃣ Verificando importación...');
    const instancesResponse = await axios.get(`${API_URL}/whatsapp/instances`, { headers: authHeaders });
    console.log(`✅ Total de instancias en tu backend: ${instancesResponse.data.total}`);
    
    const importedInstance = instancesResponse.data.data.find((i: any) => i.instanceKey === 'alexandrgm');
    if (importedInstance) {
      console.log('\n🎉 ¡Instancia importada correctamente!');
      console.log('Detalles:', JSON.stringify(importedInstance, null, 2));
      
      console.log('\n📝 Próximos pasos:');
      console.log('1. Configura el webhook:');
      console.log(`   npx ts-node setup-webhook.ts alexandrgm`);
      console.log('\n2. Envía un mensaje de prueba:');
      console.log(`   POST ${API_URL}/whatsapp/instances/${importedInstance.id}/messages/send`);
      console.log('   Body: { "to": "51999999999", "text": "Hola desde mi API!" }');
      
      console.log('\n3. Para ver el estado de conexión:');
      console.log(`   GET ${API_URL}/whatsapp/instances/${importedInstance.id}/connection-status`);
      
      console.log('\n💡 Información útil:');
      console.log(`   - Instance ID: ${importedInstance.id}`);
      console.log(`   - Access Token: ${tokens.accessToken}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Asegúrate de que:');
      console.error('   1. Tu backend esté corriendo (npm run start:dev)');
      console.error('   2. PostgreSQL esté en el puerto 5433');
    }
  }
}

// Ejecutar importación
console.log('Backend URL: http://localhost:3000/api/v1');
console.log('Base de datos: PostgreSQL en puerto 5433\n');
importExistingInstance();