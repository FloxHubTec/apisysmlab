// config/database.js - VERSÃO DEBUG VERCEL
const { Pool } = require('pg');

console.log('🚀 Inicializando database...');

// 1. Pega a string de conexão
let connectionString = process.env.DATABASE_URL;

// LOG DE DEBUG (Sem mostrar a senha real)
if (!connectionString) {
  console.error('❌ ERRO CRÍTICO: Variável DATABASE_URL não encontrada!');
} else {
  // Mascara a senha para mostrar no log
  const masked = connectionString.replace(/:[^:@]+@/, ':***@');
  console.log(`🔌 Tentando conectar em: ${masked}`);
}

// 2. Configuração SSL (Obrigatória para Supabase na Vercel)
const sslConfig = { rejectUnauthorized: false };

let pool;

try {
  if (!connectionString) {
    throw new Error('DATABASE_URL is undefined');
  }

  pool = new Pool({
    connectionString: connectionString,
    ssl: sslConfig,
    connectionTimeoutMillis: 5000, // Timeout mais curto para falhar logo se travar
    max: 1 // Serverless precisa de poucas conexões por lambda
  });

  // Teste silencioso de conexão (não bloqueia o deploy, mas loga erro)
  pool.connect().then(client => {
    console.log('✅ Conexão com o Banco estabelecida com sucesso!');
    client.release();
  }).catch(err => {
    console.error('🔥 ERRO DE CONEXÃO INICIAL:', err.message);
  });

} catch (error) {
  console.error('💀 FALHA NA CRIAÇÃO DO POOL:', error.message);
  
  // Cria um Pool "Morto" que loga o motivo do erro sempre que tentam usar
  pool = {
    query: async () => {
      console.error('🛑 Tentativa de query com banco desconectado.');
      throw new Error(`Banco não conectado. Motivo original: ${error.message}`);
    },
    connect: async () => { throw new Error('Banco desconectado'); }
  };
}

// Wrapper para logs de Query (Mantém o seu log bonito)
const originalQuery = pool.query;
pool.query = function(text, params, callback) {
  return originalQuery.call(this, text, params, callback);
};

module.exports = pool;