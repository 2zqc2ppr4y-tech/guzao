import { Globe2 } from 'lucide-react'
import DataSourceBadge from './DataSourceBadge'

export default function SpeciesDistributionPanel({ summary, species, meta }) {
  return (
    <section className="species-distribution-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">
            <Globe2 className="h-4 w-4" />
            物种分布摘要
          </div>
          <h2>{species === '全部' ? '全部鼓藻类群' : species}</h2>
        </div>
        <DataSourceBadge source={meta.source} />
      </div>
      <p className="mt-4">{summary.text}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Info label="公开记录数" value={summary.publicCount} />
        <Info label="本地记录数" value={summary.localCount} />
        <Info label="主要出现区域" value={summary.mainRegions} />
        <Info label="常见水体类型" value={summary.waterTypes} />
        <Info label="最近记录时间" value={summary.latest} />
        <Info label="更新时间" value={meta.updatedAt} />
      </dl>
    </section>
  )
}

function Info({ label, value }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
