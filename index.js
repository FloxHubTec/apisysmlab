// index.js - VERSÃO COM CORS PARA DEPLOYMENT
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

// CORS PARA PRODUÇÃO
const corsOptions = {
  origin: [
    'https://frontendsysmlab.vercel.app',
    'http://localhost:4200'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Authorization'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // IMPORTANTE para preflight

app.use(express.json());

// LOG DE REQUESTS
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  console.log('  Origin:', req.headers.origin);
  console.log('  Auth:', req.headers.authorization ? 'Presente' : 'Não');
  next();
});

// ROTA PÚBLICA DE HEALTH
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    cors: 'Configurado',
    allowedOrigins: corsOptions.origin,
    environment: process.env.NODE_ENV || 'development'
  });
});

// MIDDLEWARE DE AUTENTICAÇÃO (teste sem auth primeiro)
const authMiddleware = (req, res, next) => {
  console.log('Auth middleware executado');
  // Temporariamente permite todas as requests
  next();
  
  /*
  // Descomente depois que CORS funcionar
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token ausente" });
    }
    const token = authHeader.replace("Bearer ", "");
    // ... sua lógica de auth
    next();
  } catch (error) {
    res.status(401).json({ error: "Não autorizado" });
  }
  */
};

// ROTA DE TESTE COM AUTH
app.get('/test-auth', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Autenticação funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Suas rotas reais (comente temporariamente para testar CORS)
/*
const authMiddleware = require('./middleware/Auth');
const parametroRoutes = require('./routes/ParametroRoutes');
const dashboardWebRoutes = require('./routes/DashboardWebRoutes');

app.use('/parametros', authMiddleware, parametroRoutes);
app.use('/dashboard-web', authMiddleware, dashboardWebRoutes);
*/

// ROTA DE TESTE SEM AUTH
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API funcionando sem autenticação!',
    cors: 'OK',
    timestamp: new Date().toISOString()
  });
});

// 404 HANDLER
app.use('*', (req, res) => {
  res.status(404).json({
    error: "Endpoint não encontrado",
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = app;