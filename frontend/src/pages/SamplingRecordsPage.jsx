import { useMemo, useState } from 'react'
import { Download, MapPin, Plus } from 'lucide-react'
import { sampleLibrary, samplingSites } from '../data/mockData'
import { DataTable, Field, PageIntro, Panel, StatusPill, TextInput, downloadCsv, formatPercent } from '../components/ui'

const parameters = [
  ['水温', '22.4℃'],
  ['pH', '7.2'],
  ['透明度', '42 cm'],
  ['电导率', '312 μS/cm'],
  ['溶解氧', '7.8 mg/L'],
  ['总氮', '1.12 mg/L'],
  ['总磷', '0.08 mg/L']
]

export default function SamplingRecordsPage({ onNotify }) {
  const [selectedSite, setSelectedSite] = useState(samplingSites[0].site)
  const site = samplingSites.find((item) => item.site === selectedSite) || samplingSites[0]
  const rows = useMemo(() => sampleLibrary.filter((item) => item.site === selectedSite), [selectedSite])

  const exportSampling = () => {
    downloadCsv('sampling-records.csv', [
      ['采样点', '采样编号', '图片名', '识别结果', '置信度', '复核状态', '是否同步分布'],
      ...sampleLibrary.map((item) => [item.site, item.samplingId, item.imageName, item.result, formatPercent(item.confidence), item.reviewStatus, '是'])
    ])
    onNotify('success', '采样表已导出。')
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="采样记录"
        title="采样点、环境参数、识别图片与结果归档"
        text="面向用户自己的采样项目，管理采样地点、时间、水体参数、图片与识别结果，并可同步到分布图谱。"
        action={
          <div className="flex gap-2">
            <button className="secondary-button px-4 py-2" onClick={exportSampling}><Download className="h-4 w-4" />导出采样表</button>
            <button className="primary-button px-4 py-2" onClick={() => onNotify('success', '新建采样点表单已打开。')}><Plus className="h-4 w-4" />新建采样点</button>
          </div>
        }
      />

      <section className="sampling-record-layout">
        <Panel>
          <h2 className="panel-title">
            <MapPin className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            采样点列表
          </h2>
          <div className="mt-4 grid gap-2">
            {samplingSites.map((item) => (
              <button key={item.site} className={`sampling-site-row ${selectedSite === item.site ? 'active' : ''}`} onClick={() => setSelectedSite(item.site)}>
                <strong>{item.site}</strong>
                <span>{item.waterType} · {item.sampleCount} 个样本</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="panel-title">采样记录表</h2>
          <div className="mt-4">
            <DataTable
              headers={['图片名', '采样编号', '识别结果', '置信度', '复核状态', '同步分布', '操作']}
              rows={rows.map((item) => [
                item.imageName,
                item.samplingId,
                item.result,
                formatPercent(item.confidence),
                <StatusPill status={item.reviewStatus} />,
                '是',
                <button className="link-button" onClick={() => onNotify('success', `${item.id} 已打开。`)}>查看详情</button>
              ])}
            />
          </div>
        </Panel>

        <Panel>
          <h2 className="panel-title">当前采样点详情</h2>
          <div className="mt-4 grid gap-3">
            <Field label="采样点"><TextInput value={site.site} readOnly /></Field>
            <Field label="经纬度或地图选点"><TextInput value="30.5126, 114.4028" readOnly /></Field>
            <Field label="水体类型"><TextInput value={site.waterType} readOnly /></Field>
            <Field label="最近采样时间"><TextInput value={site.latestTime} readOnly /></Field>
          </div>
          <div className="mt-5 grid gap-2">
            {parameters.map(([label, value]) => (
              <div key={label} className="file-row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <button className="primary-button mt-5 w-full px-4 py-2" onClick={() => onNotify('success', `${site.site} 已同步到分布图谱。`)}>
            同步到分布图谱
          </button>
        </Panel>
      </section>
    </div>
  )
}
