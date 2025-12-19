// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

console.log('🔧 Configurando conexão PostgreSQL...');
console.log('🔧 Ambiente:', process.env.NODE_ENV);

// Constrói connection string
let connectionString;

if (process.env.DATABASE_URL) {
  console.log('📦 Usando DATABASE_URL');
  connectionString = process.env.DATABASE_URL;
} else if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
  console.log('🔧 Construindo connection string');
  const cleanPassword = process.env.DB_PASSWORD.replace(/^"|"$/g, '');
  const encodedPassword = encodeURIComponent(cleanPassword);
  connectionString = `postgresql://${process.env.DB_USER}:${encodedPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
} else {
  throw new Error('❌ Configuração do banco não encontrada');
}

console.log('🔗 Connection string (mascarada):');
if (connectionString.includes('@')) {
  const [userPart, hostPart] = connectionString.split('@');
  const [protocol, credentials] = userPart.split('://');
  const [user] = credentials.split(':');
  console.log(`   ${protocol}://${user}:***@${hostPart}`);
}

// Configuração SSL baseada no ambiente
const isProduction = process.env.NODE_ENV === 'production';
const sslConfig = isProduction 
  ? { 
      rejectUnauthorized: true,
      require: true,
      ca: process.env.DB_SSL_CA // Opcional: adicionar certificado CA
    }
  : {
      rejectUnauthorized: false, // ← DESABILITA VERIFICAÇÃO EM DEV/TESTE
      require: true
    };

console.log('🔐 Configuração SSL:', sslConfig);

const pool = new Pool({
  connectionString: connectionString,
  ssl: sslConfig,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Teste de conexão
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ ERRO NA CONEXÃO:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    
    if (err.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.error('🔍 Diagnóstico SSL:');
      console.error('   O certificado do Supabase é auto-assinado ou não confiável');
      console.error('   Solução: Desabilitar rejectUnauthorized em desenvolvimento');
    }
  } else {
    console.log('✅ Conexão estabelecida!');
    client.query('SELECT NOW() as time, version() as version', (queryErr, result) => {
      release();
      if (queryErr) {
        console.error('❌ Erro na query:', queryErr.message);
      } else {
        console.log('🎉 Banco funcionando!');
        console.log('   Hora:', result.rows[0].time);
        console.log('   PostgreSQL:', result.rows[0].version.split('\n')[0]);
      }
    });
  }
});

module.exports = pool;