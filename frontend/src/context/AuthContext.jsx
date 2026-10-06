import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campusride_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('campusride_token'));
  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem('campusride_permissions');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const saveAuthData = (tokenData, userData, permissionsData) => {
    setToken(tokenData.access_token);
    setUser(userData);
    setPermissions(permissionsData || []);

    localStorage.setItem('campusride_token', tokenData.access_token);
    localStorage.setItem('campusride_refresh_token', tokenData.refresh_token);
    localStorage.setItem('campusride_user', JSON.stringify(userData));
    localStorage.setItem('campusride_permissions', JSON.stringify(permissionsData || []));
  };

  const clearAuthData = () => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    localStorage.removeItem('campusride_token');
    localStorage.removeItem('campusride_refresh_token');
    localStorage.removeItem('campusride_user');
    localStorage.removeItem('campusride_permissions');
  };

  // Verify active session on load
  const verifySession = useCallback(async () => {
    const savedToken = localStorage.getItem('campusride_token');
    const refreshToken = localStorage.getItem('campusride_refresh_token');

    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
      setPermissions(res.permissions || []);
      localStorage.setItem('campusride_user', JSON.stringify(res.user));
      localStorage.setItem('campusride_permissions', JSON.stringify(res.permissions || []));
    } catch (err) {
      // Try refresh token if access token expired
      if (refreshToken) {
        try {
          const refreshRes = await api.post('/auth/refresh', { refresh_token: refreshToken });
          saveAuthData(refreshRes, refreshRes.user, refreshRes.permissions);
        } catch (refreshErr) {
          clearAuthData();
        }
      } else {
        clearAuthData();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = async (usernameOrEmail, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', {
        username_or_email: usernameOrEmail,
        password: password,
      });

      saveAuthData(res, res.user, res.permissions);
      return { success: true, user: res.user };
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      clearAuthData();
    }
  };

  const hasRole = (roles) => {
    if (!user || !user.role) return false;
    if (typeof roles === 'string') return user.role === roles;
    if (Array.isArray(roles)) return roles.includes(user.role);
    return false;
  };

  const hasPermission = (permission) => {
    if (!permissions || permissions.length === 0) return false;
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        isLoading,
        error,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
