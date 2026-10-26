require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const docker = require("./config/docker");

const http = require("http");
const { Server } = require("socket.io");

const authRoute = require("./routes/authRoute");
const registerRoute = require("./routes/registerRoutse");
const adminRoute = require("./routes/adminRoute") ;
const applicationRoute = require("./routes/applicationRoute");
const deploiementRoute = require("./routes/deploiementRoute");
const success_failedRoute = require("./routes/success_failedRoute");
const personnelRoute = require("./routes/personnelRoute");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});
app.set("io", io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

//Routes 
app.use("/api/auth", authRoute);
app.use("/api/register", registerRoute);
app.use("/api/administrations", adminRoute);
app.use("/api/applications", applicationRoute);
app.use("/api/deploiements", deploiementRoute);
app.use("/api/success_failed", success_failedRoute);
app.use("/api/personnels", personnelRoute);


//tester la connexion docker
docker.ping()
    .then(() => {
        console.log("Connexion à Docker reussit");
    })
    .catch((error) => {
        console.error("Erreur de connexion à docker:", error.message);
    });
//rendre le dossier uploads accessible depuis le navigateur

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "../uploads")
    )
);


const PORT = process.env.PORT || 5000;
server.listen(
    PORT,
    "0.0.0.0",
    () => {
    console.log(`SERVEUR DEMARÉ SUR LE PORT ${PORT}`);
});
