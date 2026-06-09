import { CircleMarker, Popup } from 'react-leaflet'
import { getRecordColor } from '../../services/distribution/distributionService'
import DistributionRecordPopup from './DistributionRecordPopup'

export default function PublicOccurrenceLayer({ records, mode, onNotify }) {
  return records.map((record) => (
    <CircleMarker
      key={record.id}
      center={[record.latitude, record.longitude]}
      radius={record.source === 'LocalSampling' ? 8 : 6}
      pathOptions={{
        color: getRecordColor(record, mode),
        fillColor: getRecordColor(record, mode),
        fillOpacity: record.source === 'LocalSampling' ? 0.86 : 0.62,
        weight: 1.5
      }}
    >
      <Popup minWidth={280}>
        <DistributionRecordPopup record={record} onNotify={onNotify} />
      </Popup>
    </CircleMarker>
  ))
}
