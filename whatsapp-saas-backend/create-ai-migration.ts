// create-ai-migration.ts
import { DataSource } from 'typeorm';

async function createAITables() {
  console.log('🔄 Creando tablas de IA...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'whatsapp_saas',
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Conectado a la base de datos\n');

    // Crear tabla ai_profiles
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS ai_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        enabled BOOLEAN DEFAULT true,
        model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
        personality VARCHAR(50) DEFAULT 'friendly',
        "responseMode" VARCHAR(50) DEFAULT 'always',
        "systemPrompt" TEXT,
        "welcomeMessage" TEXT,
        "businessHours" JSONB DEFAULT '{}',
        keywords JSONB DEFAULT '[]',
        settings JSONB DEFAULT '{}',
        limits JSONB DEFAULT '{}',
        usage JSONB DEFAULT '{}',
        "autoLearn" BOOLEAN DEFAULT true,
        "blockedPhrases" JSONB DEFAULT '[]',
        "customResponses" JSONB DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" TIMESTAMP,
        UNIQUE("tenantId")
      );
    `);

    console.log('✅ Tabla ai_profiles creada');

    // Crear índices
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_profiles_tenant_id ON ai_profiles("tenantId");
      CREATE INDEX IF NOT EXISTS idx_ai_profiles_enabled ON ai_profiles(enabled);
    `);

    console.log('✅ Índices creados');

    // Insertar perfil de IA para el tenant existente (opcional)
    const tenants = await dataSource.query(`SELECT id, name FROM tenants LIMIT 1`);
    
    if (tenants.length > 0) {
      const tenant = tenants[0];
      console.log(`\n📝 Creando perfil de IA para tenant: ${tenant.name}`);
      
      await dataSource.query(`
        INSERT INTO ai_profiles ("tenantId", enabled, "systemPrompt", "welcomeMessage", settings, limits, usage)
        VALUES ($1, false, $2, $3, $4, $5, $6)
        ON CONFLICT ("tenantId") DO NOTHING
      `, [
        tenant.id,
        'Eres un asistente virtual profesional y amigable. Responde de forma clara y concisa.',
        '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
        JSON.stringify({
          temperature: 0.7,
          maxTokens: 150,
          responseDelay: 1000,
          contextWindow: 5,
          language: 'es',
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
        }),
      ]);

      console.log('✅ Perfil de IA creado (deshabilitado por defecto)');
    }

    await dataSource.destroy();

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Reinicia tu servidor: npm run start:dev');
    console.log('2. Configura tu API Key de OpenAI en el archivo .env');
    console.log('3. Activa la IA para tu tenant desde la API');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  La tabla ya existe');
    }
  }
}

// Ejecutar
createAITables();