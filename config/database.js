// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

// Testar a conexão
pool.on('connect', () => {
    console.log('Conectado ao PostgreSQL no Supabase');
});

pool.on('error', (err) => {
    console.error('Erro na conexão PostgreSQL:', err);
});

module.exports = pool;