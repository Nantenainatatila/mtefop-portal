const express = require("express");
const { 
    getAdmin, 
    accepterAdmin, 
    refuserAdmin,
    deleteADmin,
    getCategorie
} = require("../controllers/adminControllers");

const authMiddleware = require("../middleware/authMiddleware") ;
const superAdminMiddleware = require("../middleware/superMiddleware");

const router = express.Router();

router.get("/", authMiddleware, superAdminMiddleware, getAdmin);
router.put("/:id/accepter", authMiddleware, superAdminMiddleware, accepterAdmin);
router.put("/:id/refuser", authMiddleware, superAdminMiddleware, refuserAdmin);
router.delete("/:id", authMiddleware, superAdminMiddleware, deleteADmin);
router.get("/categories", getCategorie);

module.exports = router;