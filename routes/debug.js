const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  return res.json({
    headers: req.headers,
    authorization: req.headers.authorization || null,
  });
});

module.exports = router;
