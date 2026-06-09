import { speciesColors, waterTypeColors } from '../../data/distribution/mockDistributionData'

export default function MapLegend({ mode }) {
  const items = mode === '水体类型' ? waterTypeColors : speciesColors
  return (
    <div className="map-legend">
      <strong>{mode === '水体类型' ? '水体类型' : '类群颜色'}</strong>
      {Object.entries(items).slice(0, 8).map(([label, color]) => (
        <span key={label}>
          <i style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}
