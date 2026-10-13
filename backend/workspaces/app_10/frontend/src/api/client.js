import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) onUnauthorized?.();
    return Promise.reject(err);
  }
);

// Message d'erreur lisible (inclut les erreurs de validation du backend)
export const errMsg = (err) => {
  const d = err.response?.data;
  if (d?.errors?.length) return d.errors.map((e) => e.message).join(' · ');
  return d?.message || err.message || 'Une erreur est survenue';
};

export default api;
