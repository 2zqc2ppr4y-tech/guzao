import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { speciesInfos } from '../data/mockData'
import { formatPercent, PageIntro, Panel, ProgressBar, SectionHeading } from '../components/ui'

const filterOptions = {
  morphologyType: ['全部形态', '弯月形', '双半细胞', '裂片型', '星状', '长柱形'],
  cellStructure: ['全部结构', '中央缢缩', '放射状裂片', '端部圆钝', '角突结构', '长梭形单细胞'],
  commonWater: ['全部水体', '湖泊', '池塘', '湿地', '水田', '沟渠'],
  difficulty: ['全部难度', '中等', '较难'],
  samples: ['全部样本量', '样本充足', '样本不足']
}

export default function SpeciesAtlasPage() {
  const [keyword, setKeyword] = useState('')
  const [filters, setFilters] = useState({
    morphologyType: '全部形态',
    cellStructure: '全部结构',
    commonWater: '全部水体',
    difficulty: '全部难度',
    samples: '全部样本量'
  })
  const [selectedId, setSelectedId] = useState(speciesInfos[0].id)

  const list = useMemo(() => {
    return speciesInfos.filter((item) => {
      const matchKeyword = [item.name, item.latin, item.typicalMorphology, item.habitat].join(' ').includes(keyword.trim())
      const matchMorph = filters.morphologyType === '全部形态' || item.morphologyType === filters.morphologyType
      const matchStructure = filters.cellStructure === '全部结构' || item.cellStructure.includes(filters.cellStructure)
      const matchWater = filters.commonWater === '全部水体' || item.commonWater.includes(filters.commonWater)
      const matchDifficulty = filters.difficulty === '全部难度' || item.difficulty === filters.difficulty
      const matchSamples =
        filters.samples === '全部样本量' ||
        (filters.samples === '样本充足' ? item.trainingSamples >= 1000 : item.trainingSamples < 1000)
      return matchKeyword && matchMorph && matchStructure && matchWater && matchDifficulty && matchSamples
    })
  }, [filters, keyword])

  const selected = speciesInfos.find((item) => item.id === selectedId) || list[0] || speciesInfos[0]

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="物种图谱"
        title="鼓藻物种信息、相似物种对比与模型识别难点"
        text="将原知识库升级为可检索、可筛选、可对比的物种图谱，直接服务识别解释、人工复核和训练数据治理。"
      />

      <Panel>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(5,0.8fr)]">
          <label className="search-box">
            <Search className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索中文名、拉丁名、形态描述" />
          </label>
          {Object.entries(filterOptions).map(([key, options]) => (
            <select key={key} className="form-input" value={filters[key]} onChange={(e) => updateFilter(key, e.target.value)}>
              {options.map((option) => <option key={option}>{option}</option>)}
            </select>
          ))}
        </div>
      </Panel>

      <section className="species-layout">
        <div className="grid gap-4">
          {list.map((item) => (
            <article key={item.id} className={`species-card ${selected.id === item.id ? 'species-card-active' : ''}`} onClick={() => setSelectedId(item.id)}>
              <img src={item.image} alt={item.name} />
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3>{item.name}</h3>
                    <p className="italic">{item.latin}</p>
                  </div>
                  <span className={item.trainingSamples < 1000 ? 'sample-warning' : 'sample-ok'}>{item.trainingSamples} 张</span>
                </div>
                <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{item.typicalMorphology}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[item.morphologyType, item.cellStructure, item.difficulty].map((tag) => <span key={tag} className="mini-tag">{tag}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="species-detail">
          <SectionHeading eyebrow="详情与对比" title={`${selected.name} / ${selected.latin}`} />
          <img src={selected.image} alt={selected.name} className="mt-4 h-56 w-full rounded-lg object-cover" />
          <div className="mt-4 grid gap-3">
            <Detail label="典型形态" value={selected.typicalMorphology} />
            <Detail label="相似物种" value={selected.similarSpecies.join('、')} />
            <Detail label="识别难点" value={selected.identificationDifficulties} />
            <Detail label="常见生境" value={selected.habitat} />
            <Detail label="生态指示意义" value={selected.ecologicalIndicator} />
            <Detail label="训练样本数量" value={`${selected.trainingSamples} 张`} />
          </div>
          <div className="mt-4">
            <div className="chart-row-label">
              <span>模型识别准确率</span>
              <strong>{formatPercent(selected.modelAccuracy)}</strong>
            </div>
            <ProgressBar value={selected.modelAccuracy} color={selected.modelAccuracy < 0.85 ? '#f59e0b' : '#14b8a6'} />
          </div>
          <div className="insight-note mt-5">
            <h3>相似物种对比</h3>
            <div className="mt-3 grid gap-3">
              {selected.compare.map((item) => (
                <div key={item.species} className="compare-row">
                  <strong>{item.species}</strong>
                  <p>{item.difference}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="explain-item">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  )
}
