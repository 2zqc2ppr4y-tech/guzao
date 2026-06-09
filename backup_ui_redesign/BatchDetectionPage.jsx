import { useMemo, useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, FileText, FolderUp, Table2 } from 'lucide-react'
import { downloadBatchReport, runBatchAnalysis } from '../api'
import { batchTask } from '../data/mockData'
import { BarList, DataTable, downloadCsv, formatPercent, PageIntro, Panel, StatCard, StatusPill } from '../components/ui'

function normalizeItems(items) {
  return items
    .map((item) => {
      const candidates = (Array.isArray(item.species_ranking) && item.species_ranking.length ? item.species_ranking : (item.alternatives || []))
        .map((candidate) => ({ ...candidate, confidence: Number(candidate?.confidence || 0) }))
        .sort((left, right) => right.confidence - left.confidence)
      return {
        imageName: item.imageName || item.name,
        species: item.species,
        confidence: Number(item.confidence || 0),
        candidates,
        candidateText: candidates.slice(0, 3).map((candidate, index) => `${index + 1}. ${candidate.species} ${formatPercent(candidate.confidence)}`).join('；'),
        similar: item.similar || candidates.slice(1, 4).map((candidate) => candidate.species).join('、') || '待比对',
        processingTime: item.processingTime || item.time || '1.1s',
        reviewStatus: item.reviewStatus || (Number(item.confidence || 0) < 0.8 ? '待复核' : '未复核'),
        status: item.status || (Number(item.confidence || 0) < 0.8 ? '低置信度' : '已识别')
      }
    })
    .sort((left, right) => right.confidence - left.confidence)
}

