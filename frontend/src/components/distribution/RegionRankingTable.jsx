import { DataTable } from '../ui'

export default function RegionRankingTable({ rows, onNotify }) {
  return (
    <DataTable
      headers={['区域', '记录数', '主要类群', '数据来源', '最近记录', '本地采样点数', '操作']}
      rows={rows.map((item) => [
        item.region,
        item.count,
        item.mainSpecies,
        item.source,
        item.latest,
        item.localSites,
        <button className="link-button" onClick={() => onNotify?.('success', `${item.region} 已加入区域报告。`)}>加入报告</button>
      ])}
    />
  )
}
