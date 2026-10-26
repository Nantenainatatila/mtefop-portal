const express = require("express");
const authMiddleware = require("../middleware/authMiddleware") ;
const superAdminMiddleware = require("../middleware/superMiddleware");
const router = express.Router();

const  { 
    recupererDeploiementSuccess,
    recupererDeploiementFailed
 }  = require("../controllers/deploiementControljer");

router.get("/success", recupererDeploiementSuccess);
router.get("/failed", recupererDeploiementFailed);

module.exports = router;