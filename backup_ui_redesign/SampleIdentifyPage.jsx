import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, Plus, Save, UploadCloud, XCircle } from 'lucide-react'
import { createReviewRecord, downloadReport, fetchDesmidGenera, predictImage, saveSampleRecord } from '../api'
import {
  Field,
  formatPercent,
  PageIntro,
  Panel,
  ProgressBar,
  SelectInput,
  StatusPill,
  TextArea,
  TextInput
} from '../components/ui'

const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp']

const defaultForm = {
  sampleId: '',
  location: '',
  gps: '',
  waterType: '湖泊',
  magnification: '',
  staining: '',
  device: '',
  remark: ''
}

function morphologyListText(items) {
  if (!Array.isArray(items)) return ''
  const preferred = items.find((item) => item?.label?.includes('形态')) || items[0]
  return preferred?.value || ''
}

function predictionMorphologyText(payload) {
  if (typeof payload?.analysis?.morphology === 'string' && payload.analysis.morphology.trim()) {
    return payload.analysis.morphology
  }
  if (typeof payload?.morphology === 'string' && payload.morphology.trim()) {
    return payload.morphology
  }
  return (
    morphologyListText(payload?.morphology) ||
    payload?.description ||
    payload?.structure ||
    '模型未返回具体形态描述，请结合检测框和显微原图人工复核。'
  )
}

function aiValue(value, fallback = '') {
  if (Array.isArray(value)) return value.filter(Boolean).join('、') || fallback
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value || fallback || '').trim()
}

function friendlyAiError(value) {
  if (!value) return ''
  return 'AI 复核暂不可用，已使用本地 YOLO 结果和规则分析；不影响本次识别、排序和报告导出。'
}

function normalizePrediction(payload, preview, form) {
  const detections = Array.isArray(payload?.detections) ? payload.detections : []
  const candidates = (Array.isArray(payload?.species_ranking) && payload.species_ranking.length ? payload.species_ranking : (payload?.alternatives || []))
    .map((item) => ({ ...item, confidence: Number(item?.confidence || 0) }))
    .sort((left, right) => right.confidence - left.confidence)
  const hasResult = detections.length > 0 || candidates.length > 0 || Number(payload?.confidence || 0) > 0
  const species = hasResult ? (payload?.species || candidates[0]?.species || detections[0]?.label) : '未检测到鼓藻目标'
  const confidence = hasResult ? Number(payload?.confidence ?? candidates[0]?.confidence ?? detections[0]?.confidence ?? 0) : 0
  const ai = payload?.analysis?.ai || {}
  return {
    resultId: payload?.result_id || '',
    sampleId: payload?.sample_record_id || payload?.result_id || form.sampleId,
    originalImageUrl: preview || payload?.original_image_url || payload?.file?.url || '',
    resultImageUrl: payload?.result_image_url || payload?.image_url || preview || '',
    imageUrl: payload?.result_image_url || payload?.image_url || preview || '',
    species,
    latin: hasResult ? (payload?.scientific_name || candidates[0]?.scientific_name || species) : 'Unknown',
    confidence,
    candidates,
    elapsed: payload?.elapsed || payload?.processing_time || '-',
    boxes: payload?.boxes?.length ? payload.boxes : detections,
    detections,
    detectionCount: detections.length,
    message: payload?.message || (hasResult ? '' : '未检测到鼓藻目标，请更换更清晰图片或降低置信度。'),
    aiSource: ai.sourceLabel || '本地规则分析',
    aiSummary: aiValue(ai.summary, payload?.analysis?.summary || ''),
    aiError: friendlyAiError(ai.error),
    morphology: {
      shape: aiValue(ai.shape, hasResult ? predictionMorphologyText(payload) : '当前图片中没有达到置信度阈值的鼓藻检测框。'),
      symmetry: aiValue(ai.symmetry, hasResult ? '沿主要轴线呈稳定对称，需结合完整细胞轮廓确认。' : '无法从空检测结果中判断。'),
      isthmus: aiValue(ai.isthmus, hasResult ? '请结合检测框内细胞形态人工复核。' : '未检测到可分析目标。'),
      edge: aiValue(ai.edge, hasResult ? '边缘特征来自模型检测框定位结果，系统不补充虚构描述。' : '建议提高对焦、减少杂质遮挡后重新上传。'),
      similar: aiValue(ai.similar, '未启用相似种推断'),
      basis: aiValue(ai.basis, hasResult ? '依据本地 YOLO 模型真实推理结果。' : 'YOLO 模型未返回目标框。'),
      reviewSuggestion: aiValue(ai.reviewSuggestion, hasResult && confidence >= 0.8 ? '可抽样人工复核' : '建议人工复核')
    }
  }
}

