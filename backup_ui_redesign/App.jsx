import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  FileText,
  Home,
  Layers,
  Map,
  Microscope,
  UploadCloud,
  UserRound
} from 'lucide-react'
import { checkBackend, fetchMe } from './api'
import { getAuth } from './auth'
import Layout from './components/Layout'
import Toast from './components/Toast'
import HomePage from './pages/HomePage'
import SampleIdentifyPage from './pages/SampleIdentifyPage'
import BatchDetectionPage from './pages/BatchDetectionPage'
import DistributionPage from './pages/DistributionPage'
import SpeciesArchivePage from './pages/SpeciesArchivePage'
import ReportCenterPage from './pages/ReportCenterPage'
import ProfilePage from './pages/ProfilePage'

const baseNavItems = [
  { key: 'home',         label: '首页',     icon: Home },
  { key: 'identify',     label: '样本识别', icon: UploadCloud },
  { key: 'batch',        label: '批量识别', icon: Layers },
  { key: 'distribution', label: '分布图谱', icon: Map },
  { key: 'species',      label: '物种档案', icon: BookOpen },
  { key: 'reports',      label: '报告中心', icon: FileText },
  { key: 'profile',      label: '个人中心', icon: UserRound },
]

function readHashPage(navItems) {
  const key = window.location.hash.replace('#', '')
  return navItems.some((item) => item.key === key) ? key : 'home'
}

export default function App() {
  const [active, setActive] = useState(() => readHashPage(baseNavItems))
  const [backend, setBackend] = useState({ status: 'checking' })
  const [auth, setAuthState] = useState(() => getAuth())
  const [notice, setNotice] = useState(null)

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
    const onHashChange = () => setActive(readHashPage(baseNavItems))
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
      case 'batch':
        return <BatchDetectionPage {...commonProps} />
      case 'distribution':
        return <DistributionPage {...commonProps} />
      case 'species':
        return <SpeciesArchivePage {...commonProps} />
      case 'reports':
        return <ReportCenterPage {...commonProps} />
      case 'profile':
        return <ProfilePage {...commonProps} />
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
