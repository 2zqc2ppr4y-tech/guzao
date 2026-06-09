import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ClipboardList,
  Home,
  LineChart,
  Map,
  Microscope,
  ScanSearch,
  Settings2
} from 'lucide-react'
import { checkBackend, fetchMe } from './api'
import { getAuth } from './auth'
import Layout from './components/Layout'
import Toast from './components/Toast'
import HomePage from './pages/HomePage'
import SampleIdentifyPage from './pages/SampleIdentifyPage'
import DistributionPage from './pages/DistributionPage'
import SpeciesArchivePage from './pages/SpeciesArchivePage'
import ProfilePage from './pages/ProfilePage'
import DataWorkbenchPage from './pages/DataWorkbenchPage'
import ModelTrainingPage from './pages/ModelTrainingPage'

const baseNavItems = [
  { key: 'home', label: '总览', shortLabel: '总览', icon: Home, group: 'overview' },
  { key: 'identify', label: '图像检测', shortLabel: '检测', icon: ScanSearch, group: 'detect' },
  { key: 'data', label: '数据统计', shortLabel: '统计', icon: LineChart, group: 'records' },
  { key: 'distribution', label: '分布图谱', shortLabel: '图谱', icon: Map, group: 'detect' },
  { key: 'species', label: '物种档案', shortLabel: '档案', icon: BookOpen, group: 'detect' },
  { key: 'profile', label: '检测记录', shortLabel: '记录', icon: ClipboardList, group: 'records' },
  { key: 'admin', label: '管理后台', shortLabel: '后台', icon: Settings2, group: 'admin' },
]
const routeItems = baseNavItems

function readHashPage(navItems) {
  const key = window.location.hash.replace('#', '')
  return navItems.some((item) => item.key === key) ? key : 'home'
}

export default function App() {
  const [active, setActive] = useState(() => readHashPage(routeItems))
  const [backend, setBackend] = useState({ status: 'checking' })
  const [auth, setAuthState] = useState(() => getAuth())
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    document.title = '鼓藻鉴析'
  }, [])

  const notify = useCallback((type, text) => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice(null), 3200)
  }, [])

  const navigate = useCallback((page) => {
    window.location.hash = page
    setActive(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onHashChange = () => setActive(readHashPage(routeItems))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    checkBackend()
      .then((payload) => setBackend({ status: 'up', ...payload }))
      .catch((error) => setBackend({ status: 'down', error: error.message }))
  }, [])

  useEffect(() => {
    if (!getAuth()?.token) return
    fetchMe()
      .then((payload) => setAuthState(getAuth() ? { ...getAuth(), user: payload.user } : null))
      .catch(() => setAuthState(null))
  }, [])

  const page = useMemo(() => {
    const commonProps = { onNavigate: navigate, onNotify: notify, backend, auth, onAuthChange: setAuthState }
    switch (active) {
      case 'identify':
        return <SampleIdentifyPage {...commonProps} />
      case 'data':
        return <DataWorkbenchPage {...commonProps} />
      case 'distribution':
        return <DistributionPage {...commonProps} />
      case 'species':
        return <SpeciesArchivePage {...commonProps} />
      case 'profile':
        return <ProfilePage {...commonProps} />
      case 'admin':
        return <ModelTrainingPage {...commonProps} />
      default:
        return <HomePage {...commonProps} />
    }
  }, [active, auth, backend, navigate, notify])

  return (
    <Layout
      navItems={baseNavItems}
      active={active}
      backend={backend}
      auth={auth}
      onAuthChange={setAuthState}
      onNotify={notify}
      onNavigate={navigate}
      brandIcon={Microscope}
    >
      {page}
      {notice && <Toast notice={notice} />}
    </Layout>
  )
}
