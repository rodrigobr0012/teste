import React, { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const email = localStorage.getItem("bm_user_email");
    return email ? { email } : null;
  });

  function login({ email, token }) {
    localStorage.setItem("bm_token", token);
    localStorage.setItem("bm_user_email", email);
    setUser({ email });
  }

  function logout() {
    localStorage.removeItem("bm_token");
    localStorage.removeItem("bm_user_email");
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
