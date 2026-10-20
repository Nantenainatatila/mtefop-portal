
// Toutes les communications avec le backend passent par ce fichier.
// Exemple : api.get('/cars') -> GET /api/cars

const TOKEN_KEY = 'token';

// En production, utiliser l'URL publique du backend.
// En développement, une URL vide permet d'utiliser le proxy Vite.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

async function request(method, url, body) {
  const headers = {};
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let contenu;

  if (body instanceof FormData) {
    // Le navigateur définit automatiquement le Content-Type
    // et la boundary pour les formulaires contenant des images.
    contenu = body;
  } else if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    contenu = JSON.stringify(body);
  }

  const chemin = `${API_BASE_URL}/api${url}`;

  const reponse = await fetch(chemin, {
    method,
    headers,
    ...(contenu !== undefined ? { body: contenu } : {}),
  });

  const data = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    throw new Error(data.message || 'Une erreur est survenue');
  }

  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};

