const express = require("express");
const router = express.Router();
const supabaseAdmin = require("../config/supabaseAdmin");

// PUT /usuarios/:userId/perfil
router.put("/:userId/perfil", async (req, res) => {
  const { userId } = req.params;
  const { perfil } = req.body;

  if (!perfil) {
    return res.status(400).json({ error: "Perfil obrigatório" });
  }

  const { data, error } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { perfil }
    });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    success: true,
    user: data.user
  });
});

module.exports = router;
