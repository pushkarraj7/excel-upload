import axios from "axios";

/**
 * Axios instance
 */
const apiClient = axios.create({
  baseURL: "http://localhost:8060/api", // ✅ set this
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * REQUEST INTERCEPTOR
 * (Auth token, logging, etc.)
 */
apiClient.interceptors.request.use(
  (config) => {
    // Example: attach token later
    // const token = localStorage.getItem("token");
    // if (token) config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE INTERCEPTOR
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", {
      message: error.message,           // e.g. "Network Error"
      code: error.code,                 // e.g. "ERR_NETWORK"
      response: error?.response,
      config: error?.config?.url,       // which URL failed
    });
    return Promise.reject(error);
}
);

export default apiClient;
