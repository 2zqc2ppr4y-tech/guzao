import { Filter } from 'lucide-react'
import ScaleSelector from './ScaleSelector'

const sources = ['全部', 'GBIF', 'iNaturalist', 'LocalSampling', '人工导入']
const timeRanges = ['全部', '最近一年', '最近五年', '自定义']
const waterTypes = ['全部', '湖泊', '池塘', '湿地', '水田', '河流', '水库']
const displayModes = ['点位模式', '聚合模式', '热力图模式', '区域统计模式']
const statuses = ['全部', '已验证', '已复核', '待复核', '低置信度', '数据缺失', '公开记录']

export default function SpeciesFilterPanel({ filters, genera = [], onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })
  const speciesOptions = [
    { value: '全部', label: '全部' },
    ...genera
      .filter((item) => item.scientific_genus)
      .map((item) => ({ value: item.scientific_genus, label: item.display_name }))
  ]

  return (
    <aside className="distribution-filter-panel">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-5 w-5" style={{ color: 'var(--primary)' }} />
        <h2>筛选与显示</h2>
      </div>
      <FilterBlock label="地图尺度">
        <ScaleSelector value={filters.scale} onChange={(value) => update('scale', value)} />
      </FilterBlock>
      <FilterBlock label="鼓藻类群">
        <Select value={filters.species} options={speciesOptions.map((item) => item.value)} labels={speciesOptions} onChange={(value) => update('species', value)} />
      </FilterBlock>
      <FilterBlock label="数据来源">
        <Select value={filters.source} options={sources} onChange={(value) => update('source', value)} />
      </FilterBlock>
      <FilterBlock label="时间范围">
        <Select value={filters.timeRange} options={timeRanges} onChange={(value) => update('timeRange', value)} />
      </FilterBlock>
      <FilterBlock label="水体类型">
        <Select value={filters.waterType} options={waterTypes} onChange={(value) => update('waterType', value)} />
      </FilterBlock>
      <FilterBlock label="显示模式">
        <Select value={filters.displayMode} options={displayModes} onChange={(value) => update('displayMode', value)} />
      </FilterBlock>
      <FilterBlock label="记录状态">
        <Select value={filters.status} options={statuses} onChange={(value) => update('status', value)} />
      </FilterBlock>
    </aside>
  )
}

function FilterBlock({ label, children }) {
  return (
    <label className="filter-block">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Select({ value, options, labels, onChange }) {
  return (
    <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => {
        const label = labels?.find((item) => item.value === option)?.label || option
        return <option key={option} value={option}>{label}</option>
      })}
    </select>
  )
}
