const STORAGE_KEY = 'guzao-auth'
const SESSION_KEY = 'guzao-auth-session'

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

export function setAuth(payload, options = {}) {
  const remember = options.remember !== false
  const storage = remember ? localStorage : sessionStorage
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  storage.setItem(remember ? STORAGE_KEY : SESSION_KEY, JSON.stringify({ ...payload, remember }))
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export function authHeaders() {
  const auth = getAuth()
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}
}
