const express = require("express");
const cors = require("cors");
const pool = require("./config/database");


const app = express();

app.use(cors());
app.use(express.json());
//routes
const mentionRoutes = require("./routes/mentionRoutes");
const niveauRoutes = require("./routes/niveauRoutes");
const annee_scolaireRoutes = require("./routes/annee_scolaireRoutes");
const etudiantRoutes = require("./routes/etudiantRoutes");
const avant_inscriptionRoutes = require("./routes/avant_inscriptionRoutes");
const creerCompteEtudiant = require("./routes/creationCompteEtudiantRoutes");
const loginRoutes = require("./routes/loginRoutes");






app.use("/api/mentions", mentionRoutes);
app.use("/api/niveaux", niveauRoutes);
app.use("/api/annees_scolaires", annee_scolaireRoutes);
app.use("/api/etudiants", etudiantRoutes);
app.use("/api/avants_inscriptions", avant_inscriptionRoutes);
app.use("/api/comptes_etudiants", creerCompteEtudiant);
app.use("/api/login", loginRoutes);



app.get("/", (req, res) => {
    res.json({
        message: "API gestion ecole fonctionne"
    });
});
const port = 3000;

app.listen(port, () => {
    console.log(`Serveur demarré sur http://localhost:${port}`);
});