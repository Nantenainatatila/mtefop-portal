const express = require("express");

const router = express.Router();



const  { recupererApp, recupererDeploiement }  = require("../controllers/deploiementControljer");

router.get("/:id/:idAdmin", recupererApp);
router.get("/:id", recupererDeploiement);

module.exports = router;