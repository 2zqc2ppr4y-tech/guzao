import { DataTable } from '../ui'

export default function SpeciesRankingTable({ rows, onSelect }) {
  return (
    <DataTable
      headers={['物种 / 类群', '公开记录数', '本地记录数', '覆盖区域', '主要水体', '最近记录', '操作']}
      rows={rows.map((item) => [
        item.species,
        item.publicCount,
        item.localCount,
        item.regions,
        item.mainWater,
        item.latest,
        <button className="link-button" onClick={() => onSelect?.(item.species)}>查看分布</button>
      ])}
    />
  )
}
