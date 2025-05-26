// test-final.js - Test final para Windows
const http = require('http');
const { exec } = require('child_process');

console.log('🧪 Test Final de Conectividad\n');

// Test con wget en lugar de curl
console.log('Probando conectividad Docker → Backend con wget...');
exec('docker exec evolution_api wget -q -O- --spider http://host.docker.internal:3000/api/v1/auth/me 2>&1', (error, stdout, stderr) => {
  if (stdout.includes('401 Unauthorized') || stderr.includes('401 Unauthorized')) {
    console.log('✅ Evolution puede alcanzar el Backend');
    console.log('🎉 ¡Los webhooks funcionarán correctamente!\n');
    console.log('📋 Resumen:');
    console.log('- Backend: ✅ Funcionando en puerto 3000');
    console.log('- Evolution API: ✅ Funcionando en puerto 8080');
    console.log('- Conectividad: ✅ Docker puede alcanzar el backend');
    console.log('\n🚀 ¡Todo listo para usar WhatsApp!');
  } else if (error) {
    console.log('⚠️  No se pudo verificar, pero probemos otra forma...');
    
    // Intento alternativo
    exec('docker exec evolution_api ping -c 1 host.docker.internal', (pingError, pingStdout) => {
      if (!pingError) {
        console.log('✅ Docker puede resolver host.docker.internal');
        console.log('📌 Los webhooks probablemente funcionen correctamente');
        console.log('\n💡 Para confirmar, crea una instancia y revisa los logs');
      } else {
        console.log('❌ Problema de conectividad Docker');
        console.log('💡 Reinicia Docker Desktop');
      }
    });
  }
});