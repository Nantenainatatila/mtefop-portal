const superAdminMiddleware = (req , res , next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Utilisateur non authentifié"
        });
    }
    if (req.user.role_admin !== "super_admin") {
        return res.status(403).json({
            message: "Acces reservé au super administrateur."
        });
    }

    next();
}

module.exports = superAdminMiddleware;