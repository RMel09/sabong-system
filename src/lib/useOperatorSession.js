import { useState, useEffect } from 'react';

const SESSION_KEY = 'sabong_operator_session';

export function useOperatorSession() {
  const [operator, setOperator] = useState(() => {
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const login = (op) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(op));
    setOperator(op);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setOperator(null);
  };

  return { operator, login, logout, isLoggedIn: !!operator };
}