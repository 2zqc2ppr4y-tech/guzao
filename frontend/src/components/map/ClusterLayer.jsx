import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { useMap } from 'react-leaflet'
import { getRecordColor } from '../../services/distribution/distributionService'

export default function ClusterLayer({ records, mode, onSelect }) {
  const map = useMap()

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount()
        return L.divIcon({
          html: `<span>${count}</span>`,
          className: 'distribution-cluster',
          iconSize: L.point(42, 42)
        })
      }
    })

    records.forEach((record) => {
      const color = getRecordColor(record, mode)
      const marker = L.marker([record.latitude, record.longitude], {
        icon: L.divIcon({
          className: 'distribution-dot-icon',
          html: `<span style="background:${color}"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      })
      marker.on('click', () => onSelect(record))
      group.addLayer(marker)
    })

    map.addLayer(group)
    return () => map.removeLayer(group)
  }, [map, mode, onSelect, records])

  return null
}
