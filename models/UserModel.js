const pool = require("../config/database");
const bcrypt = require("bcrypt");

module.exports = {
  async criarUsuario(
    id,
    nome,
    email,
    senhaHash,
    perfil = "usuario",
    telefone = null
  ) {
    const result = await pool.query(
      `INSERT INTO usuario (id, nome, email, senha_hash, perfil, telefone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, nome, email, perfil, telefone`,
      [id, nome, email, senhaHash, perfil, telefone]
    );

    return result.rows[0];
  },
  async buscarPorEmail(email) {
    const result = await pool.query("SELECT * FROM usuario WHERE email = $1", [
      email,
    ]);
    return result.rows[0];
  },

  async atualizarUltimoAcesso(id) {
    await pool.query("UPDATE usuario SET ultimo_acesso = now() WHERE id = $1", [
      id,
    ]);
  },
};
