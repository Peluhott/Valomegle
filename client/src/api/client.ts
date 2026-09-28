import axios from 'axios';

const apiClient = axios.create({
    baseURL: window.__APP_CONFIG__?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '',
    withCredentials: true,
});

export default apiClient;
