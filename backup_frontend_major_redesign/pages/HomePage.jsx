import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Database,
  FileText,
  Globe2,
  Layers,
  Microscope,
  ScanSearch,
  UploadCloud,
  Zap,
} from 'lucide-react'
import { fetchDashboard } from '../api'
import { DataTable, formatPercent, Panel, StatCard } from '../components/ui'

const CAPABILITIES = [
  {
    key: 'identify',
    icon: ScanSearch,
    title: '样品识别',
    desc: '上传显微图片，YOLO11 实时检测鼓藻目标，返回带框结果与置信度排序。',
    color: '#1CA78A',
  },
  {
    key: 'identify',
    icon: Layers,
    title: '批量检测',
    desc: '切换至批量模式，一次提交多张图片，自动完成推理与类群组成统计。',
    color: '#2F80ED',
  },
  {
    key: 'distribution',
    icon: Globe2,
    title: '分布图谱',
    desc: '融合 GBIF / iNaturalist / 本地采样数据，交互地图展示物种分布热力图。',
    color: '#7C3AED',
  },
  {
    key: 'species',
    icon: BookOpen,
    title: '物种档案',
    desc: '收录 35 属鼓藻形态描述、拉丁名、生境与参考图库，支持检索与形态对比。',
    color: '#D97706',
  },
  {
    key: 'profile',
    icon: ClipboardList,
    title: '检测记录',
    desc: '查看历史识别记录，在每条记录后生成 PDF 报告，支持打印与存档。',
    color: '#0369A1',
  },
  {
    key: 'identify',
    icon: Zap,
    title: '形态解析',
    desc: 'YOLO 检测完成后调用 DeepSeek 进行形态二次解析，输出相似种对比与复核建议。',
    color: '#6B7280',
  },
]

