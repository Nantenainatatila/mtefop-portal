// Garde en mémoire l'utilisateur connecté et le partage à toute l'application.
// Dans un composant : const { user, login, logout } = useAuth();
import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true tant qu'on vérifie le token

  // Au démarrage : si un token existe, on récupère le profil
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(setUser)
      .catch(() => setToken(null)) // token expiré ou invalide
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  // formData contient name, email, password et (facultatif) avatar
  async function register(formData) {
    const data = await api.post('/auth/register', formData);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
