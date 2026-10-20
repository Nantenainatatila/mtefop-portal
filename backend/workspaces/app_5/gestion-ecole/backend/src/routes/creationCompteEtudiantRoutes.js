const express = require("express");
const router = express.Router();

const { creerCompteEtudiant } = require("../controllers/compteEtudiantControler");


router.post("/", creerCompteEtudiant);
module.exports = router;