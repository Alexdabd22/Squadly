import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5176'

const api: AxiosInstance = axios.create({
  baseURL: `${apiUrl}/api`,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem('token')

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('userId')
      window.dispatchEvent(new Event('authChanged'))
    }
    return Promise.reject(error)
  }
)

export default api