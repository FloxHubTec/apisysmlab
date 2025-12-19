// config/database.js - VERSÃO SUPABASE CORRIGIDA
const { Pool } = require('pg');

console.log('🚀 Inicializando módulo database...');

// ============================================
// 1. FUNÇÃO PARA CRIAR CONNECTION STRING
// ============================================
function getConnectionString() {
  // TENTA DATABASE_URL PRIMEIRO
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 10) {
    let connStr = process.env.DATABASE_URL.trim();
    
    // Garante protocolo correto
    if (!connStr.startsWith('postgresql://') && !connStr.startsWith('postgres://')) {
      connStr = 'postgresql://' + connStr;
    }
    
    // REMOVIDO: Não forçamos mais sslmode=require na string aqui.
    // Deixamos o objeto de configuração (passo 2) cuidar disso.
    // Isso evita conflitos de parser.
    
    return connStr;
  }
  
  // TENTA VARIÁVEIS INDIVIDUAIS
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    const cleanPassword = String(process.env.DB_PASSWORD).replace(/^"|"$/g, '');
    const encodedPassword = encodeURIComponent(cleanPassword);
    const port = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'postgres';
    
    return `postgresql://${process.env.DB_USER}:${encodedPassword}@${process.env.DB_HOST}:${port}/${dbName}`;
  }
  
  return null;
}

// ============================================
// 2. LÓGICA DE SSL INTELIGENTE
// ============================================
function getSSLConfig(connectionString) {
  // Se não tem string, não tem SSL
  if (!connectionString) return false;

  // Verifica se é localhost/desenvolvimento local
  const isLocalHost = connectionString.includes('@localhost') || 
                      connectionString.includes('@127.0.0.1');

  // Se for local (Docker/Postgres local), geralmente NÃO usa SSL
  if (isLocalHost) {
    console.log('💻 Banco detectado como LOCAL (SSL Desativado)');
    return false;
  }

  // Se for remoto (Supabase, AWS, etc), USA SSL permissivo
  console.log('☁️  Banco detectado como REMOTO (SSL Ativado - rejectUnauthorized: false)');
  return {
    rejectUnauthorized: false // <--- O SEGREDO PARA O SUPABASE
  };
}

// ============================================
// 3. CRIA POOL OU MOCK
// ============================================
let pool;

try {
  const connectionString = getConnectionString();
  
  if (!connectionString) {
    console.log('⚠️  Nenhuma configuração encontrada. Usando MOCK.');
    pool = {
      query: () => Promise.resolve({ rows: [], rowCount: 0 }),
      connect: () => Promise.resolve({ release: () => {} }),
      end: () => Promise.resolve()
    };
  } else {
    console.log('🔗 Connection String (mascarada):', 
      connectionString.replace(/:[^:@]+@/, ':***@'));
    
    const sslConfig = getSSLConfig(connectionString);

    pool = new Pool({
      connectionString: connectionString,
      ssl: sslConfig, // Configuração injetada aqui
      connectionTimeoutMillis: 10000, // 10s timeout
      idleTimeoutMillis: 30000,
      max: 10 // Aumentado um pouco para lidar com conexões concorrentes
    });
    
    // TESTE DE CONEXÃO
    pool.connect()
      .then(client => {
        return client.query('SELECT NOW() as time, current_database() as db, version()')
          .then(res => {
            client.release();
            console.log('🎉 BANCO CONECTADO COM SUCESSO!');
            console.log(`   DB: ${res.rows[0].db}`);
            console.log(`   Versão: ${res.rows[0].version}`);
          })
          .catch(err => {
            client.release();
            console.error('💥 ERRO NO TESTE DE QUERY:', err.message);
          });
      })
      .catch(err => {
        console.error('💥 ERRO FATAL DE CONEXÃO:', {
          message: err.message,
          code: err.code,
          sslInfo: sslConfig
        });
      });
  }
} catch (error) {
  console.error('💀 ERRO CRÍTICO ao inicializar:', error.message);
  pool = { query: () => Promise.reject(new Error('DB Failed')) };
}

// ============================================
// 4. MIDDLEWARE DE LOG (Mantido igual)
// ============================================
const originalQuery = pool.query;
pool.query = function(text, params, callback) {
  const start = Date.now();
  // Se query for string simples
  const queryText = typeof text === 'string' ? text : text.text;
  
  return originalQuery.call(this, text, params, callback)
    .then(res => {
      // Opcional: Log apenas se demorar mais que 500ms para não poluir
      const duration = Date.now() - start;
      if (duration > 500) { 
         console.log(`⚠️ Query lenta (${duration}ms): ${queryText.substring(0, 50)}...`);
      }
      return res;
    })
    .catch(err => {
      console.error(`❌ Erro na Query: ${err.message}`, { query: queryText });
      throw err;
    });
};

module.exports = pool;