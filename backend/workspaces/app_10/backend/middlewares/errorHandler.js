const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => next(new ApiError(404, `Route introuvable : ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Erreur interne du serveur';
  let errors = err.errors || null;

  // Erreurs PostgreSQL (et MySQL) courantes
  if (err.code === '23505' || err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Cette valeur existe déjà (doublon)';
  } else if ((err.code === '23503' && !/still referenced/i.test(err.detail || '')) || err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400;
    message = 'Référence invalide : un élément lié est introuvable';
  } else if (err.code === '23503' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409;
    message = 'Suppression impossible : cet élément est utilisé ailleurs';
  } else if (err.code === '23514' || err.code === '22P02' || err.code === '22007') {
    status = 400;
    message = 'Valeur invalide pour un champ';
  } else if (err.code === 'P0001') {
    status = 400; // RAISE EXCEPTION dans un trigger
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON invalide';
  }

  if (status >= 500) {
    console.error(err);
    if (env.nodeEnv === 'production') message = 'Erreur interne du serveur';
  }

  res.status(status).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(env.nodeEnv !== 'production' && status >= 500 && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
