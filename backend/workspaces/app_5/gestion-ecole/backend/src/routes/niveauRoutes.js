const express = require("express");
const router = express.Router();

const { getNiveaux } = require("../controllers/niveauController");
const authMiddleware = require("../middware/authMiddleware");

router.get("/",authMiddleware, getNiveaux);

module.exports = router;