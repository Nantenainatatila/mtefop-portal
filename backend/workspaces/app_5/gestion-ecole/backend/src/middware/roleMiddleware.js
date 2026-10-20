const roleMiddleware = (...rolesAutorises) => {
    return (req ,res , next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Utilisateur non authentifi"
            });
        }
        if (!rolesAutorises.includes(req.user.id_role)) {
            return res.status(403).json({
                message: "Acces interdit"
            });
        }
        next();
    };
}

module.exports = roleMiddleware;