const PIPELINE = [
  { step: '01', label: '图片上传', sub: 'PNG / JPG / WEBP' },
  { step: '02', label: '质量评估', sub: '分辨率 · 大小 · 格式' },
  { step: '03', label: 'YOLO11 检测', sub: '35 属鼓藻目标定位' },
  { step: '04', label: '候选排序', sub: '置信度排名' },
  { step: '05', label: '形态复核', sub: 'DeepSeek 二次解析' },
  { step: '06', label: '结果存档', sub: 'SQLite + 报告导出' },
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

  const miniStats = [
    {
      label: '识别记录',
      value: dashboard?.metrics?.find((m) => m.label?.includes('识别'))?.value ?? 0,
    },
    {
      label: '物种档案',
      value: dashboard?.metrics?.find((m) => m.label?.includes('物种') || m.label?.includes('档案'))?.value ?? 35,
    },
    {
      label: '分布记录',
      value: dashboard?.distribution?.total ?? 0,
    },
  ]

  return (
    <div className="grid gap-10">

      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="hero-split">
          {/* Left */}
          <div>
            <div className="hero-eyebrow-tag">
              <Microscope className="h-3.5 w-3.5" />
              水生态显微样品检测平台
            </div>
            <h1 className="hero-title">鼓藻智析平台</h1>
            <p className="hero-desc">
              面向淡水藻类研究者的鼓藻图像识别、物种分布可视化与检测记录管理平台，基于 YOLO11 目标检测模型提供端到端的样品分析工具链。
            </p>
            <div className="hero-buttons">
              <button className="primary-button px-6 py-3" onClick={() => onNavigate('identify')}>
                <UploadCloud className="h-4 w-4" />
                上传样品识别
              </button>
              <button className="secondary-button px-6 py-3" onClick={() => onNavigate('distribution')}>
                <Globe2 className="h-4 w-4" />
                查看分布图谱
              </button>
            </div>
            <div className="hero-mini-stats">
              {miniStats.map((stat) => (
                <div key={stat.label} className="hero-mini-stat">
                  <strong>{loading ? '—' : stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — detection flow card */}
          <div className="hero-flow-card">
            <h3>
              <ScanSearch className="inline h-4 w-4 mr-1.5 text-teal-600" style={{ verticalAlign: '-2px' }} />
              检测流程
            </h3>
            {PIPELINE.map((step) => (
              <div key={step.step} className="hero-flow-step">
                <span className="hero-flow-num">{step.step}</span>
                <span className="hero-flow-text">{step.label}</span>
                <span className="hero-flow-sub">{step.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform stats ── */}
      <section>
        <h2 className="section-label">平台实时统计</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {(dashboard?.metrics || []).map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
          {!dashboard?.metrics?.length && (
            <Panel className="xl:col-span-6">
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                {loading ? '正在读取数据库…' : '暂无统计数据。'}
              </p>
            </Panel>
          )}
        </div>
      </section>

      {/* ── Capability cards ── */}
      <section>
        <h2 className="section-label">平台功能</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>点击卡片进入对应功能模块</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap, index) => {
            const Icon = cap.icon
            return (
              <button
                key={index}
                className="capability-card"
                onClick={() => onNavigate(cap.key)}
              >
                <span className="capability-icon" style={{ background: `${cap.color}14`, borderColor: `${cap.color}28` }}>
                  <Icon className="h-5 w-5" style={{ color: cap.color }} />
                </span>
                <div className="text-left">
                  <div className="capability-title">{cap.title}</div>
                  <div className="capability-desc">{cap.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Technical pipeline ── */}
      <section>
        <h2 className="section-label">识别技术流程</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>从图片上传到结果存档，全流程自动化处理</p>
        <div className="mt-5 overflow-x-auto">
          <div className="pipeline-row">
            {PIPELINE.map((step, index) => (
              <div key={step.step} className="pipeline-step-wrap">
                <div className="pipeline-step">
                  <span className="pipeline-num">{step.step}</span>
                  <span className="pipeline-label">{step.label}</span>
                  <span className="pipeline-sub">{step.sub}</span>
                </div>
                {index < PIPELINE.length - 1 && <div className="pipeline-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Data distribution ── */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <h2 className="panel-title">
            <BarChart3 className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            鼓藻属分布记录排行
          </h2>
          <div className="mt-5">
            {generaChart.length ? (
              <SimpleBars rows={generaChart} />
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                暂无分布记录。请在分布图谱页同步 GBIF / iNaturalist 数据后查看。
              </p>
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="panel-title">
            <Database className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            数据来源状态
          </h2>
          <div className="mt-5 grid gap-3">
            <MetricLine label="真实分布记录总数" value={dashboard?.distribution?.total ?? 0} />
            <MetricLine label="公开来源（GBIF / iNat）" value={dashboard?.distribution?.public ?? 0} />
            <MetricLine label="本地明确坐标记录" value={dashboard?.distribution?.local ?? 0} />
            <MetricLine label="最近同步时间" value={dashboard?.distribution?.updated_at || '暂无数据'} />
          </div>
        </Panel>
      </section>

      {/* ── Recent records ── */}
      <section>
        <h2 className="section-label">最近识别记录</h2>
        <div className="mt-4">
          {recent.length ? (
            <DataTable
              headers={['时间', '识别物种', '置信度', '推理模式', '结果图']}
              rows={recent.map((item) => [
                item.created_at,
                item.species,
                formatPercent(item.confidence),
                item.inference_mode,
                item.image_url
                  ? <a className="link-button" href={item.image_url} target="_blank" rel="noreferrer">查看</a>
                  : '—',
              ])}
            />
          ) : (
            <Panel>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                {loading ? '正在读取识别记录…' : '暂无识别记录。上传一张显微图开始第一次检测。'}
              </p>
            </Panel>
          )}
        </div>
      </section>

    </div>
  )
}

function SimpleBars({ rows }) {
  const max = Math.max(...rows.map((item) => Number(item.distribution_count || 0)), 1)
  return (
    <div className="dashboard-bars">
      {rows.map((item) => (
        <div key={item.id} className="dashboard-bar-row">
          <span>{item.display_name}</span>
          <div><i style={{ width: `${(Number(item.distribution_count || 0) / max) * 100}%` }} /></div>
          <strong>{item.distribution_count}</strong>
        </div>
      ))}
    </div>
  )
}

function MetricLine({ label, value }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
