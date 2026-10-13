const express = require("express");

const router = express.Router();



const  { recupererApp }  = require("../controllers/deploiementControljer");

router.get("/:id", recupererApp);

module.exports = router;