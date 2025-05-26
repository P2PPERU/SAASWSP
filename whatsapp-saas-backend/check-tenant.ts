// check-tenant.ts
import { DataSource } from 'typeorm';

async function checkTenant() {
  const db = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'whatsapp_saas',
  });
  
  await db.initialize();
  
  const result = await db.query(`
    SELECT 
      w."instanceKey", 
      w."tenantId", 
      t.name as tenant_name,
      ai.enabled as ai_enabled
    FROM whatsapp_instances w
    JOIN tenants t ON t.id = w."tenantId"
    LEFT JOIN ai_profiles ai ON ai."tenantId" = w."tenantId"
    WHERE w."instanceKey" = 'alexandrgm'
  `);
  
  console.log('Instancia alexandrgm pertenece a:');
  console.log('- Tenant ID:', result[0].tenantId);
  console.log('- Tenant Name:', result[0].tenant_name);
  console.log('- IA Habilitada:', result[0].ai_enabled ? 'Sí' : 'No');
  
  await db.destroy();
}

checkTenant();