import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  try {
    const user = JSON.parse(localStorage.getItem("pawcareUser"));
    if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  } catch {
    // ignore a corrupted value
  }
  return config;
});

export default api;