const express = require("express");

const router = express.Router();



const  { 
    recupererApp, 
    recupererDeploiement,
    deleteDeploie
 }  = require("../controllers/deploiementControljer");

router.get("/:id/:idAdmin", recupererApp);
router.get("/:id", recupererDeploiement);
router.delete("/:id", deleteDeploie);

module.exports = router;