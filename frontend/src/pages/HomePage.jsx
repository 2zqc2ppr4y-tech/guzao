import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Cpu,
  ClipboardList,
  Database,
  FileText,
  Globe2,
  Microscope,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Workflow,
  Zap,
} from 'lucide-react'
import { fetchDashboard } from '../api'
import { DataTable, EmptyState, formatPercent, Panel, SectionHeading } from '../components/ui'
import closteriumReference from '../assets/closterium-reference.png'
import cosmariumReference from '../assets/cosmarium-reference.png'
import desmidHero from '../assets/desmid-hero.png'
import micrasteriasReference from '../assets/micrasterias-reference.png'

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
]

const PIPELINE = [
  { step: '01', label: '图片上传', sub: 'PNG / JPG / WEBP' },
  { step: '02', label: '质量评估', sub: '分辨率 · 大小' },
  { step: '03', label: 'YOLO11 检测', sub: '35 属目标定位' },
  { step: '04', label: '候选排序', sub: '置信度排名' },
  { step: '05', label: '形态复核', sub: '特征解释' },
  { step: '06', label: '结果存档', sub: '账户记录' },
]

const FEATURE_CARDS = [
  {
    icon: ScanSearch,
    title: '智能图像检测',
    text: '支持单张与批量显微图像识别，输出检测框、候选类群、置信度和处理耗时。',
    meta: 'YOLO11 · Top 候选排序',
  },
  {
    icon: ClipboardList,
    title: '复核与记录归档',
    text: '低置信度样本进入复核语境，识别结果可沉淀为账户历史、样本记录和报告。',
    meta: '记录 · 复核 · 报告',
  },
  {
    icon: Globe2,
    title: '水生态分布图谱',
    text: '整合公开分布与本地采样点，支持按物种、来源、时间和水体类型筛选。',
    meta: 'GBIF · iNaturalist · Local',
  },
  {
    icon: BookOpen,
    title: '鼓藻属物种档案',
    text: '保留真实图片、中文属名、拉丁属名和分布记录，辅助教学与人工复核。',
    meta: '图库 · 属名录 · 说明',
  },
]

const TECH_HIGHLIGHTS = [
  {
    icon: Cpu,
    eyebrow: 'Model',
    title: 'YOLO11 检测接入',
    text: '后端优先调用真实模型权重，返回检测框、类别、置信度和候选排序；模型不可用时保留演示兜底。',
    metric: 'detect / batch',
  },
  {
    icon: Database,
    eyebrow: 'Data',
    title: 'SQLite 数据沉淀',
    text: '识别记录、采样点、复核状态、物种档案、分布记录和报告结果写入统一数据层。',
    metric: 'records / reports',
  },
  {
    icon: Workflow,
    eyebrow: 'Workflow',
    title: '科研辅助闭环',
    text: '上传、识别、解释、复核、归档、分布、报告连续推进，每一次检测都成为可追溯资产。',
    metric: 'identify → archive',
  },
]

