import axios from "axios";

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

axiosInstance.interceptors.request.use(config => {
  const token = sessionStorage.getItem("userToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
