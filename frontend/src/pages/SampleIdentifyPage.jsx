import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FolderUp,
  Image as ImageIcon,
  Layers,
  Plus,
  Save,
  ScanSearch,
  Table2,
  UploadCloud,
  XCircle,
} from 'lucide-react'
import {
  createReviewRecord,
  downloadBatchReport,
  downloadReport,
  fetchDesmidGenera,
  predictImage,
  runBatchAnalysis,
  saveSampleRecord,
} from '../api'
import {
  BarList,
  DataTable,
  downloadCsv,
  EmptyState,
  Field,
  formatPercent,
  Panel,
  ProgressBar,
  SelectInput,
  StatCard,
  StatusPill,
  TextArea,
  TextInput,
} from '../components/ui'
import { useEffect } from 'react'

// ─── helpers ─────────────────────────────────────────────────────────────────

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp']

function checkFileQuality(file) {
  const warnings = []
  if (file.size > 8 * 1024 * 1024) warnings.push('文件较大（>8 MB），可能影响上传速度')
  if (file.size < 20 * 1024) warnings.push('文件过小（<20 KB），可能分辨率不足，建议使用原始显微图')
  if (file.type === 'image/bmp') warnings.push('BMP 格式未压缩，建议转为 PNG 以减小体积')
  return warnings
}

function morphologyListText(items) {
  if (!Array.isArray(items)) return ''
  const preferred = items.find((item) => item?.label?.includes('形态')) || items[0]
  return preferred?.value || ''
}

function predictionMorphologyText(payload) {
  if (typeof payload?.analysis?.morphology === 'string' && payload.analysis.morphology.trim()) return payload.analysis.morphology
  if (typeof payload?.morphology === 'string' && payload.morphology.trim()) return payload.morphology
  return morphologyListText(payload?.morphology) || payload?.description || payload?.structure || '模型未返回具体形态描述，请结合检测框和显微原图人工复核。'
}

function aiValue(value, fallback = '') {
  if (Array.isArray(value)) return value.filter(Boolean).join('、') || fallback
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value || fallback || '').trim()
}

function normalizePrediction(payload, preview, form) {
  const detections = Array.isArray(payload?.detections) ? payload.detections : []
  const candidates = (Array.isArray(payload?.species_ranking) && payload.species_ranking.length
    ? payload.species_ranking
    : payload?.alternatives || [])
    .map((item) => ({ ...item, confidence: Number(item?.confidence || 0) }))
    .sort((a, b) => b.confidence - a.confidence)
  const hasResult = detections.length > 0 || candidates.length > 0 || Number(payload?.confidence || 0) > 0
  const species = hasResult ? (payload?.species || candidates[0]?.species || detections[0]?.label) : '未检测到鼓藻目标'
  const confidence = hasResult ? Number(payload?.confidence ?? candidates[0]?.confidence ?? detections[0]?.confidence ?? 0) : 0
  const ai = payload?.analysis?.ai || {}
  return {
    resultId: payload?.result_id || '',
    sampleId: payload?.sample_record_id || payload?.result_id || form.sampleId,
    originalImageUrl: preview || payload?.original_image_url || '',
    resultImageUrl: payload?.result_image_url || payload?.image_url || preview || '',
    species,
    latin: hasResult ? (payload?.scientific_name || candidates[0]?.scientific_name || species) : 'Unknown',
    confidence,
    candidates,
    elapsed: payload?.elapsed || payload?.processing_time || '-',
    detectedAt: new Date().toLocaleString('zh-CN'),
    detections,
    detectionCount: detections.length,
    message: payload?.message || (hasResult ? '' : '未检测到鼓藻目标，请更换更清晰图片或降低置信度。'),
    aiSource: ai.sourceLabel || '本地规则分析',
    aiSummary: aiValue(ai.summary, payload?.analysis?.summary || ''),
    aiError: ai.error ? 'AI 复核暂不可用，已使用本地 YOLO 结果；不影响识别、排序和报告导出。' : '',
    morphology: {
      shape: aiValue(ai.shape, hasResult ? predictionMorphologyText(payload) : '当前图片中没有达到置信度阈值的鼓藻检测框。'),
      symmetry: aiValue(ai.symmetry, hasResult ? '沿主要轴线呈稳定对称，需结合完整细胞轮廓确认。' : '无法从空检测结果中判断。'),
      isthmus: aiValue(ai.isthmus, hasResult ? '请结合检测框内细胞形态人工复核。' : '未检测到可分析目标。'),
      edge: aiValue(ai.edge, hasResult ? '边缘特征来自模型检测框定位结果。' : '建议提高对焦、减少杂质遮挡后重新上传。'),
      similar: aiValue(ai.similar, '未启用相似种推断'),
      basis: aiValue(ai.basis, hasResult ? '依据本地 YOLO 模型真实推理结果。' : 'YOLO 模型未返回目标框。'),
      reviewSuggestion: aiValue(ai.reviewSuggestion, hasResult && confidence >= 0.8 ? '可抽样人工复核' : '建议人工复核'),
    },
  }
}

