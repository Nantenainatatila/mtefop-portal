const jwt = require("jsonwebtoken");

const authMiddleware = (req , res , next) => {
    try {
        const authorization = req.headers.authorization;
        if (!authorization) {
            return res.status(401).json({
                message: "JWT Manquant"
            });
        }
        const parts = authorization.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                message: "Format du token invalide"
            });
        }

        const token = parts[1];
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Erreur authorization", error.message);
        res.status(401).json({
            message: "token invalide ou expiré"
        });
    }
};
module.exports = authMiddleware;