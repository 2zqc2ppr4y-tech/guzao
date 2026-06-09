export function filterDistributionRecords(records = [], filters = {}) {
  return records.filter((record) => {
    const speciesMatch = !filters.species || filters.species === '全部' || record.genus === filters.species || record.speciesName === filters.species
    const sourceMatch = !filters.source || filters.source === '全部' || record.source === filters.source
    const waterMatch = !filters.waterType || filters.waterType === '全部' || record.waterType === filters.waterType
    const statusMatch = !filters.status || filters.status === '全部' || record.verificationStatus === filters.status
    const dateMatch = matchTimeRange(record.eventDate, filters.timeRange)
    const boundsMatch = !filters.bounds || insideBounds(record, filters.bounds)
    return speciesMatch && sourceMatch && waterMatch && statusMatch && dateMatch && boundsMatch
  })
}

export function getDistributionStats(records, updatedAt = '暂无真实分布数据') {
  const publicRecords = records.filter((record) => record.source === 'GBIF' || record.source === 'iNaturalist')
  const localRecords = records.filter((record) => record.source === 'LocalSampling' || record.source === '人工导入')
  const countries = new Set(publicRecords.map((record) => record.country).filter(Boolean))
  const localSites = new Set(localRecords.map((record) => record.locality).filter(Boolean))
  const species = new Set(records.map((record) => record.genus).filter(Boolean))
  const waterTypes = [...new Set(records.map((record) => record.waterType).filter(Boolean))].join('、') || '暂无真实记录'
  return [
    { label: '真实分布记录', value: records.length, hint: '数据库 distribution_records' },
    { label: '覆盖国家 / 地区', value: countries.size, hint: '按公开真实记录统计' },
    { label: '本地明确坐标点', value: localSites.size, hint: '仅保留明确坐标记录' },
    { label: '已出现类群', value: species.size, hint: '当前筛选结果中的属' },
    { label: '主要水体', value: waterTypes, hint: '来自真实记录字段' },
    { label: '数据更新时间', value: updatedAt, hint: '数据库最近同步时间' }
  ]
}

export function getSpeciesDistributionSummary(records, species = '全部') {
  const target = species === '全部' ? records : records.filter((record) => record.genus === species || record.speciesName === species)
  const publicCount = target.filter((record) => ['GBIF', 'iNaturalist'].includes(record.source)).length
  const localCount = target.filter((record) => ['LocalSampling', '人工导入'].includes(record.source)).length
  const regions = topCounts(target, 'region').slice(0, 4)
  const waterTypes = topCounts(target, 'waterType').slice(0, 3)
  const latest = target.map((record) => record.eventDate).filter(Boolean).sort().at(-1) || '暂无记录'
  const speciesLabel = species === '全部' ? '当前筛选类群' : species
  return {
    publicCount,
    localCount,
    latest,
    mainRegions: regions.map((item) => item.label).join('、') || '暂无记录',
    waterTypes: waterTypes.map((item) => item.label).join('、') || '暂无记录',
    text: target.length
      ? `${speciesLabel}当前显示 ${publicCount} 条公开真实记录与 ${localCount} 条本地明确坐标记录。`
      : `${speciesLabel}暂无真实分布记录，地图保持空状态。`
  }
}

export function getRegionRanking(records) {
  return topCounts(records, 'region').map((item) => {
    const regionRecords = records.filter((record) => (record.region || '未记录') === item.label)
    return {
      region: item.label,
      count: item.value,
      mainSpecies: topCounts(regionRecords, 'genus')[0]?.label || '未记录',
      source: topCounts(regionRecords, 'source')[0]?.label || '未记录',
      latest: regionRecords.map((record) => record.eventDate).filter(Boolean).sort().at(-1) || '-',
      localSites: new Set(regionRecords.filter((record) => record.source === 'LocalSampling').map((record) => record.locality)).size
    }
  })
}

export function getSpeciesRanking(records) {
  return topCounts(records, 'genus').map((item) => {
    const speciesRecords = records.filter((record) => (record.genus || '未记录') === item.label)
    return {
      species: item.label,
      publicCount: speciesRecords.filter((record) => ['GBIF', 'iNaturalist'].includes(record.source)).length,
      localCount: speciesRecords.filter((record) => ['LocalSampling', '人工导入'].includes(record.source)).length,
      regions: new Set(speciesRecords.map((record) => record.region).filter(Boolean)).size,
      mainWater: topCounts(speciesRecords, 'waterType')[0]?.label || '未记录',
      latest: speciesRecords.map((record) => record.eventDate).filter(Boolean).sort().at(-1) || '-'
    }
  })
}

export function getRecordColor(record, mode = 'species') {
  if (record.verificationStatus === '低置信度') return '#ef4444'
  if (mode === 'waterType') return waterTypeColors[record.waterType] || waterTypeColors.未知
  if (record.source === 'LocalSampling') return '#22c55e'
  if (record.source === '人工导入') return '#f59e0b'
  return colorForText(record.genus || record.speciesName || '其他')
}

export function toGeoJson(records) {
  return {
    type: 'FeatureCollection',
    features: records.map((record) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [record.longitude, record.latitude] },
      properties: record
    }))
  }
}

const waterTypeColors = {
  湖泊: '#38bdf8',
  池塘: '#14b8a6',
  湿地: '#22c55e',
  水田: '#f59e0b',
  河流: '#818cf8',
  水库: '#a78bfa',
  未知: '#94a3b8'
}

function colorForText(text) {
  const palette = ['#14b8a6', '#38bdf8', '#f59e0b', '#22c55e', '#818cf8', '#a78bfa', '#ef4444', '#eab308']
  let hash = 0
  for (const char of String(text)) hash = (hash + char.charCodeAt(0)) % palette.length
  return palette[hash]
}

function matchTimeRange(eventDate, range) {
  if (!range || range === '全部' || range === '自定义') return true
  const year = Number(String(eventDate).slice(0, 4))
  if (!year) return true
  const currentYear = new Date().getFullYear()
  if (range === '最近一年') return year >= currentYear - 1
  if (range === '最近五年') return year >= currentYear - 5
  return true
}

function insideBounds(record, bounds) {
  const { south, west, north, east } = bounds
  return record.latitude >= south && record.latitude <= north && record.longitude >= west && record.longitude <= east
}

function topCounts(records, key) {
  const map = new Map()
  records.forEach((record) => {
    const label = record[key] || '未记录'
    map.set(label, (map.get(label) || 0) + 1)
  })
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}