function normalizeBatchItems(items) {
  return items
    .map((item) => {
      const candidates = (Array.isArray(item.species_ranking) && item.species_ranking.length
        ? item.species_ranking
        : item.alternatives || [])
        .map((c) => ({ ...c, confidence: Number(c?.confidence || 0) }))
        .sort((a, b) => b.confidence - a.confidence)
      const conf = Number(item.confidence || 0)
      return {
        imageName: item.imageName || item.name || '未知',
        species: item.species || '未识别',
        confidence: conf,
        candidateText: candidates.slice(0, 3).map((c, i) => `${i + 1}. ${c.species} ${formatPercent(c.confidence)}`).join('；'),
        similar: item.similar || candidates.slice(1, 4).map((c) => c.species).join('、') || '-',
        processingTime: item.processingTime || item.time || '-',
        reviewStatus: conf > 0 && conf < 0.8 ? '待复核' : conf >= 0.8 ? '已识别' : '未识别',
        status: conf > 0 && conf < 0.8 ? '低置信度' : conf >= 0.8 ? '已识别' : '识别失败',
      }
    })
    .sort((a, b) => b.confidence - a.confidence)
}

const defaultForm = {
  sampleId: '', location: '', gps: '', waterType: '湖泊',
  magnification: '', staining: '', device: '', remark: '',
}

// ─── main component ───────────────────────────────────────────────────────────

const DETECT_STEPS = [
  { label: '图片上传', key: 'upload' },
  { label: '质量检查', key: 'quality' },
  { label: 'YOLO11 检测', key: 'detect' },
  { label: '结果归档', key: 'archive' },
]

