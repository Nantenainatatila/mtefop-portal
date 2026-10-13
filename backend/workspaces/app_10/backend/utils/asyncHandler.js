// Express 4 ne capte pas les erreurs des fonctions async : on les relaie à next()
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
