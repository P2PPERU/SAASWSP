// test-db.ts (crear en la raíz del proyecto)
import { Client } from 'pg';

async function testConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'whatsapp_saas',
  });

  try {
    console.log('Intentando conectar...');
    await client.connect();
    console.log('✅ Conexión exitosa!');
    
    const result = await client.query('SELECT NOW()');
    console.log('Hora del servidor:', result.rows[0].now);
    
    await client.end();
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
}

testConnection();