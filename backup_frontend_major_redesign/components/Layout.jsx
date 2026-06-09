import { Eye, EyeOff, LogIn, LogOut, UserPlus, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { loginUser, logoutUser, registerUser } from '../api'
import { setAuth } from '../auth'

export default function Layout({ navItems, active, auth, onAuthChange, onNotify, onNavigate, brandIcon: BrandIcon, children }) {
  const [authOpen, setAuthOpen] = useState(false)

  const openProfile = () => {
    if (auth?.token) {
      onNavigate('profile')
      return
    }
    setAuthOpen(true)
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-3">
          <button className="brand-button" onClick={() => onNavigate('home')}>
            <span className="brand-mark">{BrandIcon && <BrandIcon className="h-6 w-6" />}</span>
            <span>
              <strong>鼓藻智析平台</strong>
              <small>Desmid Insight Platform</small>
            </span>
          </button>

          <nav className="hidden flex-1 justify-center gap-1 lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  className={`nav-button ${active === item.key ? 'nav-button-active' : ''}`}
                  onClick={() => onNavigate(item.key)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <button className="account-button" onClick={openProfile}>
            <UserRound className="h-4 w-4" />
            <span>{auth?.user?.display_name || auth?.user?.username || '登录'}</span>
          </button>
        </div>

        <div className="mobile-nav mx-auto flex max-w-[1360px] gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                className={`nav-button shrink-0 ${active === item.key ? 'nav-button-active' : ''}`}
                onClick={() => onNavigate(item.key)}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </header>
      <main className="page-shell">{children}</main>
      {authOpen && (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          onAuthed={(payload, remember) => {
            setAuth(payload, { remember })
            onAuthChange?.(payload)
            setAuthOpen(false)
            onNotify?.('success', '登录成功。')
          }}
        />
      )}
    </div>
  )
}

function AuthDialog({ onClose, onAuthed }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', display_name: '' })
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const username = form.username.trim()
  const displayName = form.display_name.trim()

  const validation = useMemo(() => {
    if (!/^[0-9A-Za-z_\-.@\u4e00-\u9fff]{3,32}$/.test(username)) {
      return '用户名需为 3-32 个字符，可使用中文、字母、数字、下划线、短横线、点号或 @。'
    }
    if (mode === 'register' && displayName.length > 24) {
      return '显示名称不能超过 24 个字符。'
    }
    if (form.password.length < 6) {
      return '密码至少需要 6 个字符。'
    }
    return ''
  }, [displayName.length, form.password.length, mode, username])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setForm((current) => ({ ...current, password: '', display_name: nextMode === 'login' ? '' : current.display_name }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = {
        username,
        password: form.password,
        display_name: displayName,
        remember
      }
      const authPayload = mode === 'login' ? await loginUser(payload) : await registerUser(payload)
      onAuthed(authPayload, remember)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <form className="auth-dialog" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="auth-eyebrow">{mode === 'login' ? 'Welcome back' : 'Create account'}</span>
            <h2 id="auth-title">{mode === 'login' ? '登录账户' : '注册账户'}</h2>
            <p>识别记录、复核记录和个人统计会归档到当前账户。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="auth-tabs" aria-label="账户模式">
          <button type="button" className={`auth-tab ${mode === 'login' ? 'auth-tab-active' : ''}`} onClick={() => switchMode('login')}>
            <LogIn className="h-4 w-4" />
            登录
          </button>
          <button type="button" className={`auth-tab ${mode === 'register' ? 'auth-tab-active' : ''}`} onClick={() => switchMode('register')}>
            <UserPlus className="h-4 w-4" />
            注册
          </button>
        </div>

        <label className="field mt-5">
          <span>用户名</span>
          <input
            className={`form-input ${error && !/^[0-9A-Za-z_\-.@\u4e00-\u9fff]{3,32}$/.test(username) ? 'form-input-error' : ''}`}
            value={form.username}
            onChange={(event) => update('username', event.target.value)}
            autoFocus
            autoComplete="username"
            placeholder="3-32 个字符"
          />
        </label>
        {mode === 'register' && (
          <label className="field">
            <span>显示名称</span>
            <input
              className="form-input"
              value={form.display_name}
              onChange={(event) => update('display_name', event.target.value)}
              autoComplete="name"
              placeholder="默认使用用户名"
            />
          </label>
        )}
        <label className="field">
          <span>密码</span>
          <span className="password-field">
            <input
              className={`form-input ${error && form.password.length < 6 ? 'form-input-error' : ''}`}
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="至少 6 个字符"
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>

        <label className="auth-checkline">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          <span>记住登录状态</span>
        </label>

        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="primary-button mt-2 w-full px-4 py-3" disabled={busy}>
          {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {busy ? '处理中' : mode === 'login' ? '登录' : '注册并登录'}
        </button>
        <button type="button" className="link-button justify-self-center" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? '没有账户，去注册' : '已有账户，去登录'}
        </button>
      </form>
    </div>
  )
}

export function LogoutButton({ onDone }) {
  return (
    <button
      className="secondary-button px-4 py-2"
      onClick={async () => {
        await logoutUser()
        onDone?.()
      }}
    >
      <LogOut className="h-4 w-4" />
      退出登录
    </button>
  )
}
