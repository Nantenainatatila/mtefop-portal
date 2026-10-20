const express = require("express");
const router = express.Router();

const { getEtudiant, getEtudiantById, createEtudiant, updateEtudiant, deleteEtudiant } = require("../controllers/etudiantController");
const authMiddleware = require("../middware/authMiddleware");
const roleMiddleware = require("../middware/roleMiddleware");

router.get("/",authMiddleware, getEtudiant);
router.get("/:id",authMiddleware, getEtudiantById);
router.post("/",authMiddleware,roleMiddleware(2), createEtudiant);
router.put("/:id",authMiddleware,roleMiddleware(2), updateEtudiant);
router.delete("/:id",authMiddleware,roleMiddleware(2), deleteEtudiant);

module.exports = router ;roleMiddleware(2)