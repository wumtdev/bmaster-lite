import axios from 'axios';
import { z } from 'zod';

const apiErrorSchema = z.object({
	detail: z.string()
});

type ApiError = z.infer<typeof apiErrorSchema>;

export const ORIGIN = 'localhost:8000'
export const BASE_URL = `http://${ORIGIN}`

const api = axios.create({
	baseURL: `${BASE_URL}/api` // Replace with your backend base URL
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem('bmaster.auth.token');
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		const res = error.response;
		if (res) {
      try {
        const error = apiErrorSchema.parse(res.data)
        if (error.detail === 'bmaster.auth.invalid_token') {
          localStorage.removeItem('bmaster.auth.token');
          window.location.href = '/';
        }
      } catch {}
		}
		return Promise.reject(error);
	}
);

export default api;
