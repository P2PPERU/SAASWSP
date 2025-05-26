// disable-ai.ts
import { DataSource } from 'typeorm';

async function toggleAI(enable: boolean = false) {
  const db = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'whatsapp_saas',
  });
  
  await db.initialize();
  
  const action = enable ? 'Activando' : 'Desactivando';
  console.log(`🤖 ${action} IA...\n`);
  
  // Actualizar TODOS los perfiles de IA
  await db.query(`
    UPDATE ai_profiles 
    SET enabled = $1, 
        "updatedAt" = NOW()
  `, [enable]);
  
  // Mostrar estado actual
  const profiles = await db.query(`
    SELECT 
      ai."tenantId",
      t.name as tenant_name,
      ai.enabled
    FROM ai_profiles ai
    JOIN tenants t ON t.id = ai."tenantId"
  `);
  
  console.log('📊 Estado actual de IA:\n');
  for (const profile of profiles) {
    console.log(`${profile.tenant_name}: ${profile.enabled ? '✅ Activada' : '❌ Desactivada'}`);
  }
  
  await db.destroy();
  
  console.log(`\n✅ IA ${enable ? 'activada' : 'desactivada'} exitosamente`);
}

// Verificar argumento
const action = process.argv[2];

if (action === 'on' || action === 'enable') {
  toggleAI(true);
} else if (action === 'off' || action === 'disable') {
  toggleAI(false);
} else {
  console.log('Uso:');
  console.log('  npx ts-node disable-ai.ts off    # Desactivar IA');
  console.log('  npx ts-node disable-ai.ts on     # Activar IA');
}