const pool = require("../config/database");

module.exports = (...rolesPermitidos) => {
  return async (req, res, next) => {
    const userId = req.user.id; // UUID do Supabase Auth

    const { rows } = await pool.query(
      "SELECT perfil FROM usuario WHERE id = $1",
      [userId]
    );

    if (!rows.length) {
      return res.status(403).json({ error: "Usuário não cadastrado" });
    }

    const perfil = rows[0].perfil;

    if (!rolesPermitidos.includes(perfil)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    next();
  };
};
