module.exports = function roleMiddleware(...roles) {
  return (req, res, next) => {
    const perfil = req.user?.user_metadata?.perfil;

    if (!perfil) {
      return res.status(403).json({ erro: "Perfil não encontrado" });
    }

    if (!roles.includes(perfil)) {
      return res.status(403).json({ erro: "Acesso negado" });
    }

    next();
  };
};
