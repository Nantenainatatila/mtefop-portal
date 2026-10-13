const ApiError = require('../utils/ApiError');

// Usage : authorize(ROLES.ADMIN, ROLES.RH)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Authentification requise'));
  if (!roles.includes(req.user.role)) return next(new ApiError(403, "Vous n'avez pas les droits pour cette action"));
  next();
};

module.exports = authorize;
