// middlewares/authMiddleware.js
require("dotenv").config();
const supabase = require("../config/supabaseAdmin");
const jwt = require("jsonwebtoken");

module.exports = async function authMiddleware(req, res, next) {
  try {

    console.log("HEADER RECEBIDO:", req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token ausente" });
    }

    const token = authHeader.replace("Bearer ", "");

    console.log("TOKEN RECEBIDO NO BACKEND:", token);

    const { data, error } = await supabase.auth.getUser(token);

    if (!data?.user) {

      const decoded = jwt.decode(token);

      console.log("\n━━━━━━━━━━━━ TOKEN DEBUG ━━━━━━━━━━━━");
      console.log("Token:", token);
      console.log("exp:", decoded?.exp);
      console.log("iss:", decoded?.iss);
      console.log("Backend URL:", process.env.SUPABASE_URL);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return res.status(401).json({
        error: "Token inválido ou expirado",
        hint: "Verifique se o token pertence ao mesmo projeto Supabase",
        decoded,
      });
    }

    req.user = data.user;
    next();

  } catch (e) {
    console.error("ERRO NO AUTH:", e);
    res.status(500).json({ error: "Erro interno no auth" });
  }
};
