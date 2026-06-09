import { Database, FileText, Layers3, Microscope, Network, ShieldCheck } from 'lucide-react'
import { PageIntro, Panel, SectionHeading } from '../components/ui'

const structures = [
  ['SampleRecord', '样本识别记录：图片、采样信息、识别结果、置信度、复核状态、训练集标记。'],
  ['SamplingSite', '采样点记录：地点、水体类型、GPS、历史采样和优势类群趋势。'],
  ['SpeciesInfo', '鼓藻物种信息：形态、生境、相似物种、识别难点和模型表现。'],
  ['BatchTask', '批量识别任务：任务进度、文件状态、低置信度样本和导出结果。'],
  ['ModelVersion', '模型版本：训练日期、类别数、样本数、指标和当前使用状态。'],
  ['TrainingDataset', '训练数据集：训练/验证/测试切分、类别样本量和混淆类别。'],
  ['ReviewRecord', '人工复核记录：复核结论、复核人、备注和是否进入训练集。'],
  ['DistributionRecord', '统一分布记录：兼容 GBIF、iNaturalist、本地采样和人工导入数据。']
]

const boundaries = [
  ['样本识别', '只负责图片识别、Top-3 结果、形态解释和人工确认。'],
  ['分布图谱', '只负责空间分布、地图缩放、物种分布和区域统计。'],
  ['物种档案', '只负责物种知识、形态特征和相似物种对比。'],
  ['采样记录', '只负责本地采样点、采样时间、环境参数和图片归档。'],
  ['水样评估', '只负责基于采样点或批次样本生成辅助评估。'],
  ['数据工作台', '只负责数据管理、同步、导入导出和模型数据管理。'],
  ['报告中心', '只负责报告生成、报告历史和导出。']
]

export default function AboutPage() {
  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="项目说明"
        title="鼓藻识别、分布图谱、采样归档与用户报告的成熟应用系统"
        text="平台定位：面向显微水样图像与生态采样场景的鼓藻识别、分布图谱、样本归档与水体辅助评估平台。"
      />

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <SectionHeading eyebrow="平台定位" title="显微图像识别 + 水样数据资产" />
          <div className="mt-5 grid gap-4">
            <Item icon={Microscope} title="样本识别" text="围绕单张图像输出识别物种、检测框/轮廓、Top-3 候选和形态解释。" />
            <Item icon={Network} title="采样归档" text="将显微图、采样点、理化指标、复核结果和报告统一关联。" />
            <Item icon={ShieldCheck} title="辅助评估" text="以保守、可复核的辅助说明表达生态状态提示，避免绝对化水质判断。" />
            <Item icon={Layers3} title="训练闭环" text="人工复核后的样本可加入下一轮训练，支撑模型版本迭代。" />
          </div>
        </Panel>

        <Panel>
          <SectionHeading eyebrow="后端数据结构" title="新增或补充的核心数据模型" />
          <div className="mt-5 grid gap-3">
            {structures.map(([name, text]) => (
              <div key={name} className="schema-row">
                <Database className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                <div>
                  <strong>{name}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel>
        <h2 className="panel-title">
          <FileText className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          功能边界
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {boundaries.map(([name, text]) => (
            <div key={name} className="explain-item">
              <span>{name}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="panel-title">
          <FileText className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          真实数据接入方案
        </h2>
        <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-2)' }}>
          后端新增 <code>distribution_service.py</code>，预留 <code>fetchGbifOccurrences</code>、<code>fetchINaturalistObservations</code>、<code>normalizeDistributionRecords</code>、<code>getDistributionRecords</code>、<code>getSpeciesDistributionSummary</code>、<code>getRegionDistributionSummary</code>、<code>cacheDistributionRecords</code>、<code>mergeLocalSamplingRecords</code>。前端新增 <code>src/data/distribution</code>、<code>src/services/distribution</code>、<code>src/components/map</code> 与 <code>src/components/distribution</code>。
        </p>
      </Panel>
    </div>
  )
}

function Item({ icon: Icon, title, text }) {
  return (
    <div className="timeline-row">
      <Icon className="h-5 w-5" style={{ color: 'var(--primary)' }} />
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  )
}
