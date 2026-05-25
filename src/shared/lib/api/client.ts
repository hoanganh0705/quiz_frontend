import axios from 'axios'
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  setRefreshToken
} from '@/features/auth/utils/auth-cookies'

console.log('CLIENT FILE EXECUTED')
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const AUTH_PATHS = new Set(['/auth/login', '/auth/register', '/auth/refresh-token'])

type ApiEnvelope<T> = {
  data: T
  meta?: unknown
}

export const apiClient = axios.create({
  baseURL: `${apiUrl}/api/v1`,
  withCredentials: true,
  adapter: 'xhr'
})
console.log('apiUrl', apiUrl)
console.log('apiClient', apiClient)

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.request.use((config) => {
  console.log('CONFIG BASE URL:', config.baseURL)
  console.log('CONFIG URL:', config.url)
  console.log('FULL URL:', `${config.baseURL}${config.url}`)

  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiEnvelope<unknown> | unknown

    if (
      payload &&
      typeof payload === 'object' &&
      'data' in payload
    ) {
      response.data = (payload as ApiEnvelope<unknown>).data
    }

    return response
  },
  async (error) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean
    }

    const requestPath = originalRequest?.url

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    if (requestPath && AUTH_PATHS.has(requestPath)) {
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
      const refreshResponse = await apiClient.post('/auth/refresh-token')
      const accessToken = refreshResponse.data?.token?.accessToken
      const refreshTokenValue = refreshResponse.data?.token?.refreshToken

      if (!accessToken) {
        throw new Error('Refresh token response missing access token')
      }

      setAuthToken(accessToken)
      if (refreshTokenValue) setRefreshToken(refreshTokenValue)
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
