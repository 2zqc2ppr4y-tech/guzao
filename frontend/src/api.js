import { authHeaders, clearAuth } from './auth'

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export const API_BASE_URL = rawApiBaseUrl.trim().replace(/\/$/, '')

const BACKEND_OFFLINE_MESSAGE = '后端服务暂未连接，请先部署云服务器后端'

function ensureBackendConfigured() {
  if (!API_BASE_URL) throw new Error(BACKEND_OFFLINE_MESSAGE)
}

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}

async function fetchBackend(path, options) {
  ensureBackendConfigured()
  try {
    return await fetch(apiUrl(path), options)
  } catch {
    throw new Error(BACKEND_OFFLINE_MESSAGE)
  }
}

async function parseResponse(response, fallback) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) clearAuth()
    throw new Error(payload.error || fallback)
  }
  return payload
}

export async function checkBackend() {
  const response = await fetchBackend('/api/health')
  return parseResponse(response, '后端服务暂时不可用')
}

export async function fetchMe() {
  const response = await fetchBackend('/api/auth/me', { headers: authHeaders() })
  return parseResponse(response, '登录状态已过期')
}

export async function registerUser(payload) {
  const response = await fetchBackend('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return parseResponse(response, '注册失败，请稍后再试')
}

export async function loginUser(payload) {
  const response = await fetchBackend('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return parseResponse(response, '登录失败，请检查账号和密码')
}

export async function logoutUser() {
  await fetchBackend('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => {})
  clearAuth()
}

export async function fetchSpecies() {
  const response = await fetchBackend('/api/species')
  return parseResponse(response, '物种图谱获取失败')
}

export async function fetchDesmidGenera() {
  const response = await fetchBackend('/api/desmid-genera')
  return parseResponse(response, '鼓藻属名录获取失败')
}

export async function fetchDashboard() {
  const response = await fetchBackend('/api/dashboard', { headers: authHeaders() })
  return parseResponse(response, '首页真实数据获取失败')
}

export async function fetchProfile() {
  const response = await fetchBackend('/api/profile', { headers: authHeaders() })
  return parseResponse(response, '个人中心数据获取失败')
}

export async function fetchHistory() {
  const response = await fetchBackend('/api/history', { headers: authHeaders() })
  return parseResponse(response, '历史记录获取失败')
}

export async function fetchStats() {
  const response = await fetchBackend('/api/stats', { headers: authHeaders() })
  return parseResponse(response, '统计数据获取失败')
}

export async function fetchProductData() {
  const response = await fetchBackend('/api/product-data', { headers: authHeaders() })
  return parseResponse(response, '平台数据获取失败')
}

export async function fetchDistributionRecords(params = {}) {
  const query = new URLSearchParams(params).toString()
  const response = await fetchBackend(`/api/distribution/records${query ? `?${query}` : ''}`, { headers: authHeaders() })
  return parseResponse(response, '分布记录获取失败')
}

export async function fetchDistributionMeta() {
  const [records, genera] = await Promise.all([fetchDistributionRecords(), fetchDesmidGenera()])
  return { records: records.items || [], genera: genera.items || [] }
}

export async function fetchDistributionGeoJson(params = {}) {
  const query = new URLSearchParams(params).toString()
  const response = await fetchBackend(`/api/distribution/geojson${query ? `?${query}` : ''}`, { headers: authHeaders() })
  return parseResponse(response, '分布 GeoJSON 获取失败')
}

export async function syncGbifDistribution(payload) {
  const response = await fetchBackend('/api/distribution/sync/gbif', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  })
  return parseResponse(response, 'GBIF 分布数据同步失败')
}

export async function syncINaturalistDistribution(payload) {
  const response = await fetchBackend('/api/distribution/sync/inaturalist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  })
  return parseResponse(response, 'iNaturalist 分布数据同步失败')
}

export async function syncDesmidGeneraDistribution(payload) {
  const response = await fetchBackend('/api/distribution/sync/desmid-genera', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  })
  return parseResponse(response, '在线分布资料同步失败')
}

export async function saveSampleRecord(payload) {
  const response = await fetchBackend('/api/sample-records', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  })
  return parseResponse(response, '样本记录保存失败')
}

export async function createReviewRecord(payload) {
  const response = await fetchBackend('/api/review-records', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  })
  return parseResponse(response, '人工复核记录保存失败')
}

export async function addTrainingSample(payload) {
  const response = await fetchBackend('/api/training-datasets/add-sample', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  })
  return parseResponse(response, '加入训练集失败')
}

export function predictImage(file, onProgress, options = {}) {
  return new Promise((resolve, reject) => {
    if (!API_BASE_URL) {
      reject(new Error(BACKEND_OFFLINE_MESSAGE))
      return
    }

    const formData = new FormData()
    formData.append('image', file)
    if (options.confidence) formData.append('conf', options.confidence)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', apiUrl('/api/detect'))
    Object.entries(authHeaders()).forEach(([key, value]) => xhr.setRequestHeader(key, value))

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 92))
    }

    xhr.onload = () => {
      let payload = {}
      try {
        payload = JSON.parse(xhr.responseText || '{}')
      } catch {
        payload = {}
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(payload)
        return
      }
      if (xhr.status === 401) clearAuth()
      reject(new Error(payload.error || '识别失败，请确认图片清晰后重试'))
    }

    xhr.onerror = () => reject(new Error(BACKEND_OFFLINE_MESSAGE))
    xhr.send(formData)
  })
}

export function runBatchAnalysis(files, onProgress) {
  return new Promise((resolve, reject) => {
    if (!API_BASE_URL) {
      reject(new Error(BACKEND_OFFLINE_MESSAGE))
      return
    }

    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', apiUrl('/api/batch'))
    Object.entries(authHeaders()).forEach(([key, value]) => xhr.setRequestHeader(key, value))

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 88))
    }

    xhr.onload = () => {
      const payload = JSON.parse(xhr.responseText || '{}')
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(payload)
        return
      }
      reject(new Error(payload.error || '批量分析失败'))
    }

    xhr.onerror = () => reject(new Error(BACKEND_OFFLINE_MESSAGE))
    xhr.send(formData)
  })
}

export async function createSamplingAssessment(payload) {
  const response = await fetchBackend('/api/ecology', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  })
  return parseResponse(response, '采样评估生成失败')
}

export async function downloadReport(resultId, format) {
  const response = await fetchBackend(`/api/reports/${resultId}/${format}`, { headers: authHeaders() })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || '报告导出失败')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${resultId}.${format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadBatchReport(taskId) {
  const response = await fetchBackend(`/api/batch/${taskId}/pdf`, { headers: authHeaders() })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || '批量 PDF 报告导出失败')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${taskId}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
