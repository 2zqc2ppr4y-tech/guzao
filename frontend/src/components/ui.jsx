import { Activity, BarChart3, CheckCircle2, Download, Inbox, Sparkles } from 'lucide-react'

export function formatPercent(value, digits = 1) {
  const numeric = Number(value) || 0
  const percent = numeric > 1 ? numeric : numeric * 100
  return `${percent.toFixed(digits)}%`
}

export function PageIntro({ eyebrow, title, text, action }) {
  return (
    <section className="page-intro">
      <div>
        <div className="eyebrow">
          <Activity className="h-4 w-4" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action && <div className="page-intro-actions">{action}</div>}
    </section>
  )
}

export function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className="section-heading">
      {eyebrow && (
        <div className="eyebrow">
          <Sparkles className="h-4 w-4" />
          {eyebrow}
        </div>
      )}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}

export function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <article className="metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p>{label}</p>
          <strong>{value}</strong>
        </div>
        {Icon && <Icon className="h-6 w-6" style={{ color: 'var(--primary)' }} />}
      </div>
      {hint && <span>{hint}</span>}
    </article>
  )
}

export function Panel({ children, className = '' }) {
  return <section className={`panel ${className}`}>{children}</section>
}

export function StatusPill({ status }) {
  const key = String(status || '').replace(/\s+/g, '')
  return <span className={`status-pill status-${key}`}>{status}</span>
}

export function ProgressBar({ value, color = '#14b8a6' }) {
  const width = `${Math.max(2, Math.min(100, Number(value) * 100 || Number(value) || 0))}%`
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width, background: color }} />
    </div>
  )
}

export function BarList({ title, data, suffix = '' }) {
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1)
  return (
    <Panel>
      <h3 className="panel-title">
        <BarChart3 className="h-5 w-5" style={{ color: 'var(--primary)' }} />
        {title}
      </h3>
      {data.length ? (
        <div className="mt-4 grid gap-3">
          {data.map((item) => (
            <div key={item.label}>
              <div className="chart-row-label">
                <span>{item.label}</span>
                <span>{item.value}{suffix}</span>
              </div>
              <ProgressBar value={(Number(item.value) || 0) / max} color={item.color || '#14b8a6'} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无统计数据" text="当前筛选范围内没有可用于绘制排行的数据。" compact />
      )}
    </Panel>
  )
}

export function DataTable({ headers, rows, minWidth = 840, emptyText = '暂无匹配记录。' }) {
  return (
    <div className="table-wrap">
      <table style={{ minWidth }}>
        <thead>
          <tr>{headers.map((head) => <th key={head}>{head}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row[0]}`}>
                {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length}>
                <EmptyState title="暂无数据" text={emptyText} compact />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props) {
  return <input className="form-input" {...props} />
}

export function SelectInput({ children, ...props }) {
  return <select className="form-input" {...props}>{children}</select>
}

export function TextArea(props) {
  return <textarea className="form-input min-h-24 resize-y" {...props} />
}

export function ExportButton({ children = '导出 CSV', onClick }) {
  return (
    <button className="secondary-button px-4 py-2" onClick={onClick}>
      <Download className="h-4 w-4" />
      {children}
    </button>
  )
}

export function ConfirmButton({ children, onClick }) {
  return (
    <button className="primary-button px-4 py-2" onClick={onClick}>
      <CheckCircle2 className="h-4 w-4" />
      {children}
    </button>
  )
}

export function EmptyState({ title = '暂无数据', text, action, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      <span className="empty-state-icon">
        <Inbox className="h-5 w-5" />
      </span>
      <div>
        <strong>{title}</strong>
        {text && <p>{text}</p>}
      </div>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
