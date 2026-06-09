const layers = [
  '世界分布点',
  '本地采样点',
  '热力分布',
  '物种分布',
  '水体类型',
  '低置信度点位'
]

export default function MapLayerControl({ activeLayers, onToggle }) {
  return (
    <div className="map-layer-control">
      <strong>图层</strong>
      {layers.map((layer) => (
        <label key={layer}>
          <input type="checkbox" checked={activeLayers.includes(layer)} onChange={() => onToggle(layer)} />
          <span>{layer}</span>
        </label>
      ))}
    </div>
  )
}
