import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agentToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('agentToken')
      window.location.href = '/agent/login'
    }
    return Promise.reject(err)
  }
)

export default api
