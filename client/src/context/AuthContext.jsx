import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

const loadUser = () => {
  try {
    return JSON.parse(localStorage.getItem("pawcareUser"));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  const saveUser = (data) => {
    localStorage.setItem("pawcareUser", JSON.stringify(data));
    setUser(data);
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveUser(data);
  };

  const register = async (form) => {
    const { data } = await api.post("/auth/register", form);
    saveUser(data);
  };

  const logout = () => {
    localStorage.removeItem("pawcareUser");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);