export default function BatchDetectionPage({ onNotify }) {
  const [files, setFiles] = useState([])
  const [items, setItems] = useState(batchTask.items)
  const [taskId, setTaskId] = useState('')
  const [busy, setBusy] = useState(false)

  const summary = useMemo(() => {
    const total = items.length || batchTask.total
    const failed = items.filter((item) => item.status === '识别失败').length
    const low = items.filter((item) => item.confidence > 0 && item.confidence < 0.8).length
    const recognized = items.filter((item) => item.status !== '识别失败').length
    const reviewPending = items.filter((item) => item.reviewStatus === '待复核').length
    const average = items.reduce((sum, item) => sum + item.confidence, 0) / Math.max(1, recognized)
    return { total, failed, low, recognized, reviewPending, average }
  }, [items])

  const lowItems = items.filter((item) => item.confidence > 0 && item.confidence < 0.8)

  const composition = useMemo(() => {
    const recognized = items.filter((item) => item.confidence > 0)
    if (!recognized.length) return batchTask.composition
    const counts = recognized.reduce((acc, item) => {
      const key = item.species || '未分类'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .map(([label, count]) => ({ label, value: Math.round((count / recognized.length) * 100) }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6)
  }, [items])

  const chooseFiles = (event) => setFiles(Array.from(event.target.files || []))

  const runBatch = async () => {
    if (!files.length) {
      onNotify('error', '请先选择一组显微图像。')
      return
    }
    setBusy(true)
    try {
      const payload = await runBatchAnalysis(files)
      setItems(normalizeItems(payload.items || []))
      setTaskId(payload.task_id || '')
      onNotify('success', '批量检测任务已完成。')
    } catch (error) {
      onNotify('error', `${error.message}，已保留演示批量结果。`)
    } finally {
      setBusy(false)
    }
  }

  const exportRows = (filename) => {
    downloadCsv(filename, [
      ['图片名', '识别类别', '置信度', '候选排序', '相似类别', '处理时间', '复核状态', '状态'],
      ...items.map((item) => [item.imageName, item.species, formatPercent(item.confidence), item.candidateText || '-', item.similar, item.processingTime, item.reviewStatus, item.status])
    ])
    onNotify('success', `已生成 ${filename}。`)
  }

  const exportBatchPdf = async () => {
    try {
      await downloadBatchReport(taskId)
      onNotify('success', '批量 PDF 报告已导出。')
    } catch (error) {
      onNotify('error', error.message || '批量 PDF 报告导出失败。')
    }
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="批量检测"
        title="批量显微图识别、低置信度筛选与结果导出"
        text="按任务维度统计识别进度、类群组成和复核队列，置信度低于 80% 的样本自动进入低置信度区域。"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="总图片数" value={summary.total} hint="当前批量任务" />
        <StatCard label="已识别" value={summary.recognized} hint="包含待复核样本" />
        <StatCard label="识别失败" value={summary.failed} hint="需要重新上传" />
        <StatCard label="低置信度" value={summary.low} hint="低于 80%" />
        <StatCard label="待人工复核" value={summary.reviewPending} hint="复核队列" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <Panel>
          <h2 className="panel-title">
            <FolderUp className="h-5 w-5 text-cyan-100" />
            文件列表
          </h2>
          <label className="upload-zone mt-4">
            <input type="file" accept="image/*" multiple className="hidden" onChange={chooseFiles} />
            <FolderUp className="h-10 w-10 text-cyan-100" />
            <strong>{files.length ? `已选择 ${files.length} 张图片` : '选择批量图片'}</strong>
            <span>图片将按文件名进入批量任务。</span>
          </label>
          <button className="primary-button mt-4 w-full px-5 py-3" onClick={runBatch} disabled={busy}>
            <Table2 className="h-5 w-5" />
            {busy ? '批量检测中' : '开始批量检测'}
          </button>
          <div className="mt-5 grid gap-2">
            {items.map((item) => (
              <div key={item.imageName} className="file-row">
                <span>{item.imageName}</span>
                <StatusPill status={item.status} />
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6">
          <section className="grid gap-4 lg:grid-cols-3">
            <Panel>
              <p className="text-sm text-slate-300">平均置信度</p>
              <strong className="mt-2 block text-3xl text-white">{formatPercent(summary.average)}</strong>
              <span className="mt-2 block text-sm text-slate-400">批次整体模型稳定性参考</span>
            </Panel>
            <Panel>
              <p className="text-sm text-slate-300">低置信度样本比例</p>
              <strong className="mt-2 block text-3xl text-amber-200">{formatPercent(summary.low / Math.max(1, summary.total))}</strong>
              <span className="mt-2 block text-sm text-slate-400">自动进入待复核</span>
            </Panel>
            <Panel>
              <p className="text-sm text-slate-300">任务编号</p>
              <strong className="mt-2 block text-xl text-white">{taskId || batchTask.id}</strong>
              <span className="mt-2 block text-sm text-slate-400">可用于报告归档</span>
            </Panel>
          </section>

          <BarList title="类群组成统计" data={composition} suffix="%" />
        </div>
      </section>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">
            <Table2 className="h-5 w-5 text-cyan-100" />
            批量检测结果表
          </h2>
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button px-4 py-2" onClick={() => exportRows('batch-results.xlsx')}>
              <FileSpreadsheet className="h-4 w-4" />
              导出 Excel
            </button>
            <button className="secondary-button px-4 py-2" onClick={() => exportRows('batch-results.csv')}>
              <Download className="h-4 w-4" />
              导出 CSV
            </button>
            <button className="primary-button px-4 py-2" onClick={exportBatchPdf} disabled={!taskId}>
              <FileText className="h-4 w-4" />
              导出批量 PDF 报告
            </button>
          </div>
        </div>
        <DataTable
          headers={['图片名', '识别类别', '置信度', '候选排序', '处理时间', '复核状态', '操作']}
          rows={items.map((item) => [
            item.imageName,
            item.species,
            item.confidence ? formatPercent(item.confidence) : '-',
            item.candidateText || item.similar,
            item.processingTime,
            <StatusPill status={item.reviewStatus} />,
            <button className="link-button" onClick={() => onNotify('success', `${item.imageName} 已加入复核队列。`)}>加入复核</button>
          ])}
        />
      </Panel>

      <Panel className="border-amber-300/35">
        <h2 className="panel-title">
          <AlertTriangle className="h-5 w-5 text-amber-200" />
          低置信度样本
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
    </div>
  )
}
