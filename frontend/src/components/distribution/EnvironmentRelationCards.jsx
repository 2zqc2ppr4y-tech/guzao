import { AlertTriangle, Compass, Database, MapPinned, Waves } from 'lucide-react'

export default function EnvironmentRelationCards({ records }) {
  const topSpecies = top(records, 'genus')
  const topRegion = top(records, 'region')
  const missingRegions = ['非洲内陆湿地', '南美高海拔湖泊', '西北干旱区水库']
  const supplement = ['本地低置信度点位', '公开记录稀疏区域', '水体参数缺失样点']

  const cards = [
    { icon: Waves, title: '当前视野记录最多类群', text: topSpecies ? `${topSpecies.label}，${topSpecies.value} 条记录。` : '暂无记录。' },
    { icon: MapPinned, title: '样本最集中区域', text: topRegion ? `${topRegion.label}，${topRegion.value} 条记录。` : '暂无记录。' },
    { icon: Database, title: '数据覆盖不足区域', text: missingRegions.join('、') },
    { icon: Compass, title: '建议补充采样区域', text: supplement.join('、') },
    { icon: AlertTriangle, title: '数据来源说明', text: '当前分布结果受公开数据库记录密度、采样偏好和坐标完整性影响，不能直接代表真实生物量，仅用于分布参考和采样规划。' }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <article key={card.title} className="environment-card">
            <Icon className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        )
      })}
    </div>
  )
}

function top(records, key) {
  const map = new Map()
  records.forEach((record) => {
    const value = record[key] || '未记录'
    map.set(value, (map.get(value) || 0) + 1)
  })
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)[0]
}
