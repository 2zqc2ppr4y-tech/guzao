import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Database,
  Globe2,
  Microscope,
  ScanSearch,
  UploadCloud,
} from 'lucide-react'
import { fetchDashboard } from '../api'
import { DataTable, formatPercent, Panel } from '../components/ui'

const QUICK_ACTIONS = [
  {
    key: 'identify',
    icon: UploadCloud,
    label: '上传样品识别',
    sub: '单张或批量显微图像',
    color: '#16A085',
  },
  {
    key: 'distribution',
    icon: Globe2,
    label: '查看分布图谱',
    sub: 'GBIF · iNaturalist · 本地',
    color: '#2563EB',
  },
  {
    key: 'species',
    icon: BookOpen,
    label: '物种档案',
    sub: '35 属鼓藻形态名录',
    color: '#7C3AED',
  },
  {
    key: 'profile',
    icon: ClipboardList,
    label: '我的识别记录',
    sub: '历史记录与报告管理',
    color: '#D97706',
  },
]

const PIPELINE = [
  { step: '01', label: '图片上传', sub: 'PNG / JPG / WEBP' },
  { step: '02', label: '质量评估', sub: '分辨率 · 大小' },
  { step: '03', label: 'YOLO11 检测', sub: '35 属目标定位' },
  { step: '04', label: '候选排序', sub: '置信度排名' },
  { step: '05', label: '形态复核', sub: '二次解析' },
  { step: '06', label: '结果存档', sub: 'SQLite + 报告' },
]

