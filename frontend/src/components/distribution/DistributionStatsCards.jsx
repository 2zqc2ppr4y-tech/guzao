import { MapPin } from 'lucide-react'
import { StatCard } from '../ui'

export default function DistributionStatsCards({ stats }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {stats.map((item) => <StatCard key={item.label} {...item} icon={MapPin} />)}
    </section>
  )
}
