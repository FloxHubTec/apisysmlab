// ================================
// IMPORTS
// ================================
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Middlewares
const authMiddleware = require('./middleware/Auth');
const roleMiddleware = require('./middleware/RoleMiddleware');
const roleFromTable = require("./middleware/RoleFromTable");

// Rotas já existentes
const parametroRoutes = require('./routes/ParametroRoutes');
const resultadoAnaliseRoutes = require('./routes/ResultadoAnaliseRoutes');
const graficoParametroRoutes = require('./routes/GraficoParametroRoutes');
const alertasRoutes = require('./routes/AlertaRoutes');
const dashboardWebRoutes = require('./routes/DashboardWebRoutes');
const amostraRoutes = require('./routes/AmostraRoutes');
const usuariosRoutes = require("./routes/UsuarioRoutes");
const gerenciamentoParametrosRoutes = require('./routes/GerenciamentoParametrosRoutes');

// NOVAS ROTAS
const legislacaoRoutes = require('./routes/LegislacaoRoutes');
const matrizRoutes = require('./routes/MatrizRoutes');

dotenv.config();

const app = express();

// ================================
// CONFIGURAÇÃO CORS CORRETA
// ================================
const allowedOrigins = [
  'https://frontendsysmlab.vercel.app',  // SEU FRONTEND
  'http://localhost:4200',                // ANGULAR DEV
  'http://localhost:3000',                // API DEV
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requests sem origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 Origem bloqueada por CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // ← IMPORTANTE: Permite cookies/tokens
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Authorization'],  // ← Permite frontend acessar o header Authorization
  maxAge: 86400  // Cache por 24 horas
};

// Aplica CORS
app.use(cors(corsOptions));

// Handle preflight requests explicitamente
app.options('*', cors(corsOptions));

// Log de requests para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  console.log('Authorization:', req.headers.authorization ? 'Presente' : 'Ausente');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// ================================
app.get('/', (req, res) => {
  res.json({
    message: "API Online!",
    version: "1.0.0",
    cors: "Configurado",
    allowedOrigins: allowedOrigins
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: 'Configurado',
    allowedOrigins: allowedOrigins
  });
});

// ================================
// ROTAS PROTEGIDAS PELO SUPABASE
// ================================
app.use('/parametros', authMiddleware, parametroRoutes);
app.use('/matrizes', authMiddleware, matrizRoutes);
app.use('/legislacoes', authMiddleware, legislacaoRoutes);
app.use('/dashboardtv', authMiddleware, parametroRoutes);
app.use('/resultados-analise', authMiddleware, resultadoAnaliseRoutes);
app.use('/grafico-parametros', authMiddleware, graficoParametroRoutes);
app.use('/dashboard-web', authMiddleware, dashboardWebRoutes);
app.use('/amostras', authMiddleware, amostraRoutes);

app.use(
  "/usuarios",
  authMiddleware,
  roleFromTable("Gestor"),
  usuariosRoutes
);

app.use(
  '/gerenciamento-parametros',
  authMiddleware,
  gerenciamentoParametrosRoutes
);

app.use('/alertas', authMiddleware, roleFromTable("Gestor"), alertasRoutes);

// ================================
// MIDDLEWARE DE ERRO PARA CORS
// ================================
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Acesso não permitido',
      message: 'Origem não autorizada por CORS',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  next(err);
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    path: req.originalUrl,
    method: req.method
  });
});

// ================================
// EXPORTAÇÃO PARA VERCEL
// ================================
module.exports = app;

// Iniciar servidor apenas se NÃO estivermos na Vercel
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log("===================================");
    console.log("🚀 Servidor iniciado na porta", PORT);
    console.log("🌐 CORS configurado para:");
    allowedOrigins.forEach(origin => console.log("   -", origin));
    console.log("===================================");
  });
}