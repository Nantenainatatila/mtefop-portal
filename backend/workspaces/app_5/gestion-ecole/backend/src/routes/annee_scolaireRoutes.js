const express = require("express");
const router = express.Router();
//securisation
const authMiddleware = require("../middware/authMiddleware");


const { getAnneeScolaire } = require("../controllers/annee_scolaireController");


router.get("/", authMiddleware, getAnneeScolaire);

module.exports = router;