export default function HomePage({ onNavigate, onNotify }) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchDashboard()
      .then(setDashboard)
      .catch((error) => onNotify?.('error', error.message))
      .finally(() => setLoading(false))
  }, [onNotify])

  const generaChart = useMemo(() => {
    return (dashboard?.genera || [])
      .filter((item) => Number(item.distribution_count || 0) > 0)
      .sort((a, b) => Number(b.distribution_count || 0) - Number(a.distribution_count || 0))
      .slice(0, 10)
  }, [dashboard])

  const recent = dashboard?.recent_records || []

  const metrics = [
    {
      label: '识别记录',
      value: dashboard?.metrics?.find((m) => m.label?.includes('识别'))?.value ?? 0,
      hint: '累计检测次数',
      accent: true,
    },
    {
      label: '物种档案',
      value: dashboard?.metrics?.find((m) => m.label?.includes('物种') || m.label?.includes('档案'))?.value ?? 35,
      hint: '收录鼓藻属数',
    },
    {
      label: '分布记录',
      value: dashboard?.distribution?.total ?? 0,
      hint: '含 GBIF / 本地采样',
    },
    {
      label: '本地坐标记录',
      value: dashboard?.distribution?.local ?? 0,
      hint: '明确 GPS 点位',
    },
  ]

  const now = new Date()
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="grid gap-5">

      {/* ── Workbench header ── */}
      <div className="wb-header">
        <div>
          <div className="wb-header-title">
            <Microscope className="inline h-4 w-4 mr-1.5" style={{ color: 'var(--primary)', verticalAlign: '-2px' }} />
            鼓藻检测管理工作台
          </div>
          <div className="wb-header-sub">{dateStr}</div>
        </div>
        <div className="wb-system-status">
          <span className="wb-online-dot" />
          检测服务在线
          <span style={{ color: 'var(--border-md)', margin: '0 .3rem' }}>·</span>
          YOLO11 guzhao_v4
          <span style={{ color: 'var(--border-md)', margin: '0 .3rem' }}>·</span>
          SQLite 已连接
        </div>
      </div>

      {/* ── Metric strip ── */}
      <div className="wb-metric-strip">
        {metrics.map((m) => (
          <div key={m.label} className={`wb-metric${m.accent ? ' wb-metric-accent' : ''}`}>
            <div className="wb-metric-label">{m.label}</div>
            <div className="wb-metric-value">{loading ? '—' : m.value}</div>
            <div className="wb-metric-hint">{m.hint}</div>
          </div>
        ))}
      </div>

      {/* ── Main workbench layout ── */}
      <div className="wb-layout">
        {/* Left: recent records + distribution chart */}
        <div className="grid gap-5">

          {/* Recent records table */}
          <Panel>
            <div className="section-label-row mb-4">
              <h2>
                <ClipboardList className="inline h-4 w-4 mr-1.5" style={{ color: 'var(--primary)', verticalAlign: '-2px' }} />
                最近识别记录
              </h2>
              <button className="action-btn action-btn-secondary" onClick={() => onNavigate('profile')}>
                查看全部
              </button>
            </div>
            {recent.length ? (
              <DataTable
                headers={['时间', '识别物种', '置信度', '推理模式']}
                rows={recent.map((item) => [
                  item.created_at,
                  item.species,
                  formatPercent(item.confidence),
                  item.inference_mode || 'YOLO11',
                ])}
                minWidth={520}
              />
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                {loading ? '正在读取识别记录…' : '暂无识别记录。上传一张显微图开始第一次检测。'}
              </p>
            )}
          </Panel>

          {/* Distribution bar chart */}
          <Panel>
            <div className="section-label-row mb-4">
              <h2>
                <BarChart3 className="inline h-4 w-4 mr-1.5" style={{ color: 'var(--primary)', verticalAlign: '-2px' }} />
                鼓藻属分布记录排行
              </h2>
            </div>
            {generaChart.length ? (
              <div className="dashboard-bars">
                {generaChart.map((item) => {
                  const max = Math.max(...generaChart.map((r) => Number(r.distribution_count || 0)), 1)
                  return (
                    <div key={item.id} className="dashboard-bar-row">
                      <span>{item.display_name}</span>
                      <div><i style={{ width: `${(Number(item.distribution_count || 0) / max) * 100}%` }} /></div>
                      <strong>{item.distribution_count}</strong>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                暂无分布记录。请同步 GBIF / iNaturalist 数据后查看。
              </p>
            )}
          </Panel>
        </div>

        {/* Right sidebar */}
        <div className="wb-sidebar">

          {/* Quick actions */}
          <Panel>
            <h2 className="panel-title mb-4">
              <ScanSearch className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              快速操作
            </h2>
            <div className="grid gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button key={action.key} className="quick-action-btn" onClick={() => onNavigate(action.key)}>
                    <span className="quick-action-icon" style={{ background: `${action.color}18` }}>
                      <Icon className="h-4 w-4" style={{ color: action.color }} />
                    </span>
                    <div>
                      <div className="quick-action-label">{action.label}</div>
                      <div className="quick-action-sub">{action.sub}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </Panel>

          {/* System / data status */}
          <Panel>
            <h2 className="panel-title mb-3">
              <Database className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              数据来源状态
            </h2>
            <div>
              {[
                ['分布记录总数', dashboard?.distribution?.total ?? '—'],
                ['GBIF / iNat 公开', dashboard?.distribution?.public ?? '—'],
                ['本地明确坐标', dashboard?.distribution?.local ?? '—'],
                ['最近同步', dashboard?.distribution?.updated_at || '暂无数据'],
              ].map(([label, value]) => (
                <div key={label} className="model-status-row">
                  <span>{label}</span>
                  <strong>{loading ? '—' : value}</strong>
                </div>
              ))}
            </div>
          </Panel>

          {/* Pipeline */}
          <Panel>
            <h2 className="panel-title mb-3">
              <Microscope className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              检测流程
            </h2>
            <div className="grid gap-2">
              {PIPELINE.map((step, index) => (
                <div
                  key={step.step}
                  className="flex items-start gap-2.5 text-sm"
                  style={{ borderBottom: index < PIPELINE.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '.5rem', marginBottom: index < PIPELINE.length - 1 ? '.25rem' : 0 }}
                >
                  <span style={{
                    display: 'grid', width: '1.5rem', height: '1.5rem', placeItems: 'center',
                    borderRadius: '50%', background: 'var(--primary)', color: '#fff',
                    fontSize: '.64rem', fontWeight: 800, flexShrink: 0, marginTop: '.05rem',
                  }}>{step.step}</span>
                  <div>
                    <div style={{ color: 'var(--text)', fontWeight: 600 }}>{step.label}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: '.76rem' }}>{step.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

        </div>
      </div>

    </div>
  )
}
