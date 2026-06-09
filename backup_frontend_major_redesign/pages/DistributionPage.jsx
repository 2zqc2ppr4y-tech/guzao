import { useEffect, useMemo, useState } from 'react'
import { Database, Download, Globe2 } from 'lucide-react'
import { fetchDesmidGenera, fetchDistributionRecords } from '../api'
import DistributionStatsCards from '../components/distribution/DistributionStatsCards'
import EnvironmentRelationCards from '../components/distribution/EnvironmentRelationCards'
import RegionRankingTable from '../components/distribution/RegionRankingTable'
import SpeciesDistributionPanel from '../components/distribution/SpeciesDistributionPanel'
import SpeciesFilterPanel from '../components/distribution/SpeciesFilterPanel'
import SpeciesRankingTable from '../components/distribution/SpeciesRankingTable'
import DistributionMap from '../components/map/DistributionMap'
import { PageIntro, Panel, downloadCsv } from '../components/ui'
import {
  filterDistributionRecords,
  getDistributionStats,
  getRegionRanking,
  getSpeciesDistributionSummary,
  getSpeciesRanking,
  toGeoJson
} from '../services/distribution/distributionService'

const defaultFilters = {
  scale: '世界',
  species: '全部',
  source: '全部',
  timeRange: '全部',
  waterType: '全部',
  displayMode: '聚合模式',
  status: '全部'
}

export default function DistributionPage({ onNotify }) {
  const [filters, setFilters] = useState(() => {
    const species = window.sessionStorage.getItem('distributionSpecies')
    if (species) {
      window.sessionStorage.removeItem('distributionSpecies')
      return { ...defaultFilters, species }
    }
    return defaultFilters
  })
  const [bounds, setBounds] = useState(null)
  const [allRecords, setAllRecords] = useState([])
  const [genera, setGenera] = useState([])
  const [updatedAt, setUpdatedAt] = useState('暂无真实分布数据')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchDistributionRecords(), fetchDesmidGenera()])
      .then(([recordPayload, generaPayload]) => {
        const records = recordPayload.items || []
        setAllRecords(records)
        setGenera(generaPayload.items || [])
        setUpdatedAt(records.map((item) => item.syncedAt || item.eventDate || '').filter(Boolean).sort().at(-1) || '暂无真实分布数据')
      })
      .catch((error) => onNotify?.('error', error.message))
      .finally(() => setLoading(false))
  }, [onNotify])

  const records = useMemo(() => {
    const scope = filters.scale === '当前视野' ? bounds : null
    return filterDistributionRecords(allRecords, { ...filters, bounds: scope })
  }, [allRecords, bounds, filters])

  const stats = useMemo(() => getDistributionStats(records, updatedAt), [records, updatedAt])
  const speciesSummary = useMemo(() => getSpeciesDistributionSummary(records, filters.species), [filters.species, records])
  const regionRanking = useMemo(() => getRegionRanking(records), [records])
  const speciesRanking = useMemo(() => getSpeciesRanking(records), [records])

  const exportGeoJson = () => {
    const blob = new Blob([JSON.stringify(toGeoJson(records), null, 2)], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'desmid-distribution.geojson'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    onNotify?.('success', 'GeoJSON 已导出。')
  }

  const exportCsv = () => {
    downloadCsv('desmid-distribution.csv', [
      ['id', 'source', 'speciesName', 'scientificName', 'latitude', 'longitude', 'country', 'region', 'eventDate', 'waterType', 'verificationStatus'],
      ...records.map((record) => [
        record.id,
        record.source,
        record.speciesName,
        record.scientificName,
        record.latitude,
        record.longitude,
        record.country,
        record.region,
        record.eventDate,
        record.waterType,
        record.verificationStatus
      ])
    ])
    onNotify?.('success', '分布记录 CSV 已导出。')
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="分布图谱"
        title="鼓藻全球与区域分布图谱"
        text="支持从世界地图缩放到区域采样点，按物种、时间、水体类型和数据来源查看鼓藻分布情况。"
        action={
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button px-4 py-2" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              导出 CSV
            </button>
            <button className="primary-button px-4 py-2" onClick={exportGeoJson}>
              <Globe2 className="h-4 w-4" />
              导出 GeoJSON
            </button>
          </div>
        }
      />

      <DistributionStatsCards stats={stats} />

      <section className="distribution-layout">
        <div className="distribution-map-column">
          <DistributionMap records={records} filters={filters} setFilters={setFilters} onBoundsChange={setBounds} onNotify={onNotify} />
        </div>
        <div className="distribution-side-column">
          <SpeciesFilterPanel filters={filters} genera={genera} onChange={setFilters} />
          <SpeciesDistributionPanel species={filters.species} summary={speciesSummary} meta={{ updatedAt, source: 'Database' }} />
          <Panel className="data-source-note">
            <h3 className="panel-title">
              <Database className="h-5 w-5" style={{ color: 'var(--primary)' }} />
              数据来源与更新时间
            </h3>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              本页面只展示后端数据库中的真实分布记录。公开记录来自 GBIF / iNaturalist 同步，本地记录必须有明确坐标才会进入地图；没有真实点位时地图保持空状态。
            </p>
            <span className="mt-3 block text-sm" style={{ color: 'var(--primary)' }}>更新时间：{updatedAt}</span>
          </Panel>
        </div>
      </section>

      {!loading && records.length === 0 && (
        <Panel>
          <h2 className="panel-title">暂无真实分布点</h2>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>当前筛选条件下数据库没有真实坐标记录，地图保持空状态。</p>
        </Panel>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="panel-title">区域分布排行</h2>
          <div className="mt-4">
            <RegionRankingTable rows={regionRanking} onNotify={onNotify} />
          </div>
        </Panel>
        <Panel>
          <h2 className="panel-title">物种分布排行</h2>
          <div className="mt-4">
            <SpeciesRankingTable rows={speciesRanking} onSelect={(species) => setFilters({ ...filters, species })} />
          </div>
        </Panel>
      </section>

      <Panel>
        <h2 className="panel-title">分布解释与数据提示</h2>
        <div className="mt-4">
          <EnvironmentRelationCards records={records} />
        </div>
      </Panel>
    </div>
  )
}
