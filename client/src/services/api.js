import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:4000/api' : '/api',
  headers: { 'Content-Type': 'application/json' },
});

const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

const register = (data) => api.post('/auth/register', data);
const login = (data) => api.post('/auth/login', data);
const getCaptcha = () => api.get('/captcha');
const postJob = (data) => api.post('/jobs', data);
const listJobs = (params) => api.get('/jobs', { params });
const deleteJob = (id) => api.delete(`/jobs/${id}`);
const updateJob = (id, data) => api.put(`/jobs/${id}`, data);
const sendVerification = () => api.post('/auth/send-verification');
const verifyEmail = (token) => api.post('/auth/verify-email', { token });

export { setAuthToken, register, login, getCaptcha, postJob, listJobs, deleteJob, updateJob, sendVerification, verifyEmail };
