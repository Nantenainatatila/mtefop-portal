const express = require("express");
const router = express.Router();

const { getMentions } = require("../controllers/mentionController");
const authMiddleware = require("../middware/authMiddleware");

router.get("/",authMiddleware, getMentions);

module.exports = router;