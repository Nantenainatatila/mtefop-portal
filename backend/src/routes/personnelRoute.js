const express = require("express");
const router = express.Router();

const { 
    recuperAppPersonnel,
    recuperAppPublic
 } = require("../controllers/personnelControllers");

router.get("/personnel", recuperAppPersonnel);
router.get("/public", recuperAppPublic);

module.exports = router;