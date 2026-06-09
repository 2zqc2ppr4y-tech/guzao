import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, ScaleControl, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import ClusterLayer from './ClusterLayer'
import HeatmapLayer from './HeatmapLayer'
import LocalSamplingLayer from './LocalSamplingLayer'
import MapLayerControl from './MapLayerControl'
import MapLegend from './MapLegend'
import PublicOccurrenceLayer from './PublicOccurrenceLayer'

const distributionScaleViews = {
  世界: { center: [24, 18], zoom: 2 },
  亚洲: { center: [34, 103], zoom: 4 },
  中国: { center: [35.8, 104.2], zoom: 5 },
  省级区域: { center: [30.6, 114.35], zoom: 9 },
  当前视野: null
}

export default function DistributionMap({ records, filters, setFilters, onBoundsChange, onNotify }) {
  const [activeLayers, setActiveLayers] = useState(['世界分布点', '本地采样点'])
  const [selectedRecord, setSelectedRecord] = useState(null)

  const toggleLayer = (layer) => {
    setActiveLayers((current) => (current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer]))
  }

  const visibleRecords = useMemo(() => {
    if (activeLayers.includes('低置信度点位')) return records.filter((record) => record.verificationStatus === '低置信度')
    return records
  }, [activeLayers, records])

  const colorMode = activeLayers.includes('水体类型') ? 'waterType' : 'species'
  const showCluster = filters.displayMode === '聚合模式' || filters.displayMode === '区域统计模式'
  const showHeat = filters.displayMode === '热力图模式' || activeLayers.includes('热力分布')
  const showLocalOnly = activeLayers.includes('本地采样点') && !activeLayers.includes('世界分布点')

  const handleSelect = useCallback((record) => {
    setSelectedRecord(record)
    onNotify?.('success', `${record.locality || record.scientificName} 已选中。`)
  }, [onNotify])

  return (
    <div className="distribution-map-shell">
      <MapContainer center={[30.6, 114.35]} zoom={4} minZoom={2} maxZoom={14} scrollWheelZoom className="distribution-map">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ScaleControl position="bottomleft" metric imperial={false} />
        <MapEventBridge filters={filters} onBoundsChange={onBoundsChange} />
        <MapScaleSync scale={filters.scale} />
        {showHeat && <HeatmapLayer records={visibleRecords} />}
        {!showHeat && showCluster && <ClusterLayer records={visibleRecords} mode={colorMode} onSelect={handleSelect} />}
        {!showHeat && !showCluster && activeLayers.includes('世界分布点') && (
          <PublicOccurrenceLayer records={showLocalOnly ? [] : visibleRecords} mode={colorMode} onNotify={onNotify} />
        )}
        {!showHeat && !showCluster && activeLayers.includes('本地采样点') && (
          <LocalSamplingLayer records={visibleRecords} mode={colorMode} onNotify={onNotify} />
        )}
      </MapContainer>
      <MapLayerControl activeLayers={activeLayers} onToggle={toggleLayer} />
      <MapLegend mode={activeLayers.includes('水体类型') ? '水体类型' : '物种分布'} />
      <div className="map-selection-card">
        <strong>框选区域统计</strong>
        <p>当前视野内 {records.length} 条记录。拖拽或缩放地图后，统计会按当前视野刷新。</p>
        {selectedRecord && <span>已选中：{selectedRecord.locality || selectedRecord.scientificName}</span>}
      </div>
    </div>
  )
}

function MapScaleSync({ scale }) {
  const map = useMap()
  const view = distributionScaleViews[scale]

  useEffect(() => {
    if (view) map.flyTo(view.center, view.zoom, { duration: 0.7 })
  }, [map, view])

  return null
}

function MapEventBridge({ onBoundsChange }) {
  const map = useMapEvents({
    moveend() {
      const bounds = map.getBounds()
      onBoundsChange?.({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast()
      })
    },
    zoomend() {
      const bounds = map.getBounds()
      onBoundsChange?.({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast()
      })
    }
  })
  return null
}