export default function SampleIdentifyPage({ onNotify }) {
  const [mode, setMode] = useState('single')

  return (
    <div className="grid gap-5">
      {/* Page header */}
      <div className="page-intro">
        <div>
          <div className="eyebrow"><ScanSearch className="h-4 w-4" />样品识别</div>
          <h1>{mode === 'single' ? '显微图像检测分析' : '批量图像检测'}</h1>
          <p style={{ marginTop: '.4rem', color: 'var(--text-2)', fontSize: '.9rem' }}>
            {mode === 'single'
              ? '上传显微图片，YOLO11 实时检测鼓藻属类，返回置信度排序与形态解析。'
              : '批量上传显微图片，自动完成检测汇总，支持 CSV / PDF 报告导出。'}
          </p>
        </div>
        <div className="mode-switcher">
          <button className={`mode-tab${mode === 'single' ? ' mode-tab-active' : ''}`} onClick={() => setMode('single')}>
            <UploadCloud className="h-4 w-4" />单张识别
          </button>
          <button className={`mode-tab${mode === 'batch' ? ' mode-tab-active' : ''}`} onClick={() => setMode('batch')}>
            <Layers className="h-4 w-4" />批量识别
          </button>
        </div>
      </div>

      {/* Step indicator (single mode only) */}
      {mode === 'single' && (
        <div className="panel" style={{ padding: '.75rem 1rem' }}>
          <div className="detect-steps">
            {DETECT_STEPS.map((step, index) => (
              <div key={step.key} className="detect-step-wrap">
                <div className="detect-step detect-step-active">
                  <div className="detect-step-num">{String(index + 1).padStart(2, '0')}</div>
                  <div className="detect-step-label">{step.label}</div>
                </div>
                {index < DETECT_STEPS.length - 1 && <div className="detect-step-line" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'single' ? <SingleMode onNotify={onNotify} /> : <BatchMode onNotify={onNotify} />}
    </div>
  )
}

// ─── single mode ──────────────────────────────────────────────────────────────

function SingleMode({ onNotify }) {
  const [form, setForm] = useState(defaultForm)
  const [files, setFiles] = useState([])
  const [preview, setPreview] = useState('')
  const [fileInfo, setFileInfo] = useState(null)
  const [qualityWarnings, setQualityWarnings] = useState([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [confirmedSpecies, setConfirmedSpecies] = useState('')
  const [syncDistribution, setSyncDistribution] = useState(false)
  const [genera, setGenera] = useState([])

  const reviewStatus = !result
    ? '等待识别'
    : result.confidence <= 0
    ? '未检测到'
    : result.detectionCount === 0
    ? 'AI候选待复核'
    : result.confidence < 0.8
    ? '建议人工复核'
    : '可抽样复核'

  useEffect(() => {
    fetchDesmidGenera()
      .then((p) => setGenera(p.items || []))
      .catch(() => setGenera([]))
  }, [])

  const updateForm = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleFile = (event) => {
    const nextFiles = Array.from(event.target.files || [])
    if (!nextFiles.length) return
    const invalid = nextFiles.find((f) => !ACCEPTED.includes(f.type))
    if (invalid) { onNotify('error', '仅支持 PNG、JPG、WEBP、BMP 显微图像。'); return }
    const file = nextFiles[0]
    const url = URL.createObjectURL(file)
    setFiles(nextFiles)
    setPreview(url)
    setResult(null)
    setConfirmedSpecies('')
    setQualityWarnings(checkFileQuality(file))
    // Get image dimensions
    const img = new Image()
    img.onload = () => setFileInfo({ name: file.name, size: file.size, width: img.naturalWidth, height: img.naturalHeight, type: file.type })
    img.src = url
  }

  const runRecognition = async () => {
    if (!files.length) { onNotify('error', '请先选择显微样本图片。'); return }
    setBusy(true)
    setProgress(8)
    try {
      const payload = await predictImage(files[0], setProgress)
      const nextResult = normalizePrediction(payload, preview, form)
      setResult(nextResult)
      setConfirmedSpecies(nextResult.confidence > 0 ? nextResult.species : '')
      onNotify('success', nextResult.confidence > 0 ? '识别完成，候选种类已按置信度排序。' : '识别完成，未检测到鼓藻目标。')
    } catch (error) {
      setProgress(100)
      onNotify('error', error.message)
    } finally {
      setBusy(false)
    }
  }

  const saveRecord = async () => {
    if (!result) { onNotify('error', '请先完成一次识别。'); return }
    try {
      await saveSampleRecord({ sample_info: form, recognition: { ...result, species: confirmedSpecies || result.species }, sync_distribution: syncDistribution })
      onNotify('success', syncDistribution ? '已保存；填写 GPS 坐标时才同步到分布图谱。' : '已保存到采样记录。')
    } catch (error) {
      onNotify('error', error.message || '保存失败。')
    }
  }

  const review = async (verdict) => {
    if (!result) { onNotify('error', '请先完成一次识别。'); return }
    try {
      await createReviewRecord({ sample_record_id: result.sampleId, result_id: result.sampleId, verdict })
      onNotify('success', verdict === 'correct' ? '已标记为正确。' : '已标记为错误并加入复核队列。')
    } catch (error) {
      onNotify('error', error.message || '复核记录保存失败。')
    }
  }

  const exportPdf = async () => {
    if (!result?.resultId) { onNotify('error', '请先完成一次识别。'); return }
    try {
      await downloadReport(result.resultId, 'pdf')
      onNotify('success', '单图 PDF 报告已导出。')
    } catch (error) {
      onNotify('error', error.message || '单图 PDF 报告导出失败。')
    }
  }

  return (
    <section className="identify-grid">
      {/* Upload + sample info */}
      <Panel>
        <h2 className="panel-title">
          <UploadCloud className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          上传图片与样本信息
        </h2>
        <label className="upload-zone mt-4">
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <ImageIcon className="h-9 w-9" style={{ color: 'var(--primary)' }} />
          <strong>{files.length ? files[0].name : '点击或拖拽上传显微图像'}</strong>
          <span>支持 PNG、JPG、WEBP、BMP；建议使用原始高分辨率显微图</span>
        </label>

        {fileInfo && (
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
            <div className="info-line" style={{ minHeight: 'auto', padding: '.45rem .75rem' }}>
              <span>文件大小</span>
              <strong>{(fileInfo.size / 1024).toFixed(0)} KB</strong>
            </div>
            <div className="info-line" style={{ minHeight: 'auto', padding: '.45rem .75rem' }}>
              <span>分辨率</span>
              <strong>{fileInfo.width} × {fileInfo.height}</strong>
            </div>
            <div className="info-line" style={{ minHeight: 'auto', padding: '.45rem .75rem' }}>
              <span>格式</span>
              <strong>{fileInfo.type.split('/')[1].toUpperCase()}</strong>
            </div>
            <div className="info-line" style={{ minHeight: 'auto', padding: '.45rem .75rem' }}>
              <span>质量判断</span>
              <strong style={{ color: qualityWarnings.length ? 'var(--warning)' : 'var(--success)' }}>
                {qualityWarnings.length ? '需注意' : '正常'}
              </strong>
            </div>
          </div>
        )}
        {qualityWarnings.length > 0 && (
          <div className="mt-2 grid gap-1">
            {qualityWarnings.map((w) => (
              <div key={w} className="file-warning"><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />{w}</div>
            ))}
          </div>
        )}
        {files.length > 0 && qualityWarnings.length === 0 && (
          <div className="file-ok mt-2"><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />图片格式与大小正常，可直接识别</div>
        )}

        <div className="mt-4 grid gap-3">
          <Field label="样本编号"><TextInput value={form.sampleId} onChange={(e) => updateForm('sampleId', e.target.value)} /></Field>
          <Field label="采样地点"><TextInput value={form.location} onChange={(e) => updateForm('location', e.target.value)} /></Field>
          <Field label="GPS 坐标"><TextInput value={form.gps} onChange={(e) => updateForm('gps', e.target.value)} placeholder="30.5928, 114.3055（不填则不进地图）" /></Field>
          <Field label="水体类型">
            <SelectInput value={form.waterType} onChange={(e) => updateForm('waterType', e.target.value)}>
              <option>浅水湿地</option><option>湖泊</option><option>池塘</option><option>水田</option><option>沟渠</option>
            </SelectInput>
          </Field>
          <Field label="显微倍率"><TextInput value={form.magnification} onChange={(e) => updateForm('magnification', e.target.value)} /></Field>
          <Field label="染色方式"><TextInput value={form.staining} onChange={(e) => updateForm('staining', e.target.value)} /></Field>
          <Field label="拍摄设备"><TextInput value={form.device} onChange={(e) => updateForm('device', e.target.value)} /></Field>
          <Field label="备注"><TextArea value={form.remark} onChange={(e) => updateForm('remark', e.target.value)} /></Field>
        </div>
        <button className="primary-button mt-5 w-full px-5 py-3" onClick={runRecognition} disabled={busy}>
          <ScanSearch className="h-5 w-5" />
          {busy ? '检测处理中…' : '开始样品识别'}
        </button>
        {busy && <div className="mt-4"><ProgressBar value={progress} color="var(--primary)" /></div>}
      </Panel>

      {/* Results */}
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <h2 className="panel-title">
            <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            检测结果
          </h2>
          <StatusPill status={reviewStatus} />
        </div>
        <div className="result-image-grid mt-4">
          <figure className="result-figure">
            <span>原图</span>
            {preview ? <img src={preview} alt="原始样本" /> : <EmptyPreview />}
          </figure>
          <figure className="result-figure">
            <span>识别结果图</span>
            {result?.resultImageUrl ? <img src={result.resultImageUrl} alt="带框识别结果" /> : <EmptyPreview />}
          </figure>
        </div>

        {result ? (
          <>
            <div className="mt-5 grid gap-4">
              <ResultMetric label="识别类别" value={`${result.species} / ${result.latin}`} />
              <ResultMetric label="最高置信度" value={result.confidence > 0 ? formatPercent(result.confidence) : '-'} />
              <ResultMetric label="检测时间" value={result.detectedAt} />
              <ResultMetric label="检测框数量" value={`${result.detectionCount} 个`} />
              <ResultMetric label="处理耗时" value={result.elapsed} />
            </div>
            <div className="mt-5">
              <h3 className="mb-3 font-bold" style={{ color: 'var(--text)' }}>候选种类排序</h3>
              {result.candidates.length ? (
                <div className="grid gap-3">
                  {result.candidates.map((item, i) => (
                    <div key={`${item.species}-${i}`} className="candidate-row">
                      <div className="flex justify-between gap-3">
                        <span>{i + 1}. {item.species}</span>
                        <strong>{formatPercent(item.confidence)}</strong>
                      </div>
                      <p className="mt-2 text-xs" style={{ color: 'var(--text-2)' }}>{item.scientific_name || 'Unknown'} · {item.source || 'YOLO'}</p>
                      {item.reason && <p className="mt-2 text-xs" style={{ color: 'var(--text-2)' }}>{item.reason}</p>}
                      <ProgressBar value={item.confidence} color={item.confidence < 0.8 ? '#D97706' : '#1CA78A'} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-detection mt-3">{result.message}</div>
              )}
            </div>
            {result.detections.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-3 font-bold" style={{ color: 'var(--text)' }}>检测框列表</h3>
                <div className="grid gap-3">
                  {result.detections.map((item, i) => (
                    <div key={`${item.label}-${i}`} className="candidate-row">
                      <div className="flex justify-between gap-3">
                        <span>{i + 1}. {item.label}</span>
                        <strong>{formatPercent(item.confidence)}</strong>
                      </div>
                      <p className="mt-2 text-xs" style={{ color: 'var(--text-2)' }}>bbox: [{item.bbox.map((v) => Number(v).toFixed(1)).join(', ')}]</p>
                      <ProgressBar value={item.confidence} color={item.confidence < 0.8 ? '#D97706' : '#1CA78A'} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="等待检测结果"
            text="上传图片并点击开始样品识别后，这里会显示带框结果图、识别类别、置信度和检测时间。"
            compact
          />
        )}
      </Panel>

      {/* Morphology + actions */}
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <h2 className="panel-title">
            <AlertTriangle className="h-5 w-5" style={{ color: 'var(--warning)' }} />
            结果说明与样本归档
          </h2>
          {result?.aiSource && <span className="mini-tag">{result.aiSource}</span>}
        </div>

        {result ? (
          <div className="mt-4 grid gap-3">
            {result.aiSummary && <Explain label="识别建议摘要" value={result.aiSummary} />}
            <Explain label="智能辅助说明" value="系统将根据图像特征提取结果，结合模型识别类别与置信度，辅助用户判断鼓藻样本类型。识别结果仅作为智能辅助参考，最终鉴定可结合人工复核与实验条件综合判断。" />
            <Explain label="细胞形态" value={result.morphology.shape} />
            <Explain label="对称性" value={result.morphology.symmetry} />
            <Explain label="细胞缢缝" value={result.morphology.isthmus} />
            <Explain label="边缘特征" value={result.morphology.edge} />
            <Explain label="相似物种" value={result.morphology.similar} />
            <Explain label="区分依据" value={result.morphology.basis} />
            <Explain label="复核建议" value={result.morphology.reviewSuggestion} />
            <Explain label="建议说明" value={result.confidence >= 0.8 ? '当前识别置信度较高，可作为样本初筛和归档参考，建议保留原始显微图并抽样复核。' : '当前结果存在不确定性，建议重新检查对焦、倍率和杂质遮挡情况，并安排人工显微复核。'} />
            {result.aiError && <Explain label="解析状态说明" value={result.aiError} />}
          </div>
        ) : (
          <div className="no-detection mt-4">完成识别后，这里会展示形态解析、复核建议和样本归档操作。</div>
        )}

        <div className="mt-5 grid gap-2">
          <label className="field">
            <span>人工确认物种</span>
            <select className="form-input" value={confirmedSpecies} disabled={!result?.confidence} onChange={(e) => setConfirmedSpecies(e.target.value)}>
              <option value="">待确认</option>
              {genera.map((item) => <option key={item.id}>{item.chinese_name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border)', background: '#F9FAFB', color: 'var(--text)' }}>
            <input type="checkbox" checked={syncDistribution} onChange={(e) => setSyncDistribution(e.target.checked)} />
            保存后同步到分布图谱
          </label>
          <button className="secondary-button px-4 py-2" onClick={() => review('correct')} disabled={!result?.confidence}>
            <CheckCircle2 className="h-4 w-4" />确认物种正确
          </button>
          <button className="secondary-button px-4 py-2" onClick={() => review('uncertain')} disabled={!result}>
            <XCircle className="h-4 w-4" />标记为不确定
          </button>
          <button className="secondary-button px-4 py-2" onClick={() => onNotify('success', confirmedSpecies ? `已修改为 ${confirmedSpecies}。` : '请先选择人工确认物种。')} disabled={!result?.confidence}>
            <Plus className="h-4 w-4" />修改确认物种
          </button>
          <button className="primary-button px-4 py-2" onClick={saveRecord} disabled={!result}>
            <Save className="h-4 w-4" />保存到采样记录
          </button>
          <button className="secondary-button px-4 py-2" onClick={exportPdf} disabled={!result}>
            <FileText className="h-4 w-4" />导出单图 PDF 报告
          </button>
        </div>
      </Panel>
    </section>
  )
}

// ─── batch mode ───────────────────────────────────────────────────────────────

function BatchMode({ onNotify }) {
  const [files, setFiles] = useState([])
  const [items, setItems] = useState([])
  const [taskId, setTaskId] = useState('')
  const [busy, setBusy] = useState(false)

  const summary = useMemo(() => {
    const total = items.length
    const failed = items.filter((i) => i.status === '识别失败').length
    const low = items.filter((i) => i.confidence > 0 && i.confidence < 0.8).length
    const recognized = items.filter((i) => i.status !== '识别失败').length
    const reviewPending = items.filter((i) => i.reviewStatus === '待复核').length
    const average = recognized ? items.reduce((s, i) => s + i.confidence, 0) / recognized : 0
    return { total, failed, low, recognized, reviewPending, average }
  }, [items])

  const composition = useMemo(() => {
    const recognized = items.filter((i) => i.confidence > 0)
    if (!recognized.length) return []
    const counts = recognized.reduce((acc, i) => { const k = i.species || '未分类'; acc[k] = (acc[k] || 0) + 1; return acc }, {})
    return Object.entries(counts)
      .map(([label, count]) => ({ label, value: Math.round((count / recognized.length) * 100) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [items])

  const lowItems = items.filter((i) => i.confidence > 0 && i.confidence < 0.8)

  const chooseFiles = (event) => setFiles(Array.from(event.target.files || []))

  const runBatch = async () => {
    if (!files.length) { onNotify('error', '请先选择一组显微图像。'); return }
    setBusy(true)
    try {
      const payload = await runBatchAnalysis(files)
      setItems(normalizeBatchItems(payload.items || []))
      setTaskId(payload.task_id || '')
      onNotify('success', '批量检测任务已完成。')
    } catch (error) {
      onNotify('error', error.message || '批量检测失败。')
    } finally {
      setBusy(false)
    }
  }

  const exportRows = (filename) => {
    downloadCsv(filename, [
      ['图片名', '识别类别', '置信度', '候选排序', '相似类别', '处理时间', '复核状态', '状态'],
      ...items.map((i) => [i.imageName, i.species, formatPercent(i.confidence), i.candidateText || '-', i.similar, i.processingTime, i.reviewStatus, i.status]),
    ])
    onNotify('success', `已生成 ${filename}。`)
  }

  const exportBatchPdf = async () => {
    if (!taskId) { onNotify('error', '请先完成一次批量检测。'); return }
    try {
      await downloadBatchReport(taskId)
      onNotify('success', '批量 PDF 报告已导出。')
    } catch (error) {
      onNotify('error', error.message || '批量 PDF 报告导出失败。')
    }
  }

  return (
    <div className="grid gap-6">
      {items.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="总图片数" value={summary.total} hint="当前批次" />
          <StatCard label="已识别" value={summary.recognized} hint="含待复核样本" />
          <StatCard label="识别失败" value={summary.failed} hint="需重新上传" />
          <StatCard label="低置信度" value={summary.low} hint="低于 80%" />
          <StatCard label="待人工复核" value={summary.reviewPending} hint="复核队列" />
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel>
          <h2 className="panel-title">
            <FolderUp className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            选择图片
          </h2>
          <label className="upload-zone mt-4">
            <input type="file" accept="image/*" multiple className="hidden" onChange={chooseFiles} />
            <FolderUp className="h-10 w-10" style={{ color: 'var(--primary)' }} />
            <strong>{files.length ? `已选择 ${files.length} 张图片` : '批量选择显微图片'}</strong>
            <span>支持多选，PNG / JPG / WEBP / BMP</span>
          </label>
          <button className="primary-button mt-4 w-full px-5 py-3" onClick={runBatch} disabled={busy}>
            <Table2 className="h-5 w-5" />
            {busy ? '检测中…' : '开始批量检测'}
          </button>

          {items.length > 0 && (
            <div className="batch-file-list mt-5">
              {items.map((item) => (
                <div key={item.imageName} className="batch-file-row">
                  <span className="batch-file-name">{item.imageName}</span>
                  <span className={`batch-file-status batch-status-${item.confidence >= 0.8 ? 'done' : item.confidence > 0 ? 'low' : 'failed'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="grid gap-6 content-start">
          {items.length > 0 && (
            <>
              <section className="grid gap-4 sm:grid-cols-3">
                <Panel>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>平均置信度</p>
                  <strong className="mt-2 block text-3xl" style={{ color: 'var(--text)' }}>{formatPercent(summary.average)}</strong>
                  <span className="mt-1 block text-xs" style={{ color: 'var(--text-3)' }}>批次整体模型稳定性</span>
                </Panel>
                <Panel>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>低置信度比例</p>
                  <strong className="mt-2 block text-3xl" style={{ color: 'var(--warning)' }}>{formatPercent(summary.low / Math.max(1, summary.total))}</strong>
                  <span className="mt-1 block text-xs" style={{ color: 'var(--text-3)' }}>自动进入待复核</span>
                </Panel>
                <Panel>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>任务编号</p>
                  <strong className="mt-2 block text-lg break-all" style={{ color: 'var(--text)' }}>{taskId || '待运行'}</strong>
                  <span className="mt-1 block text-xs" style={{ color: 'var(--text-3)' }}>可用于报告归档</span>
                </Panel>
              </section>
              {composition.length > 0 && <BarList title="类群组成统计" data={composition} suffix="%" />}
            </>
          )}

          {!items.length && (
            <Panel>
              <EmptyState
                title="等待批量检测"
                text="选择一组显微图像后点击开始批量检测，系统会生成批次统计、低置信度队列和导出结果。"
              />
            </Panel>
          )}
        </div>
      </section>

      {items.length > 0 && (
        <>
          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="panel-title">
                <Table2 className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                批量检测结果
              </h2>
              <div className="flex flex-wrap gap-2">
                <button className="secondary-button px-4 py-2" onClick={() => exportRows('batch-results.csv')}>
                  <FileSpreadsheet className="h-4 w-4" />导出 CSV
                </button>
                <button className="secondary-button px-4 py-2" onClick={() => exportRows('batch-results-full.csv')}>
                  <Download className="h-4 w-4" />导出详细 CSV
                </button>
                <button className="primary-button px-4 py-2" onClick={exportBatchPdf} disabled={!taskId}>
                  <FileText className="h-4 w-4" />导出批量 PDF 报告
                </button>
              </div>
            </div>
            <DataTable
              headers={['图片名', '识别类别', '置信度', '候选排序', '处理时间', '复核状态']}
              rows={items.map((item) => [
                item.imageName,
                item.species,
                item.confidence ? formatPercent(item.confidence) : '-',
                item.candidateText || item.similar,
                item.processingTime,
                <StatusPill status={item.reviewStatus} />,
              ])}
            />
          </Panel>

          {lowItems.length > 0 && (
            <Panel>
              <h2 className="panel-title">
                <AlertTriangle className="h-5 w-5" style={{ color: 'var(--warning)' }} />
                低置信度样本（需人工复核）
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {lowItems.map((item) => (
                  <article key={item.imageName} className="low-card">
                    <div>
                      <strong>{item.imageName}</strong>
                      <p>{item.species}，相似类别：{item.similar}</p>
                    </div>
                    <span>{formatPercent(item.confidence)}</span>
                  </article>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────

function EmptyPreview() {
  return (
    <div className="empty-preview">
      <ImageIcon className="h-8 w-8" />
      <span>暂无图片</span>
    </div>
  )
}

function ResultMetric({ label, value }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Explain({ label, value }) {
  return (
    <div className="explain-item">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  )
}
