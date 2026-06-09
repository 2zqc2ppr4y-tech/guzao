import { useMemo, useState } from 'react'
import { Activity, BarChart3, Database, Download, FileArchive, FileSpreadsheet, FileText, Gauge, PieChart, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { modelDatasets, sampleLibrary, samplingSites } from '../data/mockData'
import { distributionRecords } from '../data/distribution/mockDistributionData'
import { DataTable, downloadCsv, formatPercent, PageIntro, Panel, StatCard, StatusPill } from '../components/ui'
import DataSourceBadge from '../components/distribution/DataSourceBadge'

const tabs = ['样本数据', '采样点数据', '分布数据', '模型数据', '数据导入导出']

export default function DataWorkbenchPage({ onNotify }) {
  const [activeTab, setActiveTab] = useState('样本数据')
  const [filters, setFilters] = useState({ category: '全部类别', confidence: '全部置信度', review: '全部状态', site: '全部采样点', range: '近 30 天' })

  const filteredSamples = useMemo(() => {
    return sampleLibrary.filter((item) => {
      const matchCategory = filters.category === '全部类别' || item.result === filters.category
      const matchReview = filters.review === '全部状态' || item.reviewStatus === filters.review
      const matchSite = filters.site === '全部采样点' || item.site === filters.site
      const matchConfidence =
        filters.confidence === '全部置信度' ||
        (filters.confidence === '低于 80%' ? item.confidence < 0.8 : item.confidence >= 0.8)
      return matchCategory && matchReview && matchSite && matchConfidence
    })
  }, [filters])

  const summary = useMemo(() => {
    const total = filteredSamples.length
    const averageConfidence = total
      ? filteredSamples.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / total
      : 0
    const reviewed = filteredSamples.filter((item) => item.reviewStatus === '已复核').length
    const low = filteredSamples.filter((item) => Number(item.confidence || 0) < 0.8).length
    const inTraining = filteredSamples.filter((item) => item.inTrainingSet === '是').length
    return { total, averageConfidence, reviewed, low, inTraining }
  }, [filteredSamples])

  const categoryDistribution = useMemo(() => {
    const counts = filteredSamples.reduce((acc, item) => {
      acc[item.result] = (acc[item.result] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredSamples])

  const trendRows = useMemo(() => {
    const rows = filteredSamples.reduce((acc, item) => {
      const day = String(item.time || '').slice(5, 10) || '未知'
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})
    return Object.entries(rows)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [filteredSamples])

  const exportCurrent = (format) => {
    const filename = `data-workbench.${format === 'Excel' ? 'xlsx' : format.toLowerCase()}`
    downloadCsv(filename, [
      ['图片名', '采样编号', '识别结果', '置信度', '复核状态', '是否进入训练集'],
      ...filteredSamples.map((item) => [item.imageName, item.samplingId, item.result, formatPercent(item.confidence), item.reviewStatus, item.inTrainingSet])
    ])
    onNotify('success', `已导出 ${format}。`)
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="数据工作台"
        title="数据统计与样本资产工作台"
        text="集中查看样本检测趋势、类别分布、复核状态、分布数据和模型训练资产，让识别结果可分析、可导出、可治理。"
      />

      <section className="admin-stat-grid">
        <StatCard icon={Activity} label="筛选后样本" value={summary.total} hint="当前数据范围" />
        <StatCard icon={Gauge} label="平均置信度" value={formatPercent(summary.averageConfidence)} hint="模型稳定性" />
        <StatCard icon={BarChart3} label="低置信度样本" value={summary.low} hint="低于 80%" />
        <StatCard icon={Database} label="训练集样本" value={summary.inTraining} hint="可反哺模型" />
      </section>

      <section className="analytics-grid">
        <div className="console-card analytics-console">
          <div className="console-card-header">
            <span>detection.trend</span>
            <strong>检测趋势</strong>
          </div>
          <div className="trend-bar-list">
            {trendRows.length ? trendRows.map((item) => {
              const max = Math.max(...trendRows.map((row) => row.value), 1)
              return (
                <div key={item.label} className="trend-bar-row">
                  <span>{item.label}</span>
                  <div><i style={{ width: `${(item.value / max) * 100}%` }} /></div>
                  <strong>{item.value}</strong>
                </div>
              )
            }) : (
              <p className="console-empty">当前筛选范围暂无趋势数据。</p>
            )}
          </div>
        </div>

        <Panel className="analytics-card">
          <h2 className="panel-title">
            <PieChart className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            类别分布
          </h2>
          <div className="category-chip-list">
            {categoryDistribution.length ? categoryDistribution.map((item) => {
              const max = Math.max(...categoryDistribution.map((row) => row.value), 1)
              return (
                <div key={item.label} className="category-chip-row">
                  <span>{item.label}</span>
                  <div><i style={{ width: `${(item.value / max) * 100}%` }} /></div>
                  <strong>{item.value}</strong>
                </div>
              )
            }) : <p className="text-sm" style={{ color: 'var(--text-2)' }}>暂无类别统计。</p>}
          </div>
        </Panel>

        <Panel className="analytics-card">
          <h2 className="panel-title">
            <TrendingUp className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            复核与来源概览
          </h2>
          <div className="insight-list">
            <div><span>已复核样本</span><strong>{summary.reviewed}</strong></div>
            <div><span>采样点数量</span><strong>{samplingSites.length}</strong></div>
            <div><span>分布记录</span><strong>{distributionRecords.length}</strong></div>
            <div><span>模型类别</span><strong>{modelDatasets.length}</strong></div>
          </div>
        </Panel>
      </section>

      <Panel>
        <div className="panel-title mb-4">
          <SlidersHorizontal className="h-4 w-4" />
          筛选条件
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <Filter value={filters.category} onChange={(value) => setFilters({ ...filters, category: value })} options={['全部类别', '双星鼓藻', '新月鼓藻', '角星鼓藻', '棒形鼓藻']} />
          <Filter value={filters.confidence} onChange={(value) => setFilters({ ...filters, confidence: value })} options={['全部置信度', '80% 及以上', '低于 80%']} />
          <Filter value={filters.review} onChange={(value) => setFilters({ ...filters, review: value })} options={['全部状态', '已复核', '待复核']} />
          <Filter value={filters.site} onChange={(value) => setFilters({ ...filters, site: value })} options={['全部采样点', '南湖湿地北岸', '校园人工湖', '稻田沟渠样点']} />
          <Filter value={filters.range} onChange={(value) => setFilters({ ...filters, range: value })} options={['近 7 天', '近 30 天', '本学期', '全部时间']} />
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="tabs">
            {tabs.map((tab) => (
              <button key={tab} className={`tab-button ${activeTab === tab ? 'tab-button-active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportAction icon={Download} label="导出 CSV" onClick={() => exportCurrent('CSV')} />
            <ExportAction icon={FileSpreadsheet} label="导出 Excel" onClick={() => exportCurrent('Excel')} />
            <ExportAction icon={FileText} label="导出 PDF" onClick={() => onNotify('success', 'PDF 导出任务已创建。')} />
            <ExportAction icon={FileArchive} label="导出 YOLO 数据集格式" onClick={() => onNotify('success', 'YOLO 数据集格式已准备。')} />
          </div>
        </div>

        {activeTab === '样本数据' && (
          <DataTable
            headers={['图片名', '采样编号', '识别结果', '置信度', '复核状态', '是否进入训练集', '操作']}
            rows={filteredSamples.map((item) => [
              item.imageName,
              item.samplingId,
              item.result,
              formatPercent(item.confidence),
              <StatusPill status={item.reviewStatus} />,
              item.inTrainingSet,
              <button className="link-button" onClick={() => onNotify('success', `${item.id} 已打开。`)}>查看记录</button>
            ])}
          />
        )}

        {activeTab === '采样点数据' && (
          <DataTable
            headers={['采样点', '水体类型', '最近采样时间', '识别样本数', '优势类群', '历史趋势', '操作']}
            rows={samplingSites.map((item) => [item.site, item.waterType, item.latestTime, item.sampleCount, item.dominantGroup, item.trend, <button className="link-button" onClick={() => onNotify('success', `${item.site} 趋势已打开。`)}>{item.action}</button>])}
          />
        )}

        {activeTab === '分布数据' && (
          <DataTable
            headers={['记录 ID', '数据来源', '类群', '区域', '水体类型', '记录时间', '状态', '操作']}
            rows={distributionRecords.map((item) => [
              item.id,
              <DataSourceBadge source={item.source} />,
              item.genus,
              item.region,
              item.waterType,
              item.eventDate,
              <StatusPill status={item.verificationStatus} />,
              <button className="link-button" onClick={() => onNotify('success', `${item.id} 同步详情已打开。`)}>查看同步</button>
            ])}
          />
        )}

        {activeTab === '模型数据' && (
          <DataTable
            headers={['类别', '训练集数量', '验证集数量', '测试集数量', '准确率', '混淆最多类别', '待复核样本']}
            rows={modelDatasets.map((item, index) => [item.category, item.train, item.validation, item.test, formatPercent(item.accuracy), item.confusedWith, index + 2])}
          />
        )}

        {activeTab === '数据导入导出' && (
          <DataTable
            headers={['格式', '用途', '数据范围', '最近操作', '操作']}
            rows={[
              ['CSV', '采样表与识别结果交换', '样本、采样点、分布记录', '2026-05-24', <button className="link-button" onClick={() => exportCurrent('CSV')}>导出 CSV</button>],
              ['Excel', '教学与项目整理', '样本、报告摘要', '2026-05-24', <button className="link-button" onClick={() => exportCurrent('Excel')}>导出 Excel</button>],
              ['GeoJSON', '地图点位交换', '分布数据', '2026-05-24', <button className="link-button" onClick={() => onNotify('success', 'GeoJSON 导出已创建。')}>导出 GeoJSON</button>],
              ['KML', 'GIS/地球浏览器展示', '采样点与公开记录', '2026-05-24', <button className="link-button" onClick={() => onNotify('success', 'KML 导出已创建。')}>导出 KML</button>]
            ]}
          />
        )}
      </Panel>
    </div>
  )
}

function Filter({ value, options, onChange }) {
  return (
    <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  )
}

function ExportAction({ icon: Icon, label, onClick }) {
  return (
    <button className="secondary-button px-3 py-2" onClick={onClick}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
