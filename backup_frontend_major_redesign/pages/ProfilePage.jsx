import { useEffect, useState } from 'react'
import {
  BarChart3,
  ClipboardList,
  Eye,
  FileText,
  LogOut,
  Printer,
  UserRound,
  X,
} from 'lucide-react'
import { downloadReport, fetchHistory, fetchProfile } from '../api'
import { clearAuth } from '../auth'
import { DataTable, formatPercent, Panel, StatCard, StatusPill } from '../components/ui'

// ─── helpers ─────────────────────────────────────────────────────────────────

function getReviewStatus(item) {
  const conf = Number(item.confidence || 0)
  if (item.review_status) return item.review_status
  if (conf <= 0) return '未识别'
  if (conf < 0.8) return '待复核'
  return '已识别'
}

function getConfClass(conf) {
  const c = Number(conf || 0)
  if (c >= 0.9) return 'conf-high'
  if (c >= 0.7) return 'conf-mid'
  return 'conf-low'
}

function buildReportId(record) {
  const ts = Date.now().toString().slice(-6)
  const rid = (record?.id || record?.sample_id || ts).toString().slice(0, 8).toUpperCase()
  return `REPORT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${rid}`
}

function generateReportHtml(record, reportId, username) {
  const conf = Number(record.confidence || 0)
  const now = new Date().toLocaleString('zh-CN')
  const suggestion =
    conf >= 0.9
      ? `置信度达 ${formatPercent(conf)}，识别结果可信度高，可作为样品初筛参考，建议抽样进行人工显微核对。`
      : conf >= 0.8
      ? `置信度为 ${formatPercent(conf)}，识别结果具有参考价值，建议结合细胞形态特征进行人工核对确认。`
      : conf >= 0.7
      ? `置信度为 ${formatPercent(conf)}，结果存在一定不确定性，建议安排人工显微镜复核，或尝试提供更清晰图片重新识别。`
      : conf > 0
      ? `置信度为 ${formatPercent(conf)}，低于 70%，结果不稳定，建议重新上传更清晰的样品图像，并进行人工鉴定。`
      : '未检测到鼓藻目标，请检查图片分辨率和对焦质量后重新上传。'

  return `
    <div style="font-family:'Microsoft YaHei',Arial,sans-serif;color:#1F2937;max-width:680px;margin:0 auto;padding:2rem;background:#fff;">
      <!-- Header -->
      <div style="text-align:center;padding-bottom:1.25rem;border-bottom:2.5px solid #1CA78A;margin-bottom:1.5rem;">
        <div style="font-size:.75rem;color:#1CA78A;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.3rem;">鼓藻智析平台 · Desmid Insight Platform</div>
        <h1 style="font-size:1.4rem;font-weight:800;margin:.2rem 0;">鼓藻样品识别报告</h1>
        <div style="font-size:.78rem;color:#6B7280;margin-top:.4rem;">报告编号：${reportId} &nbsp;·&nbsp; 生成时间：${now}</div>
      </div>

      <!-- Section 1: 基础信息 -->
      <div style="margin-bottom:1.25rem;">
        <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6B7280;border-bottom:1px solid #E5E7EB;padding-bottom:.4rem;margin-bottom:.75rem;">▍ 基础信息</div>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
          ${[
            ['检测时间', record.identify_time || record.created_at || '—'],
            ['样本编号', record.sample_id || record.id || '—'],
            ['检测方式', record.inference_mode || 'YOLO11 目标检测'],
            ['操作用户', username || '—'],
            ['当前状态', getReviewStatus(record)],
          ].map(([label, value], i) => `
            <tr style="background:${i % 2 === 0 ? '#F9FAFB' : '#fff'}">
              <td style="padding:.55rem .8rem;color:#6B7280;font-weight:600;width:30%;">${label}</td>
              <td style="padding:.55rem .8rem;color:#1F2937;">${value}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <!-- Section 2: 识别结果 -->
      <div style="margin-bottom:1.25rem;">
        <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6B7280;border-bottom:1px solid #E5E7EB;padding-bottom:.4rem;margin-bottom:.75rem;">▍ 识别结果</div>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
          ${[
            ['识别物种', record.species || '—'],
            ['置信度', conf > 0 ? formatPercent(conf) : '—'],
            ['检测框数量', `${record.cell_count ?? record.detections?.length ?? 0} 个`],
            ['识别模型', 'YOLO11 目标检测模型'],
            ['图像质量评分', record.image_quality ? `${Number(record.image_quality).toFixed(1)} 分` : '未评估'],
          ].map(([label, value], i) => `
            <tr style="background:${i % 2 === 0 ? '#F9FAFB' : '#fff'}">
              <td style="padding:.55rem .8rem;color:#6B7280;font-weight:600;width:30%;">${label}</td>
              <td style="padding:.55rem .8rem;color:#1F2937;font-weight:600;">${value}</td>
            </tr>
          `).join('')}
        </table>
        ${record.result_image_url || record.image_url ? `
          <div style="margin-top:.75rem;font-size:.78rem;color:#6B7280;word-break:break-all;">
            结果图路径：${record.result_image_url || record.image_url}
          </div>
        ` : ''}
      </div>

      <!-- Section 3: 图像质量 -->
      <div style="margin-bottom:1.25rem;">
        <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6B7280;border-bottom:1px solid #E5E7EB;padding-bottom:.4rem;margin-bottom:.75rem;">▍ 图像质量说明</div>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
          ${[
            ['质量评分', record.image_quality ? `${Number(record.image_quality).toFixed(1)} / 100` : '未评估（图像未进行质量分析）'],
            ['分辨率', record.image_width ? `${record.image_width} × ${record.image_height} px` : '未记录'],
            ['采集建议', conf < 0.8 && conf > 0 ? '建议提高对焦精度或增大显微倍率后重新采样' : '图像质量满足基本识别需求'],
          ].map(([label, value], i) => `
            <tr style="background:${i % 2 === 0 ? '#F9FAFB' : '#fff'}">
              <td style="padding:.55rem .8rem;color:#6B7280;font-weight:600;width:30%;">${label}</td>
              <td style="padding:.55rem .8rem;color:#1F2937;">${value}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <!-- Section 4: 识别建议 -->
      <div style="margin-bottom:1.25rem;">
        <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6B7280;border-bottom:1px solid #E5E7EB;padding-bottom:.4rem;margin-bottom:.75rem;">▍ 识别建议</div>
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:.9rem 1rem;font-size:.9rem;line-height:1.75;color:#14532D;">
          ${suggestion}
        </div>
      </div>

      <!-- Disclaimer -->
      <div style="margin-top:1.5rem;padding:.75rem;border-top:1px solid #E5E7EB;font-size:.76rem;color:#9CA3AF;text-align:center;line-height:1.7;">
        本报告由鼓藻智析平台基于 YOLO11 图像识别模型自动生成，仅用于科研辅助识别与样品初筛，<br/>
        最终鉴定结论请结合人工鉴定和实验室复核，不应单独作为科学论文或监管决策的依据。
      </div>
    </div>
  `
}

// ─── iframe print ─────────────────────────────────────────────────────────────

function printViaIframe(htmlContent) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:840px;height:600px;border:0;visibility:hidden;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open()
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>鼓藻样品识别报告</title>
      <style>
        @page { margin: 18mm; }
        body { margin: 0; font-family: "Microsoft YaHei", Arial, sans-serif; }
        * { box-sizing: border-box; }
      </style>
    </head><body>${htmlContent}</body></html>`)
    doc.close()

    iframe.contentWindow.onafterprint = () => {
      document.body.removeChild(iframe)
      resolve()
    }

    // Fallback cleanup after 60 s in case onafterprint doesn't fire
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe)
      resolve()
    }, 60000)

    iframe.contentWindow.focus()
    iframe.contentWindow.print()
  })
}

// ─── report modal ─────────────────────────────────────────────────────────────

function ReportModal({ record, reportId, username, onClose, onPrinted }) {
  const conf = Number(record.confidence || 0)

  const handlePrint = async () => {
    const html = generateReportHtml(record, reportId, username)
    await printViaIframe(html)
    onPrinted?.()
  }

  const handleExportPdf = async () => {
    const resultId = record.result_id || record.id
    if (resultId) {
      try {
        await downloadReport(resultId, 'pdf')
        onPrinted?.()
        return
      } catch {
        // fall through to iframe print
      }
    }
    await handlePrint()
  }

  return (
    <div className="report-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="report-modal">
        <div className="report-modal-header">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            <h2>识别报告预览</h2>
            <span style={{ color: 'var(--text-3)', fontSize: '.78rem', fontWeight: 400 }}>{reportId}</span>
          </div>
          <button className="action-btn action-btn-secondary" onClick={onClose}>
            <X className="h-3.5 w-3.5" />关闭
          </button>
        </div>

        <div className="report-modal-body">
          {/* Live preview in modal */}
          <div className="report-preview">
            <div className="report-preview-title">
              <div style={{ fontSize: '.72rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.25rem' }}>
                鼓藻智析平台 · Desmid Insight Platform
              </div>
              <h3>鼓藻样品识别报告</h3>
              <p>报告编号：{reportId} &nbsp;·&nbsp; 生成时间：{new Date().toLocaleString('zh-CN')}</p>
            </div>

            {/* Section 1: 基础信息 */}
            <div className="report-section">
              <div className="report-section-title"><span className="dot" />基础信息</div>
              <div className="report-field-grid">
                <div className="report-field">
                  <div className="report-field-label">检测时间</div>
                  <div className="report-field-value">{record.identify_time || record.created_at || '—'}</div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">样本编号</div>
                  <div className="report-field-value">{record.sample_id || record.id || '—'}</div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">检测方式</div>
                  <div className="report-field-value">{record.inference_mode || 'YOLO11 目标检测'}</div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">操作用户</div>
                  <div className="report-field-value">{username || '—'}</div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">记录状态</div>
                  <div className="report-field-value"><StatusPill status={getReviewStatus(record)} /></div>
                </div>
              </div>
            </div>

            {/* Section 2: 识别结果 */}
            <div className="report-section">
              <div className="report-section-title"><span className="dot" />识别结果</div>
              <div className="report-field-grid">
                <div className="report-field">
                  <div className="report-field-label">识别物种</div>
                  <div className="report-field-value" style={{ fontSize: '1rem' }}>{record.species || '—'}</div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">置信度</div>
                  <div className={`report-field-value ${getConfClass(conf)}`} style={{ fontSize: '1.1rem' }}>
                    {conf > 0 ? formatPercent(conf) : '—'}
                  </div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">检测框数量</div>
                  <div className="report-field-value">{record.cell_count ?? record.detections?.length ?? 0} 个</div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">识别模型</div>
                  <div className="report-field-value">YOLO11</div>
                </div>
                {(record.result_image_url || record.image_url) && (
                  <div className="report-field report-field-full">
                    <div className="report-field-label">结果图路径</div>
                    <div className="report-field-value" style={{ fontWeight: 400, fontSize: '.82rem', wordBreak: 'break-all' }}>
                      {record.result_image_url || record.image_url}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: 图像质量 */}
            <div className="report-section">
              <div className="report-section-title"><span className="dot" />图像质量</div>
              <div className="report-field-grid">
                <div className="report-field">
                  <div className="report-field-label">质量评分</div>
                  <div className="report-field-value">
                    {record.image_quality ? `${Number(record.image_quality).toFixed(1)} / 100` : '未评估'}
                  </div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">分辨率</div>
                  <div className="report-field-value">
                    {record.image_width ? `${record.image_width}×${record.image_height} px` : '未记录'}
                  </div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">图像来源</div>
                  <div className="report-field-value">{record.image_source || '显微拍摄上传'}</div>
                </div>
                <div className="report-field">
                  <div className="report-field-label">重采建议</div>
                  <div className="report-field-value" style={{ color: conf < 0.8 && conf > 0 ? 'var(--warning)' : 'var(--success)' }}>
                    {conf < 0.8 && conf > 0 ? '建议重新采样' : '图像满足要求'}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: 识别建议 */}
            <div className="report-section">
              <div className="report-section-title"><span className="dot" />识别建议</div>
              <div style={{
                background: conf >= 0.8 ? '#F0FDF4' : conf >= 0.7 ? '#FFFBEB' : '#FEF2F2',
                border: `1px solid ${conf >= 0.8 ? '#BBF7D0' : conf >= 0.7 ? '#FDE68A' : '#FECACA'}`,
                borderRadius: '8px',
                padding: '.9rem 1rem',
                fontSize: '.9rem',
                lineHeight: 1.75,
                color: conf >= 0.8 ? '#14532D' : conf >= 0.7 ? '#78350F' : '#7F1D1D',
              }}>
                {conf >= 0.9
                  ? `置信度达 ${formatPercent(conf)}，识别结果可信度较高，可作为样品初筛参考，建议抽样进行人工显微核对。`
                  : conf >= 0.8
                  ? `置信度为 ${formatPercent(conf)}，识别结果具有参考价值，建议结合细胞形态特征进行人工核对确认。`
                  : conf >= 0.7
                  ? `置信度为 ${formatPercent(conf)}，结果存在一定不确定性，建议安排人工显微镜复核，或尝试提供更清晰图片重新识别。`
                  : conf > 0
                  ? `置信度为 ${formatPercent(conf)}，低于 70%，结果不稳定，建议重新上传更清晰的样品图像，并进行人工鉴定。`
                  : '未检测到鼓藻目标，请检查图片分辨率和对焦质量后重新上传。'}
              </div>
            </div>

            <div className="report-footer-note">
              本报告由鼓藻智析平台基于 YOLO11 图像识别模型自动生成，仅用于科研辅助识别与样品初筛，
              最终鉴定结论请结合人工鉴定和实验室复核，不应单独作为科学论文或监管决策的依据。
            </div>
          </div>
        </div>

        <div className="report-modal-footer">
          <button className="action-btn action-btn-secondary" onClick={onClose}>关闭</button>
          <button className="action-btn action-btn-secondary" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" />打印报告
          </button>
          <button className="action-btn action-btn-primary" onClick={handleExportPdf}>
            <FileText className="h-3.5 w-3.5" />导出 PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── detail modal ─────────────────────────────────────────────────────────────

function DetailModal({ record, onClose, onGenerateReport }) {
  const conf = Number(record.confidence || 0)
  return (
    <div className="detail-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-modal">
        <div className="report-modal-header">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            <h2>识别记录详情</h2>
          </div>
          <button className="action-btn action-btn-secondary" onClick={onClose}>
            <X className="h-3.5 w-3.5" />关闭
          </button>
        </div>
        <div className="report-modal-body">
          <div className="report-field-grid">
            {[
              ['检测时间', record.identify_time || record.created_at || '—'],
              ['样本编号', record.sample_id || record.id || '—'],
              ['识别物种', record.species || '—'],
              ['置信度', conf > 0 ? formatPercent(conf) : '—'],
              ['检测框数量', `${record.cell_count ?? record.detections?.length ?? 0} 个`],
              ['识别方式', record.inference_mode || '—'],
              ['当前状态', getReviewStatus(record)],
              ['图像质量', record.image_quality ? `${Number(record.image_quality).toFixed(1)}` : '未评估'],
              ['采样地点', record.location || '—'],
              ['GPS 坐标', record.gps || '—'],
            ].map(([label, value]) => (
              <div key={label} className="report-field">
                <div className="report-field-label">{label}</div>
                <div className="report-field-value">{value}</div>
              </div>
            ))}
            {(record.result_image_url || record.image_url) && (
              <div className="report-field report-field-full">
                <div className="report-field-label">结果图</div>
                <div className="report-field-value">
                  <a className="link-button" href={record.result_image_url || record.image_url} target="_blank" rel="noreferrer">
                    查看结果图
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="report-modal-footer">
          <button className="action-btn action-btn-secondary" onClick={onClose}>关闭</button>
          <button className="action-btn action-btn-primary" onClick={() => { onClose(); onGenerateReport(record) }}>
            <FileText className="h-3.5 w-3.5" />生成报告
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

function loadRecentReports() {
  try { return JSON.parse(localStorage.getItem('desmid_recent_reports') || '[]') } catch { return [] }
}
function saveRecentReports(list) {
  try { localStorage.setItem('desmid_recent_reports', JSON.stringify(list)) } catch {}
}

export default function ProfilePage({ auth, onAuthChange, onNotify }) {
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportState, setReportState] = useState(null)  // { record, reportId }
  const [detailRecord, setDetailRecord] = useState(null)
  const [recentReports, setRecentReports] = useState(loadRecentReports)

  useEffect(() => {
    if (!auth?.token) return
    setLoading(true)
    Promise.all([fetchProfile(), fetchHistory()])
      .then(([p, h]) => {
        setProfile(p)
        setHistory(h?.items || h?.records || [])
      })
      .catch((error) => onNotify?.('error', error.message))
      .finally(() => setLoading(false))
  }, [onNotify, auth?.token])

  const username = profile?.user?.display_name || auth?.user?.display_name || auth?.user?.username || ''

  const handleGenerateReport = (record) => {
    const reportId = buildReportId(record)
    setReportState({ record, reportId })
    // Add to recent reports list
    const entry = {
      reportId,
      species: record.species || '—',
      generatedAt: new Date().toLocaleString('zh-CN'),
      confidence: record.confidence,
      sampleId: record.sample_id || record.id || '—',
      record,
    }
    const updated = [entry, ...recentReports].slice(0, 20)
    setRecentReports(updated)
    saveRecentReports(updated)
  }

  if (!auth?.token) {
    return (
      <div className="grid gap-6">
        <div className="page-header">
          <div>
            <p className="eyebrow"><UserRound className="h-4 w-4" />个人中心</p>
            <h1>请先登录账户</h1>
            <p>登录后可查看识别记录、统计数据，并在每条记录后生成与打印识别报告。</p>
          </div>
        </div>
        <Panel>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>请点击右上角"登录"进入账户。</p>
        </Panel>
      </div>
    )
  }

  const summary = profile?.summary || {}
  const recent = profile?.recent || []
  const allRecords = history.length ? history : recent
  const displayName = profile?.user?.display_name || auth?.user?.display_name || auth?.user?.username || '研究人员'

  const handleLogout = () => {
    clearAuth()
    onAuthChange?.(null)
    onNotify?.('success', '已退出登录。')
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="eyebrow"><UserRound className="h-4 w-4" />个人中心</p>
          <h1>{displayName} 的工作台</h1>
          <p>当前账户的识别记录、统计数据与报告管理。</p>
        </div>
        <button className="secondary-button px-4 py-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />退出登录
        </button>
      </div>

      {/* User info + stats */}
      <div className="workbench-grid">
        <div className="user-info-card">
          <div className="user-avatar"><UserRound className="h-7 w-7" /></div>
          <div className="user-name">{displayName}</div>
          <div className="user-role">{profile?.user?.role || '普通用户'}</div>
          <div className="mt-5">
            {[
              ['用户名', profile?.user?.username || auth?.user?.username || '—'],
              ['注册时间', profile?.user?.created_at || '—'],
              ['最近登录', profile?.user?.last_login || '—'],
            ].map(([label, value]) => (
              <div key={label} className="stat-row">
                <span>{label}</span><strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 content-start">
          <StatCard label="识别总次数" value={summary.identification_total || 0} hint="账户全部记录" />
          <StatCard label="平均置信度" value={formatPercent(summary.average_confidence || 0)} hint="真实识别统计" />
          <StatCard label="平均图像质量" value={summary.average_quality ? `${Number(summary.average_quality).toFixed(1)}` : '—'} hint="质量评分均值" />
          <StatCard label="反馈记录数" value={summary.feedback_total || 0} hint="已提交复核" />
          <StatCard label="人工确认准确率" value={formatPercent(summary.accuracy_rate || 0)} hint="基于已反馈记录" />
          <StatCard label="低置信度样本" value={summary.low_confidence_count || 0} hint="低于 80%" />
        </div>
      </div>

      {/* History table */}
      <Panel>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="panel-title">
            <ClipboardList className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            我的识别记录
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
            点击"查看详情"或"生成报告"操作每条记录
          </span>
        </div>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>正在读取账户数据…</p>
        ) : allRecords.length ? (
          <DataTable
            headers={['时间', '样本编号', '识别物种', '置信度', '检测数', '识别方式', '状态', '操作']}
            rows={allRecords.map((item) => {
              const conf = Number(item.confidence || 0)
              return [
                item.identify_time || item.created_at || '—',
                item.sample_id || '—',
                item.species || '—',
                <span className={getConfClass(conf)}>{conf > 0 ? formatPercent(conf) : '—'}</span>,
                item.cell_count ?? item.detections?.length ?? 0,
                item.inference_mode || '—',
                <StatusPill status={getReviewStatus(item)} />,
                <div className="action-btn-group">
                  <button className="action-btn action-btn-secondary" onClick={() => setDetailRecord(item)}>
                    <Eye className="h-3 w-3" />详情
                  </button>
                  <button className="action-btn action-btn-primary" onClick={() => handleGenerateReport(item)}>
                    <FileText className="h-3 w-3" />生成报告
                  </button>
                </div>,
              ]
            })}
            minWidth={1020}
          />
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            当前账户还没有识别记录。上传一张显微图开始第一次检测。
          </p>
        )}
      </Panel>

      {/* Recent generated reports */}
      <Panel>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="panel-title">
            <FileText className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            最近生成的报告
          </h2>
          {recentReports.length > 0 && (
            <button
              className="action-btn action-btn-secondary"
              onClick={() => { setRecentReports([]); saveRecentReports([]) }}
              style={{ fontSize: '.76rem' }}
            >
              清空记录
            </button>
          )}
        </div>
        {recentReports.length ? (
          <div className="grid gap-2">
            {recentReports.map((r) => (
              <div key={r.reportId} className="recent-report-row">
                <div className="recent-report-meta">
                  <div className="recent-report-id">{r.reportId}</div>
                  <div className="recent-report-detail">
                    {r.species} &nbsp;·&nbsp; 置信度 {r.confidence > 0 ? formatPercent(r.confidence) : '—'} &nbsp;·&nbsp; 生成时间：{r.generatedAt}
                  </div>
                </div>
                <div className="recent-report-actions">
                  <button
                    className="action-btn action-btn-secondary"
                    onClick={() => setDetailRecord(r.record)}
                  >
                    <Eye className="h-3 w-3" />查看
                  </button>
                  <button
                    className="action-btn action-btn-primary"
                    onClick={() => setReportState({ record: r.record, reportId: r.reportId })}
                  >
                    <Printer className="h-3 w-3" />重新打印
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            暂无已生成报告。在上方识别记录后点击"生成报告"即可创建，报告记录会保存在本地浏览器中。
          </p>
        )}
      </Panel>

      {/* Report modal */}
      {reportState && (
        <ReportModal
          record={reportState.record}
          reportId={reportState.reportId}
          username={username}
          onClose={() => setReportState(null)}
          onPrinted={() => onNotify?.('success', '报告已发送至打印队列。')}
        />
      )}

      {/* Detail modal */}
      {detailRecord && (
        <DetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          onGenerateReport={handleGenerateReport}
        />
      )}
    </div>
  )
}
