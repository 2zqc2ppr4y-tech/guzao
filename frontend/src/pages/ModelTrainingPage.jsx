import { useMemo, useState } from 'react'
import { BrainCircuit, FilePlus2, Play, ScrollText } from 'lucide-react'
import { modelDatasets, modelEvaluation, modelVersions, trainingOverview, trainingTasks } from '../data/mockData'
import { DataTable, formatPercent, PageIntro, Panel, ProgressBar, StatCard, StatusPill } from '../components/ui'

export default function ModelTrainingPage({ onNotify }) {
  const [config, setConfig] = useState({ model: 'YOLOv8-Desmid', epoch: 80, batchSize: 16, learningRate: 0.001 })
  const [logs, setLogs] = useState(trainingTasks)

  const maxSamples = useMemo(() => Math.max(...modelDatasets.map((item) => item.train + item.validation + item.test)), [])

  const startTraining = () => {
    setLogs([
      '训练任务已启动：读取人工复核样本和当前数据集切分。',
      `模型：${config.model}，epoch=${config.epoch}，batch=${config.batchSize}，lr=${config.learningRate}`,
      'Epoch 001/080：loss=1.842，mAP=0.412',
      'Epoch 012/080：loss=0.946，mAP=0.681',
      '训练日志持续写入中...'
    ])
    onNotify('success', '模型训练任务已启动。')
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="管理后台"
        title="模型训练、数据治理与版本管理"
        text="把人工复核样本转为下一轮训练资产，持续跟踪类别平衡、训练日志、模型指标、混淆错误和当前使用版本。"
      />

      <section className="admin-command-strip">
        <article>
          <BrainCircuit className="h-5 w-5" />
          <span>当前模型</span>
          <strong>{config.model}</strong>
        </article>
        <article>
          <ScrollText className="h-5 w-5" />
          <span>训练状态</span>
          <strong>{logs.at(-1) || '等待启动'}</strong>
        </article>
        <article>
          <Play className="h-5 w-5" />
          <span>推荐动作</span>
          <strong>先复核低置信度样本，再启动训练</strong>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="总图片数" value={trainingOverview.totalImages.toLocaleString()} hint="全部训练资产" />
        <StatCard label="已标注图片" value={trainingOverview.labeledImages.toLocaleString()} hint="可直接训练" />
        <StatCard label="未标注图片" value={trainingOverview.unlabeledImages.toLocaleString()} hint="待标注复核" />
        <StatCard label="类别数量" value={trainingOverview.categoryCount} hint="当前物种类别" />
        <StatCard label="训练/验证/测试" value={trainingOverview.split} hint="当前切分比例" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <h2 className="panel-title">
            <BrainCircuit className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            类别样本平衡图
          </h2>
          <div className="mt-5 grid gap-4">
            {modelDatasets.map((item) => {
              const total = item.train + item.validation + item.test
              const low = total < 1000
              return (
                <div key={item.category}>
                  <div className="chart-row-label">
                    <span>{item.category}</span>
                    <strong style={{ color: low ? 'var(--warning)' : 'var(--text)' }}>{total} 张{low ? ' · 样本不足' : ''}</strong>
                  </div>
                  <ProgressBar value={total / maxSamples} color={low ? '#f59e0b' : '#14b8a6'} />
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel>
          <h2 className="panel-title">
            <Play className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            训练任务
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Config label="选择模型" value={config.model} onChange={(value) => setConfig({ ...config, model: value })} options={['YOLOv8-Desmid', 'YOLOv10-Desmid', 'ConvNeXt-Classifier']} />
            <Config label="epoch" value={config.epoch} onChange={(value) => setConfig({ ...config, epoch: value })} />
            <Config label="batch size" value={config.batchSize} onChange={(value) => setConfig({ ...config, batchSize: value })} />
            <Config label="学习率" value={config.learningRate} onChange={(value) => setConfig({ ...config, learningRate: value })} />
          </div>
          <button className="primary-button mt-5 w-full px-5 py-3" onClick={startTraining}>
            <Play className="h-5 w-5" />
            开始训练
          </button>
          <div className="training-log-panel mt-5 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <ScrollText className="h-4 w-4" />
              查看训练日志
            </h3>
            <div className="grid gap-2 font-mono text-xs">
              {logs.map((line) => <span key={line}>{line}</span>)}
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel>
          <h2 className="panel-title">模型评估</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ['Accuracy', modelEvaluation.accuracy],
              ['Precision', modelEvaluation.precision],
              ['Recall', modelEvaluation.recall],
              ['F1-score', modelEvaluation.f1],
              ['mAP', modelEvaluation.map]
            ].map(([label, value]) => (
              <div key={label} className="metric-mini">
                <span>{label}</span>
                <strong>{formatPercent(value)}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <h3 className="mb-3 font-bold" style={{ color: 'var(--text)' }}>混淆矩阵摘要</h3>
            <div className="grid gap-2">
              {modelEvaluation.confusion.map(([from, to, count]) => (
                <div key={`${from}-${to}`} className="file-row">
                  <span>{from} → {to}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="panel-title">错误样本列表</h2>
            <button className="secondary-button px-4 py-2" onClick={() => onNotify('success', '人工复核后的样本已加入下一轮训练。')}>
              <FilePlus2 className="h-4 w-4" />
              将复核样本加入下一轮训练
            </button>
          </div>
          <DataTable
            headers={['图片名', '预测类别', '真实标签', '错误原因']}
            rows={modelEvaluation.errors.map((item) => [item.image, item.predict, item.label, item.reason])}
          />
        </Panel>
      </section>

      <Panel>
        <h2 className="panel-title">模型版本管理</h2>
        <div className="mt-4">
          <DataTable
            headers={['版本号', '训练日期', '类别数', '样本数', '准确率', '是否当前使用']}
            rows={modelVersions.map((item) => [item.version, item.date, item.categories, item.samples, formatPercent(item.accuracy), <StatusPill status={item.current === '是' ? '当前使用' : '未使用'} />])}
          />
        </div>
      </Panel>
    </div>
  )
}

function Config({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      {options ? (
        <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((item) => <option key={item}>{item}</option>)}
        </select>
      ) : (
        <input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  )
}
