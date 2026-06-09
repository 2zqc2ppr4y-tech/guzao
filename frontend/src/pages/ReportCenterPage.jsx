import { Download, FileSpreadsheet, FileText, MapPinned } from 'lucide-react'
import { DataTable, PageIntro, Panel, StatusPill } from '../components/ui'

const reportTypes = [
  { title: '单图识别报告', samples: 1, source: '样本识别', content: '识别结果、形态依据、相似物种、数据限制说明' },
  { title: '批量识别报告', samples: 36, source: '样本识别', content: '批量表格、物种组成、低置信度样本、复核建议' },
  { title: '采样点报告', samples: 126, source: '采样记录', content: '采样点、环境参数、识别结果、复核状态' },
  { title: '区域分布报告', samples: 1328, source: 'GBIF / iNaturalist / LocalSampling', content: '地图截图、分布记录、区域排行、数据覆盖说明' },
  { title: '水样评估报告', samples: 64, source: '水样评估', content: '物种丰富度、优势类群、环境参数摘要、采样建议' }
]

const history = [
  ['RPT-20260522-018', '采样点报告', '南湖湿地北岸', '2026-05-22 11:20', '已生成'],
  ['RPT-20260521-007', '区域分布报告', '湖北武汉', '2026-05-21 18:05', '已生成'],
  ['RPT-20260520-002', '水样评估报告', '稻田沟渠样点', '2026-05-20 13:42', '草稿']
]

export default function ReportCenterPage({ onNotify }) {
  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="报告中心"
        title="单图、采样点、区域分布与水样评估报告"
        text="报告中心只负责成果输出、历史管理和导出，避免与识别、地图和采样记录功能混在一起。"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {reportTypes.map((item) => (
          <article key={item.title} className="report-type-card">
            <FileText className="h-6 w-6" style={{ color: 'var(--primary)' }} />
            <h3>{item.title}</h3>
            <p>{item.content}</p>
            <span>{item.source} · {item.samples} 条数据</span>
            <button className="primary-button mt-4 w-full px-4 py-2" onClick={() => onNotify('success', `${item.title} 已生成。`)}>
              生成报告
            </button>
          </article>
        ))}
      </section>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">
            <MapPinned className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            报告历史
          </h2>
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button px-4 py-2" onClick={() => onNotify('success', 'PDF 已导出。')}><Download className="h-4 w-4" />导出 PDF</button>
            <button className="secondary-button px-4 py-2" onClick={() => onNotify('success', 'Word 已导出。')}><FileText className="h-4 w-4" />导出 Word</button>
            <button className="secondary-button px-4 py-2" onClick={() => onNotify('success', 'Excel 已导出。')}><FileSpreadsheet className="h-4 w-4" />导出 Excel</button>
          </div>
        </div>
        <DataTable
          headers={['报告编号', '报告类型', '标题', '生成时间', '状态', '操作']}
          rows={history.map((item) => [
            item[0],
            item[1],
            item[2],
            item[3],
            <StatusPill status={item[4]} />,
            <button className="link-button" onClick={() => onNotify('success', `${item[0]} 已打开。`)}>查看报告</button>
          ])}
        />
      </Panel>

      <Panel>
        <h2 className="panel-title">报告内容模板</h2>
        <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-2)' }}>
          每份报告包含标题、生成时间、数据来源、样本数量、地图截图、物种组成、分布记录、环境参数、分析说明和数据限制说明。系统会明确标注公开数据与本地采样数据的来源，避免把公开记录误读为真实生物量。
        </p>
      </Panel>
    </div>
  )
}