const ADVANTAGES = [
  {
    icon: ShieldCheck,
    title: '可信而克制',
    text: '平台强调置信度、候选排序和人工复核，不把模型输出包装成最终鉴定结论。',
  },
  {
    icon: Zap,
    title: '批量效率提升',
    text: '多图上传后自动生成批次统计、低置信度队列和导出结果，适合连续采样与课程实验。',
  },
  {
    icon: FileText,
    title: '报告可直接归档',
    text: '单图与批量报告保留识别、质量、复核建议和免责声明，便于项目材料整理。',
  },
  {
    icon: Sparkles,
    title: '水生态场景定制',
    text: '界面、词汇和数据模块围绕鼓藻显微图像、水体采样、分布图谱和模型迭代设计。',
  },
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
      <section className="home-command">
        <div className="home-command-main">
          <div className="eyebrow">
            <Microscope className="h-4 w-4" />
            水生态智能识别系统
          </div>
          <h1><span>鼓藻鉴析</span></h1>
          <h2>基于深度学习的鼓藻智能识别与生态分析平台</h2>
          <p>
            面向水生态监测、科研教学与藻类样本管理场景，平台支持鼓藻图像上传、智能识别、结果分析、记录管理与报告导出，帮助用户更高效完成鼓藻鉴定与数据归档。
          </p>
          <div className="hero-capability-tags" aria-label="核心能力">
            {[
              [ScanSearch, '鼓藻图像识别'],
              [ClipboardList, '检测记录管理'],
              [BarChart3, '智能生态分析'],
            ].map(([Icon, label]) => (
              <span key={label}>
                <Icon className="h-4 w-4" />
                {label}
              </span>
            ))}
          </div>
          <div className="home-command-actions">
            <button className="primary-button px-5 py-3" onClick={() => onNavigate('identify')}>
              <UploadCloud className="h-5 w-5" />
              开始图像检测
              <ArrowRight className="h-4 w-4" />
            </button>
            <button className="secondary-button px-5 py-3" onClick={() => onNavigate('distribution')}>
              <Globe2 className="h-5 w-5" />
              查看生态图谱
            </button>
          </div>
        </div>
        <div className="home-visual-card" aria-label="鼓藻显微图像检测预览">
          <div className="detection-preview-card">
            <div className="preview-card-header">
              <div>
                <span>实时检测预览</span>
                <strong>YOLO11 / desmid_v4</strong>
              </div>
              <small>在线</small>
            </div>
            <div className="specimen-preview">
              <img src={desmidHero} alt="鼓藻显微图像检测预览" />
              <span className="detect-box detect-box-a">Cosmarium 92.6%</span>
              <span className="detect-box detect-box-b">Closterium 84.1%</span>
            </div>
            <div className="preview-result-grid">
              <div>
                <span>识别类别</span>
                <strong>Cosmarium / 鼓藻属候选</strong>
              </div>
              <div>
                <span>最高置信度</span>
                <strong>92.6%</strong>
              </div>
              <div>
                <span>检测时间</span>
                <strong>1.28 s</strong>
              </div>
            </div>
            <p>
              系统将根据图像特征提取结果，结合模型识别类别与置信度，辅助用户判断鼓藻样本类型。
            </p>
          </div>
          <div className="home-command-status">
            <div className="home-date">{dateStr}</div>
            {[
              ['检测服务', '在线', CheckCircle2],
              ['识别模型', 'YOLO11 guzhao_v4', ScanSearch],
              ['数据库', 'SQLite 已连接', Database],
            ].map(([label, value, Icon]) => (
              <div key={label} className="home-status-row">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="home-visual-strip">
            {[
              [micrasteriasReference, 'Micrasterias'],
              [cosmariumReference, 'Cosmarium'],
              [closteriumReference, 'Closterium'],
            ].map(([src, label]) => (
              <figure key={label}>
                <img src={src} alt={`${label} 参考图`} />
                <figcaption>{label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

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

      <section className="home-section">
        <SectionHeading
          eyebrow="Core modules"
          title="从一次识别到一套水生态工作流"
          text="平台把图像识别、人工复核、分布图谱和报告归档组织在同一个产品界面里。"
        />
        <div className="feature-card-grid">
          {FEATURE_CARDS.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="stripe-feature-card">
                <span className="feature-card-icon"><Icon className="h-5 w-5" /></span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
                <em>{item.meta}</em>
              </article>
            )
          })}
        </div>
      </section>

      <section className="home-tech-grid">
        <div className="tech-copy">
          <SectionHeading
            eyebrow="Technical highlights"
            title="模型、数据与科研流程并行设计"
            text="设计重点不是把模型结果截图化，而是让每一步都能解释、复核、保存和再利用。"
          />
          <div className="tech-highlight-list">
            {TECH_HIGHLIGHTS.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="tech-highlight-row">
                  <span><Icon className="h-5 w-5" /></span>
                  <div>
                    <small>{item.eyebrow}</small>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                  <em>{item.metric}</em>
                </article>
              )
            })}
          </div>
        </div>
        <div className="console-card home-architecture-card">
          <div className="console-card-header">
            <span>platform.pipeline</span>
            <strong>鼓藻鉴析 / 数据流</strong>
          </div>
          {PIPELINE.map((step, index) => (
            <div key={step.step} className="console-pipeline-row">
              <span>{step.step}</span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.sub}</p>
              </div>
              <i style={{ width: `${42 + index * 8}%` }} />
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <SectionHeading
          eyebrow="Advantages"
          title="平台优势：更适合科研与监测的识别体验"
          text="以专业、可信、可追溯为核心，让识别能力自然进入样本管理和生态分析。"
        />
        <div className="advantage-grid">
          {ADVANTAGES.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="advantage-card">
                <Icon className="h-5 w-5" />
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            )
          })}
        </div>
      </section>

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
              <EmptyState
                title={loading ? '正在读取识别记录' : '暂无识别记录'}
                text={loading ? '平台正在从数据库加载最近检测结果。' : '上传一张显微图像开始第一次鼓藻检测，完成后会在这里显示。'}
                compact
              />
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
              <EmptyState
                title="暂无分布统计"
                text="同步公开记录或保存带 GPS 的本地样本后，鼓藻属分布排行会在这里生成。"
                compact
              />
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
