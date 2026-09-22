require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoute = require("./routes/authRoute");
const registerRoute = require("./routes/registerRoutse");
const adminRoute = require("./routes/adminRoute") ;
const applicationRoute = require("./routes/applicationRoute");

const app = express();

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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`SERVEUR DEMARÉ SUR LE PORT ${PORT}`);
});