export default function SampleIdentifyPage({ onNotify }) {
  const [form, setForm] = useState(defaultForm)
  const [files, setFiles] = useState([])
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [confirmedSpecies, setConfirmedSpecies] = useState('')
  const [syncDistribution, setSyncDistribution] = useState(false)
  const [genera, setGenera] = useState([])

  const reviewStatus = !result ? '等待识别' : result.confidence <= 0 ? '未检测到' : result.detectionCount === 0 ? 'AI候选待复核' : result.confidence < 0.8 ? '建议人工复核' : '可抽样复核'

  useEffect(() => {
    fetchDesmidGenera()
      .then((payload) => setGenera(payload.items || []))
      .catch(() => setGenera([]))
  }, [])

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleFile = (event) => {
    const nextFiles = Array.from(event.target.files || [])
    if (!nextFiles.length) return
    const invalid = nextFiles.find((item) => !acceptedTypes.includes(item.type))
    if (invalid) {
      onNotify('error', '仅支持 PNG、JPG、WEBP、BMP 显微图像。')
      return
    }
    setFiles(nextFiles)
    const url = URL.createObjectURL(nextFiles[0])
    setPreview(url)
    setResult(null)
    setConfirmedSpecies('')
  }

  const runRecognition = async () => {
    if (!files.length) {
      onNotify('error', '请先选择显微样本图片。')
      return
    }
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
    if (!result) {
      onNotify('error', '请先完成一次识别。')
      return
    }
    const payload = { sample_info: form, recognition: { ...result, species: confirmedSpecies || result.species }, sync_distribution: syncDistribution }
    try {
      await saveSampleRecord(payload)
      onNotify('success', syncDistribution ? '已保存到采样记录；只有填写明确 GPS 坐标时才会同步到分布图谱。' : '已保存到采样记录。')
    } catch (error) {
      onNotify('error', error.message || '保存失败。')
    }
  }

  const review = async (verdict) => {
    if (!result) {
      onNotify('error', '请先完成一次识别。')
      return
    }
    try {
      await createReviewRecord({ sample_record_id: result.sampleId, result_id: result.sampleId, verdict })
    } catch (error) {
      onNotify('error', error.message || '复核记录保存失败。')
      return
    }
    onNotify('success', verdict === 'correct' ? '已标记为正确。' : '已标记为错误并加入复核队列。')
  }

  const exportPdf = async () => {
    if (!result?.resultId) {
      onNotify('error', '请先完成一次识别。')
      return
    }
    try {
      await downloadReport(result.resultId, 'pdf')
      onNotify('success', '单图 PDF 报告已导出。')
    } catch (error) {
      onNotify('error', error.message || '单图 PDF 报告导出失败。')
    }
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="样本识别"
        title="单张水样显微图像识别、形态判读与样本归档"
        text="三栏结构同时呈现上传信息、识别结果和形态解释，低置信度样本可直接进入人工复核与下一轮训练数据集。"
      />

      <section className="identify-grid">
        <Panel>
          <h2 className="panel-title">
            <UploadCloud className="h-5 w-5 text-cyan-100" />
            上传图片与样本信息
          </h2>
          <label className="upload-zone mt-4">
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
            <ImageIcon className="h-10 w-10 text-cyan-100" />
            <strong>{files.length ? `已选择 ${files.length} 张图片` : '选择显微图像'}</strong>
            <span>支持单张或多张 PNG、JPG、WEBP、BMP；首张用于当前识别预览。</span>
          </label>
          <div className="mt-4 grid gap-3">
            <Field label="样本编号"><TextInput value={form.sampleId} onChange={(e) => updateForm('sampleId', e.target.value)} /></Field>
            <Field label="采样地点"><TextInput value={form.location} onChange={(e) => updateForm('location', e.target.value)} /></Field>
            <Field label="GPS 坐标"><TextInput value={form.gps} onChange={(e) => updateForm('gps', e.target.value)} placeholder="例如 30.5928, 114.3055；不填则不进地图" /></Field>
            <Field label="水体类型">
              <SelectInput value={form.waterType} onChange={(e) => updateForm('waterType', e.target.value)}>
                <option>浅水湿地</option>
                <option>湖泊</option>
                <option>池塘</option>
                <option>水田</option>
                <option>沟渠</option>
              </SelectInput>
            </Field>
            <Field label="显微倍率"><TextInput value={form.magnification} onChange={(e) => updateForm('magnification', e.target.value)} /></Field>
            <Field label="染色方式"><TextInput value={form.staining} onChange={(e) => updateForm('staining', e.target.value)} /></Field>
            <Field label="拍摄设备"><TextInput value={form.device} onChange={(e) => updateForm('device', e.target.value)} /></Field>
            <Field label="备注"><TextArea value={form.remark} onChange={(e) => updateForm('remark', e.target.value)} /></Field>
          </div>
          <button className="primary-button mt-5 w-full px-5 py-3" onClick={runRecognition} disabled={busy}>
            <UploadCloud className="h-5 w-5" />
            {busy ? '识别处理中' : '上传识别'}
          </button>
          {busy && <div className="mt-4"><ProgressBar value={progress} color="#38bdf8" /></div>}
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 className="panel-title">
              <CheckCircle2 className="h-5 w-5 text-cyan-100" />
              识别结果
            </h2>
            <StatusPill status={reviewStatus} />
          </div>
          <div className="result-image-grid mt-4">
            <figure className="result-figure">
              <span>原图</span>
              {preview || result?.originalImageUrl ? <img src={preview || result?.originalImageUrl} alt="原始样本" /> : <EmptyPreview />}
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
                <ResultMetric label="检测框数量" value={`${result.detectionCount} 个`} />
                <ResultMetric label="处理耗时" value={result.elapsed} />
              </div>
              <div className="mt-5">
                <h3 className="mb-3 font-bold text-white">候选种类排序</h3>
                {result.candidates.length ? (
                  <div className="grid gap-3">
                    {result.candidates.map((item, index) => (
                      <div key={`${item.species}-${index}`} className="candidate-row">
                        <div className="flex justify-between gap-3">
                          <span>{index + 1}. {item.species}</span>
                          <strong>{formatPercent(item.confidence)}</strong>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{item.scientific_name || 'Unknown'} · {item.source || 'YOLO'}</p>
                        {item.reason && <p className="mt-2 text-xs text-slate-400">{item.reason}</p>}
                        <ProgressBar value={item.confidence} color={item.confidence < 0.8 ? '#f59e0b' : '#14b8a6'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-detection mt-3">{result.message}</div>
                )}
              </div>
              <div className="mt-5">
                <h3 className="mb-3 font-bold text-white">检测目标列表</h3>
                {result.detections.length ? (
                  <div className="grid gap-3">
                    {result.detections.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="candidate-row">
                        <div className="flex justify-between gap-3">
                          <span>{index + 1}. {item.label}</span>
                          <strong>{formatPercent(item.confidence)}</strong>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">bbox: [{item.bbox.map((value) => Number(value).toFixed(1)).join(', ')}]</p>
                        <ProgressBar value={item.confidence} color={item.confidence < 0.8 ? '#f59e0b' : '#14b8a6'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-detection mt-3">{result.message}</div>
                )}
              </div>
            </>
          ) : (
            <div className="no-detection mt-5">选择图片并点击上传识别后，这里会显示带框结果图和检测列表。</div>
          )}
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 className="panel-title">
              <AlertTriangle className="h-5 w-5 text-amber-200" />
              形态解释
            </h2>
            {result?.aiSource && <span className="mini-tag">{result.aiSource}</span>}
          </div>
          {result ? (
            <>
              <div className="mt-4 grid gap-3">
                {result.aiSummary && <Explain label="AI 总结" value={result.aiSummary} />}
                <Explain label="细胞形态" value={result.morphology.shape} />
                <Explain label="对称性" value={result.morphology.symmetry} />
                <Explain label="细胞缢缝" value={result.morphology.isthmus} />
                <Explain label="边缘特征" value={result.morphology.edge} />
                <Explain label="相似物种" value={result.morphology.similar} />
                <Explain label="区分依据" value={result.morphology.basis} />
                <Explain label="是否建议人工复核" value={result.morphology.reviewSuggestion} />
                {result.aiError && <Explain label="AI 状态" value={result.aiError} />}
              </div>
              {result.detectionCount === 0 && result.confidence <= 0 && (
                <div className="no-detection mt-5">未检测到鼓藻目标，请更换更清晰图片或降低置信度。</div>
              )}
            </>
          ) : (
            <div className="no-detection mt-4">完成识别后，这里会展示形态解释、复核建议和样本归档操作。</div>
          )}
          <div className="mt-5 grid gap-2">
            <label className="field">
              <span>人工确认物种</span>
              <select className="form-input" value={confirmedSpecies} disabled={!result?.confidence} onChange={(event) => setConfirmedSpecies(event.target.value)}>
                <option value="">待确认</option>
                {genera.map((item) => <option key={item.id}>{item.chinese_name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/6 p-3 text-sm text-slate-200">
              <input type="checkbox" checked={syncDistribution} onChange={(event) => setSyncDistribution(event.target.checked)} />
              保存后同步到分布图谱
            </label>
            <button className="secondary-button px-4 py-2" onClick={() => review('correct')} disabled={!result?.confidence}><CheckCircle2 className="h-4 w-4" />确认为该物种</button>
            <button className="secondary-button px-4 py-2" onClick={() => onNotify('success', confirmedSpecies ? `已修改为 ${confirmedSpecies}。` : '请先选择人工确认物种。')} disabled={!result?.confidence}><Plus className="h-4 w-4" />修改物种</button>
            <button className="secondary-button px-4 py-2" onClick={() => review('uncertain')} disabled={!result}><XCircle className="h-4 w-4" />标记为不确定</button>
            <button className="primary-button px-4 py-2" onClick={saveRecord} disabled={!result}><Save className="h-4 w-4" />保存到采样记录</button>
            <button className="secondary-button px-4 py-2" onClick={exportPdf} disabled={!result}><FileText className="h-4 w-4" />导出单图 PDF</button>
          </div>
        </Panel>
      </section>
    </div>
  )
}

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
