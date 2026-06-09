import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  Database,
  FileText,
  Globe2,
  Layers,
  Layers3,
  Microscope,
  ScanSearch,
  UploadCloud,
  Zap
} from 'lucide-react'
import { fetchDashboard } from '../api'
import heroAsset from '../assets/desmid-hero.png'
import { DataTable, formatPercent, PageIntro, Panel, StatCard } from '../components/ui'

const CAPABILITIES = [
  {
    key: 'identify',
    icon: ScanSearch,
    title: '单张图像识别',
    desc: '上传显微图片，YOLO11 模型实时检测鼓藻属类，返回带框结果图与置信度排序。',
    color: '#10b981',
  },
  {
    key: 'batch',
    icon: Layers,
    title: '批量图像识别',
    desc: '一次上传多张图片，自动完成批量检测、结果汇总与 CSV / PDF 报告导出。',
    color: '#06b6d4',
  },
  {
    key: 'distribution',
    icon: Globe2,
    title: '鼓藻分布可视化',
    desc: '融合 GBIF / iNaturalist / 本地采样数据，在交互地图上展示真实物种分布热力图。',
    color: '#3b82f6',
  },
  {
    key: 'species',
    icon: BookOpen,
    title: '物种档案库',
    desc: '收录 35 属鼓藻形态描述、拉丁名、生境信息与参考图库，支持检索和对比。',
    color: '#8b5cf6',
  },
  {
    key: 'reports',
    icon: FileText,
    title: '检测报告管理',
    desc: '每次识别自动生成结构化报告，支持 PDF / CSV 导出，历史报告可按需调阅。',
    color: '#f59e0b',
  },
  {
    key: 'identify',
    icon: Zap,
    title: 'AI 智能解析建议',
    desc: 'YOLO 检测完成后调用大模型二次复核，输出形态分析、相似种对比与人工复核建议。',
    color: '#ef4444',
  },
]

const PIPELINE = [
  { step: '01', label: '图片上传', sub: 'PNG / JPG / WEBP' },
  { step: '02', label: '图像质量分析', sub: '分辨率 · 亮度 · 边缘' },
  { step: '03', label: 'YOLO11 检测', sub: '35 属鼓藻目标定位' },
  { step: '04', label: '结果可视化', sub: '检测框 + 置信度排序' },
  { step: '05', label: 'AI 解析复核', sub: 'DeepSeek 大模型二次校验' },
  { step: '06', label: '记录存档', sub: 'SQLite + PDF/CSV 导出' },
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
    const items = dashboard?.genera || []
    return items
      .filter((item) => Number(item.distribution_count || 0) > 0)
      .sort((a, b) => Number(b.distribution_count || 0) - Number(a.distribution_count || 0))
      .slice(0, 10)
  }, [dashboard])

  const recent = dashboard?.recent_records || []

  return (
    <div className="grid gap-10">

      {/* Hero */}
      <section
        className="hero-section home-overview-hero"
        style={{ backgroundImage: `linear-gradient(135deg, rgba(10,18,38,0.92), rgba(15,35,60,0.80), rgba(30,55,80,0.55)), url(${heroAsset})` }}
      >
        <div className="max-w-3xl">
          <div className="eyebrow">
            <Microscope className="h-4 w-4" />
            蓝域智测 · 水下生态智能诊断平台
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
            鼓藻智析平台
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            基于 YOLO11 目标检测与 AI 大模型复核，为淡水藻类研究者提供端到端的鼓藻显微图像识别、分布可视化与采样报告工具链。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="primary-button px-6 py-3" onClick={() => onNavigate('identify')}>
              <UploadCloud className="h-4 w-4" />
              开始单张识别
            </button>
            <button className="secondary-button px-6 py-3" onClick={() => onNavigate('batch')}>
              <Layers className="h-4 w-4" />
              批量识别
            </button>
            <button className="secondary-button px-6 py-3" onClick={() => onNavigate('distribution')}>
              <Globe2 className="h-4 w-4" />
              分布图谱
            </button>
          </div>
        </div>
      </section>

      {/* 实时统计指标 */}
      <section>
        <SectionLabel>平台实时统计</SectionLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {(dashboard?.metrics || []).map((item) => (
            <StatCard key={item.label} {...item} icon={Layers3} />
          ))}
          {!dashboard?.metrics?.length && (
            <Panel className="xl:col-span-6">
              <p className="text-slate-300">{loading ? '正在读取数据库...' : '暂无真实统计数据。'}</p>
            </Panel>
          )}
        </div>
      </section>

      {/* 核心能力卡片 */}
      <section>
        <SectionLabel>核心功能</SectionLabel>
        <p className="mt-1 text-sm text-slate-400">点击卡片直接进入对应功能模块</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap, index) => {
            const Icon = cap.icon
            return (
              <button
                key={index}
                className="capability-card"
                onClick={() => onNavigate(cap.key)}
                style={{ '--cap-color': cap.color }}
              >
                <span className="capability-icon">
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

      {/* 技术流程 */}
      <section>
        <SectionLabel>识别技术流程</SectionLabel>
        <p className="mt-1 text-sm text-slate-400">从图片上传到结果存档，全流程自动化处理</p>
        <div className="mt-5 overflow-x-auto">
          <div className="pipeline-row">
            {PIPELINE.map((step, index) => (
              <div key={step.step} className="pipeline-step-wrap">
                <div className="pipeline-step">
                  <span className="pipeline-num">{step.step}</span>
                  <span className="pipeline-label">{step.label}</span>
                  <span className="pipeline-sub">{step.sub}</span>
                </div>
                {index < PIPELINE.length - 1 && (
                  <div className="pipeline-arrow">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 数据分布 */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <h2 className="panel-title">
            <BarChart3 className="h-5 w-5 text-cyan-100" />
            鼓藻属真实分布记录排行
          </h2>
          <div className="mt-5">
            {generaChart.length ? (
              <SimpleBars rows={generaChart} />
            ) : (
              <p className="text-slate-300 text-sm">
                暂无真实分布点。请从分布图谱页同步 GBIF / iNaturalist 数据后查看排行。
              </p>
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="panel-title">
            <Database className="h-5 w-5 text-cyan-100" />
            数据来源状态
          </h2>
          <div className="mt-5 grid gap-3">
            <MetricLine label="真实分布记录" value={dashboard?.distribution?.total ?? 0} />
            <MetricLine label="公开来源记录（GBIF / iNat）" value={dashboard?.distribution?.public ?? 0} />
            <MetricLine label="本地明确坐标记录" value={dashboard?.distribution?.local ?? 0} />
            <MetricLine label="最近同步时间" value={dashboard?.distribution?.updated_at || '暂无真实分布数据'} />
          </div>
        </Panel>
      </section>

      {/* 最近识别记录 */}
      <section>
        <PageIntro eyebrow="最近识别" title="最近 5 条真实识别记录" />
        <div className="mt-4">
          {recent.length ? (
            <DataTable
              headers={['时间', '类别', '置信度', '推理模式', '结果图']}
              rows={recent.map((item) => [
                item.created_at,
                item.species,
                formatPercent(item.confidence),
                item.inference_mode,
                item.image_url
                  ? <a className="link-button" href={item.image_url} target="_blank" rel="noreferrer">查看</a>
                  : '-',
              ])}
            />
          ) : (
            <Panel>
              <p className="text-slate-300 text-sm">暂无真实识别记录。上传一张显微图即可开始。</p>
            </Panel>
          )}
        </div>
      </section>

    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <h2 className="section-label">{children}</h2>
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
