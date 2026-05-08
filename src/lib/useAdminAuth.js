import { useState, useEffect } from 'react';

const SESSION_KEY = 'sabong_admin_auth';

export function useAdminAuth() {
  const [isAuthed, setIsAuthed] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  });

  const login = (password, correctPassword) => {
    if (password === correctPassword) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthed(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthed(false);
  };

  return { isAuthed, login, logout };
}