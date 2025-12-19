// config/database.js - VERSÃO SANITIZADA (TRIM)
const { Pool } = require('pg');

console.log('🚀 Inicializando database...');

// ==========================================
// 1. OBTENÇÃO E LIMPEZA DA STRING
// ==========================================
let connectionString = process.env.DATABASE_URL;

// SE não tiver DATABASE_URL, tenta montar (fallback)
if (!connectionString && process.env.DB_HOST) {
  console.log('⚠️ DATABASE_URL não encontrada, montando via variáveis individuais...');
  const user = process.env.DB_USER;
  // Codifica a senha para evitar erro com caracteres especiais
  const pass = encodeURIComponent(process.env.DB_PASSWORD || '');
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || 5432;
  const db = process.env.DB_NAME || 'postgres';
  
  connectionString = `postgresql://${user}:${pass}@${host}:${port}/${db}?sslmode=require`;
}

if (!connectionString) {
  console.error('❌ ERRO CRÍTICO: Nenhuma configuração de banco encontrada!');
} else {
  // --- A LIMPEZA CRUCIAL (TRIM) ---
  // Remove espaços vazios no inicio/fim e quebras de linha (\n)
  connectionString = connectionString.trim().replace(/(\r\n|\n|\r)/gm, "");
  
  // Limpa parâmetros conflitantes de SSL da string para usar o objeto abaixo
  if (connectionString.includes('sslmode=')) {
    connectionString = connectionString
      .replace(/sslmode=require/g, '')
      .replace(/sslmode=no-verify/g, '')
      .replace(/\?&/, '?')
      .replace(/&&/, '&')
      .replace(/\?$/, '');
  }

  // Debug seguro
  const masked = connectionString.replace(/:[^:@]+@/, ':***@');
  console.log(`🔌 Conectando em: ${masked}`);
}

// ==========================================
// 2. CONFIGURAÇÃO SSL
// ==========================================
const sslConfig = { 
  rejectUnauthorized: false 
};

let pool;

try {
  if (!connectionString) throw new Error('String de conexão vazia');

  pool = new Pool({
    connectionString: connectionString,
    ssl: sslConfig,
    connectionTimeoutMillis: 5000,
    max: 2 
  });

  // Teste de conexão não-bloqueante
  pool.connect().then(client => {
    console.log('✅ Banco conectado!');
    client.release();
  }).catch(err => {
    console.error('🔥 Erro ao conectar:', err.code, err.message);
  });

} catch (error) {
  console.error('💀 Erro ao criar Pool:', error.message);
  pool = { query: async () => { throw new Error('DB Disconnected'); } };
}

module.exports = pool;