import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { clearAuth, loadAuth, saveAuth } from '../services/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadAuth());

  const signIn = useCallback(async (credentials) => {
    const session = await authService.login(credentials);
    saveAuth(session);
    setAuth(session);
  }, []);

  const signOut = useCallback(() => {
    clearAuth();
    setAuth(null);
  }, []);

  // http.js fires this event whenever the API answers 401.
  useEffect(() => {
    window.addEventListener('softagri:unauthorized', signOut);
    return () => window.removeEventListener('softagri:unauthorized', signOut);
  }, [signOut]);

  const value = useMemo(
    () => ({ user: auth?.user ?? null, isAuthenticated: Boolean(auth?.access), signIn, signOut }),
    [auth, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
