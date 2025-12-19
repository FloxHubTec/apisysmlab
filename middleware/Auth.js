// middlewares/authMiddleware.js
require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports = async function authMiddleware(req, res, next) {
  try {
    console.log("🔒 Iniciando Auth Middleware...");

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token ausente ou mal formatado" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // O SEGREDO: Usar a chave JWT para validar matematicamente o token
    // sem precisar perguntar ao servidor do Supabase.
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (!jwtSecret) {
      console.error("❌ ERRO CRÍTICO: SUPABASE_JWT_SECRET não definido no .env");
      return res.status(500).json({ error: "Erro de configuração no servidor" });
    }

    // jwt.verify lança um erro automaticamente se o token for inválido ou expirado
    const decoded = jwt.verify(token, jwtSecret);

    // Se chegou aqui, o token é autêntico.
    // O objeto 'decoded' contém: { sub: 'uuid-user', email: '...', role: 'authenticated', ... }
    
    // Normaliza o req.user para ter o ID acessível
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      ...decoded
    };

    console.log(`✅ Usuário Autenticado: ${req.user.email} (${req.user.id})`);
    next();

  } catch (e) {
    console.error("⛔ Falha na validação do token:", e.message);
    
    // Diferencia erro de expiração de outros erros
    if (e.name === 'TokenExpiredError') {
        return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }
    
    return res.status(401).json({ 
        error: "Token inválido",
        details: e.message 
    });
  }
};