const express = require("express");
const router = express.Router();
//securié
const authMiddleware = require("../middware/authMiddleware");
const roleMiddleware = require("../middware/roleMiddleware");

const { 
    createAvantInscription, 
    getAvantInscription, 
    getAvantInscriptionId,
    validerAvantInscription,
    refuseeAvantInscription
} = require("../controllers/avantInscriptionController");

router.post("/",authMiddleware, createAvantInscription);
router.get("/",authMiddleware, getAvantInscription);
router.get("/:id",authMiddleware, getAvantInscriptionId);
router.put("/:id/valider",authMiddleware,roleMiddleware(2), validerAvantInscription);
router.put("/:id/refuser",authMiddleware,roleMiddleware(2), refuseeAvantInscription);

module.exports = router;