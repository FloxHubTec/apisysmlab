// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Log das variáveis de ambiente (sensíveis mascaradas)
console.log('🔧 =========== DATABASE CONFIG DEBUG ===========');
console.log('🔧 DB_HOST:', process.env.DB_HOST);
console.log('🔧 DB_PORT:', process.env.DB_PORT);
console.log('🔧 DB_USER:', process.env.DB_USER);
console.log('🔧 DB_NAME:', process.env.DB_NAME);
console.log('🔧 DB_PASSWORD:', process.env.DB_PASSWORD ? '*** (presente)' : '❌ (ausente)');
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 =============================================');

// Validação das variáveis obrigatórias
const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ VARIÁVEIS DE AMBIENTE AUSENTES:', missingVars);
  console.error('❌ Verifique as Environment Variables no Vercel');
}

// URL encode da senha (importante para caracteres especiais como #)
const encodedPassword = encodeURIComponent(process.env.DB_PASSWORD || '');
const connectionString = `postgresql://${process.env.DB_USER}:${encodedPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

console.log('🔗 Connection String (senha mascarada):');
console.log(`   postgresql://${process.env.DB_USER}:***@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

// Configuração do pool com opções otimizadas
const poolConfig = {
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  // Timeouts para evitar conexões pendentes
  connectionTimeoutMillis: 10000, // 10 segundos
  idleTimeoutMillis: 30000, // 30 segundos
  max: 20, // máximo de conexões no pool
  allowExitOnIdle: true
};

console.log('⚙️  Pool config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  ssl: 'ativo',
  connectionTimeout: '10s',
  idleTimeout: '30s',
  maxConnections: 20
});

const pool = new Pool(poolConfig);

// Eventos do pool com logs detalhados
pool.on('connect', (client) => {
  console.log('✅ Nova conexão estabelecida com PostgreSQL');
});

pool.on('acquire', (client) => {
  console.log('📥 Cliente adquirido do pool');
});

pool.on('remove', (client) => {
  console.log('📤 Cliente removido do pool');
});

pool.on('error', (err, client) => {
  console.error('❌ ERRO NO POOL PostgreSQL:', {
    message: err.message,
    code: err.code,
    address: err.address,
    port: err.port,
    stack: err.stack
  });
  
  // Log mais detalhado para diagnosticar ECONNREFUSED
  if (err.code === 'ECONNREFUSED') {
    console.error('🔍 Diagnóstico ECONNREFUSED:');
    console.error('   - Host tentado:', err.address);
    console.error('   - Porta tentada:', err.port);
    console.error('   - Isso geralmente significa:');
    console.error('     1. Host/porta incorretos');
    console.error('     2. Firewall bloqueando');
    console.error('     3. Servidor PostgreSQL não está rodando');
    console.error('   - Host configurado:', process.env.DB_HOST);
    console.error('   - Porta configurada:', process.env.DB_PORT);
  }
});

// Teste de conexão assíncrona imediata
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('🔍 Testando conexão com banco de dados...');
    
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Conexão PostgreSQL bem-sucedida!');
    console.log('   Hora do servidor:', result.rows[0].current_time);
    console.log('   Versão PostgreSQL:', result.rows[0].pg_version.split('\n')[0]);
    
    // Verificar se estamos conectados ao Supabase
    const supabaseCheck = await client.query("SELECT current_database() as db, current_user as user, inet_server_addr() as server");
    console.log('   Banco de dados:', supabaseCheck.rows[0].db);
    console.log('   Usuário:', supabaseCheck.rows[0].user);
    console.log('   Servidor:', supabaseCheck.rows[0].server);
    
    client.release();
    console.log('✅ Cliente liberado para o pool');
  } catch (error) {
    console.error('❌ FALHA NA CONEXÃO COM POSTGRESQL:', {
      message: error.message,
      code: error.code,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT
    });
    
    // Tentativa alternativa sem SSL (apenas para debug)
    console.log('🔄 Tentando diagnóstico adicional...');
    console.log('   Para testar manualmente:');
    console.log(`   psql "postgresql://${process.env.DB_USER}:***@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}"`);
  }
}

// Executar teste após pequeno delay
setTimeout(() => {
  testConnection();
}, 1000);

// Middleware de log para todas as queries (opcional)
const originalQuery = pool.query;
pool.query = function(text, params, callback) {
  const start = Date.now();
  
  console.log('📝 Query executada:', {
    sql: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
    params: params ? '[' + params.length + ' params]' : 'none',
    time: new Date().toISOString()
  });
  
  return originalQuery.call(this, text, params, callback)
    .then(result => {
      const duration = Date.now() - start;
      console.log(`✅ Query completada em ${duration}ms - ${result.rowCount} linhas`);
      return result;
    })
    .catch(err => {
      const duration = Date.now() - start;
      console.error(`❌ Query falhou após ${duration}ms:`, err.message);
      throw err;
    });
};

module.exports = pool;