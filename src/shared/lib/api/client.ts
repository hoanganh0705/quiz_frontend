import axios from 'axios'
import { clearAuthToken, getAuthToken, setAuthToken } from '@/features/auth/utils/auth-cookies'

export const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

const refreshClient = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean
    }
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      clearAuthToken()
      if (typeof window !== 'undefined') {
        window.location.assign('/login')
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const refreshResponse = await refreshClient.post('/auth/refresh-token')
      const accessToken = refreshResponse.data?.token?.accessToken

      if (!accessToken) {
        throw new Error('Refresh token response missing access token')
      }

      setAuthToken(accessToken)
      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${accessToken}`

      return apiClient(originalRequest)
    } catch (refreshError) {
      clearAuthToken()
      if (typeof window !== 'undefined') {
        window.location.assign('/login')
      }
      return Promise.reject(refreshError)
    }
  }
)
