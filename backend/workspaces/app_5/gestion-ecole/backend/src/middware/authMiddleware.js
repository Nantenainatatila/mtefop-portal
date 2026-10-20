const jwt = require("jsonwebtoken");

const authMiddleware = async (req , res , next) => {
    try {
        const authHeader = req.headers.authorization;

        if(!authHeader) {
            return res.status(401).json({
                message: "Token manquante"
            });
        }
        // verifier le format 
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                message: "Format du token invalide"
            });
        }

        const token = parts[1];
        //verifier le token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // mettre les information du token dens req.user
        req.user = decoded;
        //continuer vers le controller
        next();
    } catch (error) {
        console.error("Erreur authentification dans middleware", error);
        res.status(401).json({
            message: "Token invalide ou expire"
        });
    }
}
module.exports = authMiddleware;