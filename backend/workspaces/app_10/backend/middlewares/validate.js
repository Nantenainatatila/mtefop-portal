const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// À placer après les règles express-validator d'une route
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ champ: e.path, message: e.msg }));
  next(new ApiError(422, 'Données invalides', errors));
};
