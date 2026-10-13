import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me')
      .then((r) => setUser(r.data.data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (loginName, mot_de_passe) => {
    const { data } = await api.post('/auth/login', { login: loginName, mot_de_passe });
    localStorage.setItem('token', data.data.token);
    const me = await api.get('/auth/me');
    setUser(me.data.data);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, hasRole: (...roles) => !!user && roles.includes(user.role) }),
    [user, loading, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
