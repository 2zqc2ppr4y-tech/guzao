import PublicOccurrenceLayer from './PublicOccurrenceLayer'

export default function LocalSamplingLayer({ records, mode, onNotify }) {
  return <PublicOccurrenceLayer records={records.filter((record) => record.source === 'LocalSampling' || record.source === '人工导入')} mode={mode} onNotify={onNotify} />
}
