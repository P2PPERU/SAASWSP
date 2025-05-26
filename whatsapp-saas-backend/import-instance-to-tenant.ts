// import-instance-to-tenant.ts
import axios from 'axios';
import { DataSource } from 'typeorm';

const API_URL = 'http://localhost:3000/api/v1';

async function importInstanceToCurrentTenant() {
  console.log('📥 Importando instancia existente al tenant actual...\n');

  try {
    // 1. Login para obtener el tenant ID
    console.log('1️⃣ Haciendo login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test1@example.com', // Cambia si usaste otro email
      password: 'Test123' // Cambia si usaste otra contraseña
    });
    
    const tokens = loginResponse.data.data;
    console.log('✅ Login exitoso');

    // 2. Obtener información del usuario actual
    const authHeaders = { Authorization: `Bearer ${tokens.accessToken}` };
    const meResponse = await axios.get(`${API_URL}/auth/me`, { headers: authHeaders });
    const tenantId = meResponse.data.data.tenantId;
    const tenantName = meResponse.data.data.tenant.name;
    
    console.log(`\n✅ Tenant actual:`);
    console.log(`   ID: ${tenantId}`);
    console.log(`   Nombre: ${tenantName}`);

    // 3. Verificar instancias actuales
    console.log('\n2️⃣ Verificando instancias actuales...');
    const instancesResponse = await axios.get(`${API_URL}/whatsapp/instances`, { headers: authHeaders });
    console.log(`   Instancias actuales: ${instancesResponse.data.total}`);

    // 4. Conectar a la base de datos y actualizar
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
    console.log('\n3️⃣ Conectado a la base de datos');

    // 5. Buscar la instancia alexandrgm
    const existingInstance = await dataSource.query(`
      SELECT id, name, "instanceKey", "phoneNumber", status, "tenantId" 
      FROM whatsapp_instances 
      WHERE "instanceKey" = 'alexandrgm' 
      AND "deletedAt" IS NULL
    `);

    if (existingInstance.length > 0) {
      const instance = existingInstance[0];
      console.log('\n4️⃣ Instancia encontrada:');
      console.log(`   ID: ${instance.id}`);
      console.log(`   Nombre: ${instance.name}`);
      console.log(`   Tenant actual: ${instance.tenantId}`);
      
      if (instance.tenantId === tenantId) {
        console.log('\n✅ La instancia ya pertenece a tu tenant!');
        console.log(`   Instance ID para usar en tests: ${instance.id}`);
      } else {
        console.log('\n5️⃣ Actualizando tenant de la instancia...');
        
        // Actualizar el tenant de la instancia
        await dataSource.query(`
          UPDATE whatsapp_instances 
          SET "tenantId" = $1, "updatedAt" = NOW() 
          WHERE id = $2
        `, [tenantId, instance.id]);
        
        console.log('✅ Instancia actualizada correctamente!');
        console.log(`\n🎉 La instancia ahora pertenece a tu tenant: ${tenantName}`);
        console.log(`   Instance ID para usar en tests: ${instance.id}`);
      }

      await dataSource.destroy();

      // 6. Verificar que ahora aparece en el listado
      console.log('\n6️⃣ Verificando importación...');
      const updatedInstances = await axios.get(`${API_URL}/whatsapp/instances`, { headers: authHeaders });
      console.log(`✅ Total de instancias en tu tenant: ${updatedInstances.data.total}`);
      
      const importedInstance = updatedInstances.data.data.find((i: any) => i.instanceKey === 'alexandrgm');
      if (importedInstance) {
        console.log('\n🎉 ¡Instancia importada correctamente!');
        console.log('\n📝 Actualiza test-new-features.ts con:');
        console.log(`   const INSTANCE_ID = '${importedInstance.id}';`);
        console.log(`   const TOKEN = '${tokens.accessToken}';`);
        
        // Intentar enviar un mensaje de prueba
        console.log('\n7️⃣ Enviando mensaje de prueba...');
        try {
          const testMessage = await axios.post(
            `${API_URL}/whatsapp/instances/${importedInstance.id}/messages/send`,
            {
              to: '51991351213',
              text: '✅ Instancia importada correctamente! Mensaje de prueba.'
            },
            { headers: authHeaders }
          );
          console.log('✅ Mensaje de prueba enviado!');
        } catch (msgError: any) {
          console.log('⚠️  No se pudo enviar mensaje de prueba:', msgError.response?.data?.message);
        }
      }
    } else {
      console.log('\n❌ No se encontró la instancia alexandrgm');
      console.log('Puedes crear una nueva instancia con el API');
      
      await dataSource.destroy();
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response.data);
    }
    console.log('\n💡 Asegúrate de:');
    console.log('   1. Haber creado un usuario con el script anterior');
    console.log('   2. Usar las credenciales correctas');
    console.log('   3. Que la base de datos esté accesible');
  }
}

// Ejecutar
console.log('🔧 Script de importación de instancia');
console.log('=====================================\n');
importInstanceToCurrentTenant();