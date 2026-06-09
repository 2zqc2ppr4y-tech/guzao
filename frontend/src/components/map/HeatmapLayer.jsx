import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import { useMap } from 'react-leaflet'

export default function HeatmapLayer({ records }) {
  const map = useMap()

  useEffect(() => {
    const points = records.map((record) => [record.latitude, record.longitude, record.source === 'LocalSampling' ? 0.9 : 0.55])
    const layer = L.heatLayer(points, {
      radius: 28,
      blur: 18,
      minOpacity: 0.28,
      gradient: { 0.2: '#38bdf8', 0.45: '#14b8a6', 0.75: '#f59e0b', 1: '#ef4444' }
    })
    map.addLayer(layer)
    return () => map.removeLayer(layer)
  }, [map, records])

  return null
}
