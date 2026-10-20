const express = require ("express");
const router = express.Router();
const { 
    ajouterApplication, 
    getApplication,
    deleteApp,
    getAppId,
    modifierApp
} = require("../controllers/applicationController");
const authMiddleware = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

router.post(
    "/", 
    authMiddleware,
    upload.fields([
        {
            name: "fichier_app",
            maxCount: 1
        },
        {
            name: "icone_app",
            maxCount: 1
        }
    ]), 
    ajouterApplication
);
//get app
router.get("/", getApplication);
// deleteApp
router.delete("/:id", deleteApp);
// get APP id
router.get("/:id", getAppId);
//modification d'app
router.put(
    "/:id",
    authMiddleware,
    upload.fields([
        {
            name: "fichier_app",
            maxCount: 1
        },
        {
            name: "icone_app",
            maxCount: 1
        }
    ]),
    modifierApp
);

module.exports = router;