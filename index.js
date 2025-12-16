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
app.use(express.json());
app.use(cors());

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
  roleFromTable("Gestor"), // 🔐 vem da tabela
  usuariosRoutes
);

app.use(
  '/gerenciamento-parametros',
  authMiddleware,
  gerenciamentoParametrosRoutes
);

app.use('/alertas', authMiddleware, roleFromTable("Gestor"), alertasRoutes);


// 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    path: req.originalUrl
  });
});

// A Vercel precisa desta exportação
module.exports = app;

// Iniciar servidor apenas se NÃO estivermos na Vercel (desenvolvimento local)
if (require.main === module) {
  app.listen(3000, () => console.log("Servidor iniciado na porta 3000"));
}
