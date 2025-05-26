// test-ai-feature.ts
import axios from 'axios';
import { DataSource } from 'typeorm';

const API_URL = 'http://localhost:3000/api/v1';

async function enableAI() {
  console.log('🤖 Configurando y probando IA...\n');

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

  try {
    await dataSource.initialize();

    // 1. Obtener el primer tenant
    const tenants = await dataSource.query(`
      SELECT t.id, t.name, t.plan, ai.enabled as ai_enabled
      FROM tenants t
      LEFT JOIN ai_profiles ai ON ai."tenantId" = t.id
      LIMIT 1
    `);

    if (tenants.length === 0) {
      console.log('❌ No hay tenants en la base de datos');
      return;
    }

    const tenant = tenants[0];
    console.log(`📋 Tenant encontrado:`);
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Nombre: ${tenant.name}`);
    console.log(`   Plan: ${tenant.plan}`);
    console.log(`   IA habilitada: ${tenant.ai_enabled ? 'Sí' : 'No'}\n`);

    // 2. Habilitar IA para el tenant
    console.log('2️⃣ Habilitando IA...');
    
    await dataSource.query(`
      UPDATE ai_profiles 
      SET 
        enabled = true,
        "systemPrompt" = $1,
        settings = $2,
        "responseMode" = 'always'
      WHERE "tenantId" = $3
    `, [
      `Eres un asistente virtual de ${tenant.name}. 
Eres amigable, profesional y muy útil. 
Responde en español de manera clara y concisa.
Si te preguntan sobre productos o servicios, di que estás aquí para ayudar y pregunta en qué están interesados.
Siempre termina tus respuestas preguntando si hay algo más en lo que puedas ayudar.`,
      JSON.stringify({
        temperature: 0.7,
        maxTokens: 150,
        responseDelay: 2000, // 2 segundos de delay para parecer más humano
        contextWindow: 5,
        language: 'es',
        tone: 'friendly',
      }),
      tenant.id
    ]);

    console.log('✅ IA habilitada exitosamente');

    // 3. Verificar configuración
    const aiProfile = await dataSource.query(`
      SELECT * FROM ai_profiles WHERE "tenantId" = $1
    `, [tenant.id]);

    if (aiProfile.length > 0) {
      console.log('\n📊 Configuración de IA:');
      console.log(`   Modelo: ${aiProfile[0].model}`);
      console.log(`   Personalidad: ${aiProfile[0].personality}`);
      console.log(`   Modo de respuesta: ${aiProfile[0].responseMode}`);
      console.log(`   Límites diarios: ${aiProfile[0].limits.maxTokensPerDay} tokens`);
      console.log(`   Límites mensuales: ${aiProfile[0].limits.maxTokensPerMonth} tokens`);
    }

    // 4. Obtener estadísticas
    console.log('\n📈 Estadísticas actuales:');
    const stats = await dataSource.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(m.id) as total_messages,
        COUNT(CASE WHEN m."aiContext"->>'generatedByAI' = 'true' THEN 1 END) as ai_messages
      FROM conversations c
      LEFT JOIN messages m ON m."conversationId" = c.id
      WHERE c."instanceId" IN (
        SELECT id FROM whatsapp_instances WHERE "tenantId" = $1
      )
    `, [tenant.id]);

    console.log(`   Conversaciones totales: ${stats[0].total_conversations}`);
    console.log(`   Mensajes totales: ${stats[0].total_messages}`);
    console.log(`   Mensajes generados por IA: ${stats[0].ai_messages}`);

    await dataSource.destroy();

    console.log('\n🎉 ¡IA configurada y lista para usar!');
    console.log('\n📝 Prueba la IA:');
    console.log('1. Envía un mensaje a tu WhatsApp');
    console.log('2. La IA responderá automáticamente');
    console.log('3. Revisa los logs del servidor para ver el proceso');
    
    console.log('\n💡 Mensajes de prueba sugeridos:');
    console.log('- "Hola"');
    console.log('- "¿Qué servicios ofrecen?"');
    console.log('- "Necesito ayuda"');
    console.log('- "¿Cuáles son sus horarios?"');
    console.log('- "Quiero más información"');

    console.log('\n⚙️  Configuración avanzada:');
    console.log('- Para cambiar el prompt: Modifica systemPrompt en la BD');
    console.log('- Para ajustar la creatividad: Cambia temperature (0-1)');
    console.log('- Para respuestas más largas: Aumenta maxTokens');
    console.log('- Para cambiar modo: responseMode = "business_hours", "keywords", etc.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Script para verificar el estado de la IA
async function checkAIStatus() {
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

  try {
    await dataSource.initialize();

    const profiles = await dataSource.query(`
      SELECT 
        ai.*,
        t.name as tenant_name,
        t.plan
      FROM ai_profiles ai
      JOIN tenants t ON t.id = ai."tenantId"
    `);

    console.log('\n🤖 Estado de IA por Tenant:\n');
    
    for (const profile of profiles) {
      console.log(`📋 ${profile.tenant_name} (${profile.plan})`);
      console.log(`   IA: ${profile.enabled ? '✅ Activada' : '❌ Desactivada'}`);
      console.log(`   Modo: ${profile.responseMode}`);
      console.log(`   Tokens hoy: ${profile.usage.tokensToday || 0}`);
      console.log(`   Tokens este mes: ${profile.usage.tokensThisMonth || 0}`);
      console.log('');
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Ejecutar según argumento
const action = process.argv[2] || 'enable';

if (action === 'status') {
  checkAIStatus();
} else {
  enableAI();
}

// Uso:
// npx ts-node test-ai-feature.ts        # Habilitar IA
// npx ts-node test-ai-feature.ts status # Ver estado