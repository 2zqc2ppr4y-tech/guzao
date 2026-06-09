import { useState } from 'react'
import { FileText, FlaskConical, Waves } from 'lucide-react'
import { samplingAssessmentMock } from '../data/mockData'
import { Field, PageIntro, Panel, SelectInput, StatusPill, TextArea, TextInput } from '../components/ui'

const defaultForm = {
  samplingId: 'SAM-20260522-NH03',
  location: '南湖湿地北岸 3 号样点',
  gps: '30.5126, 114.4028',
  time: '2026-05-22 09:40',
  waterType: '浅水湿地',
  temperature: '22.4',
  ph: '7.2',
  transparency: '42',
  conductivity: '312',
  dissolvedOxygen: '7.8',
  totalNitrogen: '1.12',
  totalPhosphorus: '0.08',
  magnification: '400x',
  images: 'lake-a-001.jpg, lake-a-002.jpg'
}

export default function SamplingAssessmentPage({ onNotify }) {
  const [form, setForm] = useState(defaultForm)
  const [result, setResult] = useState(samplingAssessmentMock)

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const runAssessment = () => {
    const lowRate = Number(form.transparency) < 30 ? '24.0%' : samplingAssessmentMock.lowConfidenceRate
    const level = Number(form.totalPhosphorus) > 0.12 ? '可能富营养化风险' : Number(form.transparency) < 28 ? '需连续监测' : '需复核'
    setResult({ ...samplingAssessmentMock, lowConfidenceRate: lowRate, level })
    onNotify('success', '采样评估辅助说明已更新。')
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="水样评估"
        title="基于采样点或批次样本的状态说明与采样建议"
        text="水样评估只负责辅助分析一个采样点或一批样本的状态，不直接判断水质好坏；用于提醒复核、补充采样和连续监测。"
      />

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <h2 className="panel-title">
            <FlaskConical className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            采样信息表单
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="采样编号"><TextInput value={form.samplingId} onChange={(e) => update('samplingId', e.target.value)} /></Field>
            <Field label="采样地点"><TextInput value={form.location} onChange={(e) => update('location', e.target.value)} /></Field>
            <Field label="GPS"><TextInput value={form.gps} onChange={(e) => update('gps', e.target.value)} /></Field>
            <Field label="采样时间"><TextInput value={form.time} onChange={(e) => update('time', e.target.value)} /></Field>
            <Field label="水体类型">
              <SelectInput value={form.waterType} onChange={(e) => update('waterType', e.target.value)}>
                <option>浅水湿地</option>
                <option>湖泊</option>
                <option>池塘</option>
                <option>沟渠</option>
                <option>水田</option>
              </SelectInput>
            </Field>
            <Field label="水温 (°C)"><TextInput value={form.temperature} onChange={(e) => update('temperature', e.target.value)} /></Field>
            <Field label="pH"><TextInput value={form.ph} onChange={(e) => update('ph', e.target.value)} /></Field>
            <Field label="透明度 (cm)"><TextInput value={form.transparency} onChange={(e) => update('transparency', e.target.value)} /></Field>
            <Field label="电导率 (μS/cm)"><TextInput value={form.conductivity} onChange={(e) => update('conductivity', e.target.value)} /></Field>
            <Field label="溶解氧 (mg/L)"><TextInput value={form.dissolvedOxygen} onChange={(e) => update('dissolvedOxygen', e.target.value)} /></Field>
            <Field label="总氮 (mg/L)"><TextInput value={form.totalNitrogen} onChange={(e) => update('totalNitrogen', e.target.value)} /></Field>
            <Field label="总磷 (mg/L)"><TextInput value={form.totalPhosphorus} onChange={(e) => update('totalPhosphorus', e.target.value)} /></Field>
            <Field label="显微倍率"><TextInput value={form.magnification} onChange={(e) => update('magnification', e.target.value)} /></Field>
            <Field label="样本图片"><TextInput value={form.images} onChange={(e) => update('images', e.target.value)} /></Field>
          </div>
          <button className="primary-button mt-5 w-full px-5 py-3" onClick={runAssessment}>
            <Waves className="h-5 w-5" />
            生成辅助评估
          </button>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="panel-title">
              <Waves className="h-5 w-5" style={{ color: 'var(--primary)' }} />
              评估结果
            </h2>
            <StatusPill status={result.level} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Metric label="鼓藻丰富度" value={result.richness} />
            <Metric label="优势类群" value={result.dominantGroup} />
            <Metric label="物种均匀度" value={result.evenness} />
            <Metric label="低置信度样本比例" value={result.lowConfidenceRate} />
          </div>
          <div className="mt-5 grid gap-4">
            <Explain title="水体状态提示" text={result.stateHint} />
            <Explain title="可能影响因素" text={result.possibleFactors} />
            <Explain title="后续采样建议" text={result.nextSuggestion} />
          </div>
          <div className="insight-note mt-5">
            <h3>等级说明</h3>
            <p>可选等级包括：数据不足、初步正常、需复核、可能富营养化风险、需连续监测。当前结果仅作为辅助说明。</p>
          </div>
          <button className="primary-button mt-5 w-full px-5 py-3" onClick={() => onNotify('success', '采样报告已生成。')}>
            <FileText className="h-5 w-5" />
            生成采样报告
          </button>
        </Panel>
      </section>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="metric-mini">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Explain({ title, text }) {
  return (
    <div className="explain-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}
