import { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, Search } from 'lucide-react'
import { apiUrl, fetchDesmidGenera, fetchDistributionRecords } from '../api'
import { PageIntro, Panel } from '../components/ui'

function archiveImageSrc(image) {
  if (!image?.url) return ''
  return image.url.startsWith('http') ? image.url : apiUrl(image.url)
}

export default function SpeciesArchivePage({ onNavigate, onNotify }) {
  const [keyword, setKeyword] = useState('')
  const [genera, setGenera] = useState([])
  const [records, setRecords] = useState([])
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    Promise.all([fetchDesmidGenera(), fetchDistributionRecords()])
      .then(([generaPayload, recordPayload]) => {
        const nextGenera = generaPayload.items || []
        setGenera(nextGenera)
        setRecords(recordPayload.items || [])
        setSelectedId(nextGenera[0]?.id || '')
      })
      .catch((error) => onNotify?.('error', error.message))
  }, [onNotify])

  const list = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return genera.filter((item) => [item.display_name, item.scientific_genus, item.chinese_name].join(' ').toLowerCase().includes(text))
  }, [genera, keyword])

  const selected = genera.find((item) => item.id === selectedId) || list[0] || genera[0]
  const selectedRecords = selected
    ? records.filter((record) => record.genus === selected.scientific_genus || record.speciesName === selected.chinese_name)
    : []

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="物种档案"
        title="鼓藻属名录"
        text="属名来自用户提供的分类截图并写入数据库；没有拉丁属名的条目不做推断。"
      />

      <Panel>
        <label className="search-box">
          <Search className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索中文属名或拉丁属名" />
        </label>
      </Panel>

      <section className="species-layout">
        <div className="grid gap-4">
          {list.map((item) => (
            <article key={item.id} className={`species-card ${selected?.id === item.id ? 'species-card-active' : ''}`} onClick={() => setSelectedId(item.id)}>
              {item.representative_image ? (
                <img src={archiveImageSrc(item.representative_image)} alt={`${item.chinese_name}真实图片`} loading="lazy" />
              ) : (
                <div className="species-thumb-empty">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3>{item.chinese_name}</h3>
                    <p className="italic">{item.scientific_genus || '未提供拉丁属名'}</p>
                  </div>
                  <span className="mini-tag">真实图片 {item.image_count || 0}</span>
                </div>
                <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{item.source_note}</p>
              </div>
            </article>
          ))}
        </div>

        {selected && (
          <aside className="species-detail">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{selected.chinese_name}</h2>
                <p className="mt-1 italic" style={{ color: 'var(--text-2)' }}>{selected.scientific_genus || '未提供拉丁属名'}</p>
              </div>
              <button
                className="primary-button px-4 py-2"
                disabled={!selected.scientific_genus}
                onClick={() => {
                  window.sessionStorage.setItem('distributionSpecies', selected.scientific_genus)
                  onNavigate('distribution')
                }}
              >
                查看分布
              </button>
            </div>
            {selected.images?.length > 0 && (
              <div className="species-gallery mt-5">
                {selected.images.map((image) => (
                  <figure key={image.id}>
                    <img src={archiveImageSrc(image)} alt={`${selected.chinese_name}图库图片`} loading="lazy" />
                    <figcaption>{image.width}×{image.height}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            <div className="mt-5 grid gap-3">
              <Detail label="中文属名" value={selected.chinese_name} />
              <Detail label="拉丁属名" value={selected.scientific_genus || '用户截图未提供，系统不推断'} />
              <Detail label="真实图库图片" value={`${selected.image_count || 0} 张${selected.image_source_folder ? ` / ${selected.image_source_folder}` : ''}`} />
              <Detail label="真实分布记录" value={`${selectedRecords.length} 条`} />
              <Detail label="公开记录" value={`${selected.public_count || 0} 条`} />
              <Detail label="本地明确坐标记录" value={`${selected.local_count || 0} 条`} />
              <Detail label="数据说明" value="图片来自本机鼓藻压缩包解压目录，按属文件夹选取清晰度较高的真实记录。" />
            </div>
          </aside>
        )}
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
