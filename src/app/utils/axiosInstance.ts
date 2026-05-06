import axios from "axios";
import { getApiBaseUrl } from "@/lib/env";

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
