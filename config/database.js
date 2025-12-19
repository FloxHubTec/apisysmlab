// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 =========== DIAGNÓSTICO DE CONEXÃO ===========');
console.log('🔍 DB_HOST:', process.env.DB_HOST);
console.log('🔍 Comprimento DB_HOST:', process.env.DB_HOST?.length);
console.log('🔍 DB_HOST correto?', process.env.DB_HOST === 'db.exxufmvzgnbjmaexzmuz.supabase.co' ? '✅' : '❌');

// URL encode da senha para diagnóstico
const rawPassword = process.env.DB_PASSWORD;
const cleanPassword = rawPassword ? rawPassword.replace(/^"|"$/g, '') : '';
const encodedPassword = encodeURIComponent(cleanPassword);

console.log('🔍 Senha bruta:', rawPassword ? '*** (presente)' : '❌ (ausente)');
console.log('🔍 Senha limpa:', cleanPassword ? '***' : '❌');
console.log('🔍 Senha codificada:', encodedPassword ? '***' : '❌');

const connectionString = `postgresql://${process.env.DB_USER}:${encodedPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;

console.log('🔗 String de conexão (mascarada):');
console.log(`   postgresql://${process.env.DB_USER}:***@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false, require: true },
  connectionTimeoutMillis: 15000
});

// Teste de DNS
const dns = require('dns');
dns.lookup(process.env.DB_HOST, (err, address, family) => {
  if (err) {
    console.error('❌ ERRO DE DNS:', {
      host: process.env.DB_HOST,
      message: err.message,
      code: err.code
    });
  } else {
    console.log('✅ DNS resolvido:', {
      host: process.env.DB_HOST,
      ip: address,
      family: family
    });
  }
});

module.exports = pool;