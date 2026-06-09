import DataSourceBadge from '../distribution/DataSourceBadge'

export default function DistributionRecordPopup({ record, onNotify }) {
  const isLocal = record.source === 'LocalSampling' || record.source === '人工导入'

  return (
    <div className="record-popup">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <strong>{isLocal ? `采样点：${record.locality}` : record.scientificName}</strong>
          <p>{record.speciesName} {record.scientificName}</p>
        </div>
        <DataSourceBadge source={record.source} />
      </div>
      <dl>
        <Row label="记录时间" value={record.eventDate} />
        <Row label="国家 / 地区" value={`${record.country} / ${record.region}`} />
        <Row label="坐标" value={`${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`} />
        <Row label="水体类型" value={record.waterType} />
        <Row label="记录状态" value={record.verificationStatus} />
        {isLocal && <Row label="采样编号" value={record.sourceRecordId} />}
        {isLocal && <Row label="样本数量" value={record.sampleCount} />}
        {isLocal && <Row label="平均置信度" value={record.confidence ? `${record.confidence}%` : '-'} />}
        {isLocal && <Row label="pH / 水温 / 透明度" value={`${record.ph ?? '-'} / ${record.temperature ?? '-'}℃ / ${record.transparency ?? '-'} cm`} />}
        {!isLocal && <Row label="记录类型" value={record.recordType} />}
      </dl>
      <div className="mt-3 flex gap-2">
        <button className="map-popup-button" onClick={() => onNotify?.('success', isLocal ? '采样记录已打开。' : '来源记录已打开。')}>
          {isLocal ? '查看采样记录' : '查看来源'}
        </button>
        <button className="map-popup-button" onClick={() => onNotify?.('success', isLocal ? '已加入报告。' : '已加入对比。')}>
          {isLocal ? '生成报告' : '加入对比'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? '-'}</dd>
    </div>
  )
}
