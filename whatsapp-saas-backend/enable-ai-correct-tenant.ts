// enable-ai-correct-tenant.ts
import { DataSource } from 'typeorm';

async function enableAIForCorrectTenant() {
  const db = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'whatsapp_saas',
  });
  
  await db.initialize();
  
  const tenantId = 'd30cdb80-6e06-4db7-857e-6a5cfd1df440'; // Test Company1
  
  console.log('🤖 Activando IA para Test Company1...\n');
  
  // Insertar o actualizar el perfil de IA
  await db.query(`
    INSERT INTO ai_profiles (
      "tenantId", 
      enabled, 
      "systemPrompt", 
      "welcomeMessage",
      personality,
      "responseMode",
      settings,
      limits,
      usage
    )
    VALUES ($1, true, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT ("tenantId") 
    DO UPDATE SET 
      enabled = true,
      "systemPrompt" = $2,
      "welcomeMessage" = $3,
      personality = $4,
      "responseMode" = $5,
      settings = $6,
      "updatedAt" = NOW()
  `, [
    tenantId,
    `Eres un asistente virtual de Test Company1. 
Eres amigable, profesional y muy útil. 
Responde en español de manera clara y concisa.
Si te preguntan sobre productos o servicios, di que estás aquí para ayudar y pregunta en qué están interesados.
Siempre termina tus respuestas preguntando si hay algo más en lo que puedas ayudar.`,
    '¡Hola! 👋 Soy el asistente virtual de Test Company1. ¿En qué puedo ayudarte hoy?',
    'friendly',
    'always',
    JSON.stringify({
      temperature: 0.7,
      maxTokens: 150,
      responseDelay: 1500,
      contextWindow: 5,
      language: 'es',
      tone: 'friendly',
    }),
    JSON.stringify({
      maxTokensPerDay: 10000,
      maxTokensPerMonth: 100000,
      maxConversationsPerDay: 100,
    }),
    JSON.stringify({
      tokensToday: 0,
      tokensThisMonth: 0,
      conversationsToday: 0,
      lastResetDate: new Date().toISOString(),
    })
  ]);
  
  console.log('✅ IA activada exitosamente para Test Company1');
  
  // Verificar que se activó correctamente
  const verification = await db.query(`
    SELECT 
      ai.*,
      t.name as tenant_name
    FROM ai_profiles ai
    JOIN tenants t ON t.id = ai."tenantId"
    WHERE ai."tenantId" = $1
  `, [tenantId]);
  
  if (verification.length > 0) {
    const profile = verification[0];
    console.log('\n📊 Configuración actual:');
    console.log(`   Tenant: ${profile.tenant_name}`);
    console.log(`   IA Habilitada: ${profile.enabled ? 'Sí' : 'No'}`);
    console.log(`   Modelo: ${profile.model}`);
    console.log(`   Personalidad: ${profile.personality}`);
    console.log(`   Modo: ${profile.responseMode}`);
    console.log(`   Límites diarios: ${profile.limits.maxTokensPerDay} tokens`);
  }
  
  await db.destroy();
  
  console.log('\n🎉 ¡Todo listo!');
  console.log('\n📱 Ahora envía un mensaje a tu WhatsApp (+51 991 351 213)');
  console.log('   La IA responderá automáticamente');
  console.log('\n💡 Mensajes de prueba:');
  console.log('   - "Hola"');
  console.log('   - "¿Qué servicios tienen?"');
  console.log('   - "Necesito información"');
}

enableAIForCorrectTenant().catch(console.error);