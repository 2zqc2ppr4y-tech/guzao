import heroImage from '../assets/desmid-hero.png'
import cosmariumImage from '../assets/cosmarium-reference.png'
import closteriumImage from '../assets/closterium-reference.png'
import micrasteriasImage from '../assets/micrasterias-reference.png'

export const heroAsset = heroImage

export const businessFlow = ['图像上传', '识别确认', '采样归档', '地图分布', '报告输出']

export const platformMetrics = [
  { label: '已识别样本数', value: '18,420', hint: '来源：LocalSampling，更新：2026-05-24', source: 'LocalSampling' },
  { label: '已归档采样点', value: '128', hint: '来源：本地采样记录，更新：2026-05-24', source: 'LocalSampling' },
  { label: '已收录鼓藻类群', value: '42', hint: '来源：平台物种档案，更新：2026-05-24', source: 'LocalSpeciesArchive' },
  { label: '覆盖区域数量', value: '36', hint: '来源：公开记录 + 本地采样，更新：2026-05-24', source: 'Mixed' },
  { label: '公开分布记录数', value: '12,860', hint: '来源：GBIF / iNaturalist 模拟统计，更新：2026-05-24', source: 'GBIF+iNaturalist' },
  { label: '已生成报告数', value: '1,376', hint: '来源：报告中心，更新：2026-05-24', source: 'LocalReports' }
]

export const platformEntrances = [
  { key: 'identify', title: '显微样本识别', text: '上传水样显微图，识别鼓藻类别，并查看形态依据。', source: 'LocalUI' },
  { key: 'distribution', title: '鼓藻分布图谱', text: '查看世界、国家、省市、采样点尺度的分布。', source: 'GBIF+iNaturalist+LocalSampling' },
  { key: 'sampling', title: '采样记录管理', text: '管理采样地点、时间、水体参数和识别结果。', source: 'LocalSampling' },
  { key: 'reports', title: '报告中心', text: '生成单图报告、采样点报告和区域分布报告。', source: 'LocalReports' }
]

export const recentSamplingDynamics = [
  { site: '东湖湿地-03', time: '2026-05-22 10:20', waterType: '湿地', dominantGroup: '新月鼓藻', status: '已复核', action: '查看采样', source: 'LocalSampling' },
  { site: '南湖湿地北岸', time: '2026-05-22 09:40', waterType: '湿地', dominantGroup: '双星鼓藻', status: '已复核', action: '查看报告', source: 'LocalSampling' },
  { site: '校园人工湖', time: '2026-05-21 16:20', waterType: '湖泊', dominantGroup: '角星鼓藻', status: '待复核', action: '进入复核', source: 'LocalSampling' },
  { site: '稻田沟渠样点', time: '2026-05-20 11:05', waterType: '水田', dominantGroup: 'Penium', status: '低置信度', action: '补充采样', source: 'LocalSampling' },
  { site: 'Berlin Freshwater pond', time: '2021-08-14', waterType: '池塘', dominantGroup: 'Closterium', status: '公开记录', action: '查看来源', source: 'GBIF' }
]

export const dataSourceOverview = {
  source: 'GBIF+iNaturalist+LocalSampling',
  updatedAt: '2026-05-24',
  text: '本平台分布数据可接入 GBIF、iNaturalist 等公开物种出现记录，同时支持用户上传本地采样记录。公开数据用于宏观分布展示，本地采样数据用于项目研究和报告生成。'
}

export const workflowSteps = [
  { title: '图像采集', text: '记录倍率、设备和采样场景，保留原始显微图像。' },
  { title: '数据标注', text: '沉淀物种标签、检测框、分割轮廓和人工复核意见。' },
  { title: '模型识别', text: '输出识别类别、置信度、Top-3 候选和处理耗时。' },
  { title: '人工复核', text: '低置信度和疑似相似种样本进入复核队列。' },
  { title: '水样归档', text: '将样本、采样点和理化指标关联保存。' },
  { title: '生态分析', text: '以辅助说明方式给出水体状态提示和后续采样建议。' }
]

export const applicationScenarios = [
  { title: '湖泊池塘水样普查', text: '面向多点位、多批次显微样本快速筛查优势鼓藻类群。' },
  { title: '显微实验教学辅助', text: '为课堂提供候选识别、形态解释和相似物种对照。' },
  { title: '水体生态状态初筛', text: '结合丰富度、低置信度比例和理化指标形成辅助提示。' },
  { title: '模型数据持续积累', text: '把人工复核后的样本纳入下一轮训练数据集。' }
]

export const recentAnalysis = {
  sampleId: 'SMP-20260522-018',
  location: '南湖湿地北岸 3 号样点',
  result: '双星鼓藻',
  dominantGroup: '双半细胞鼓藻类群',
  confidence: 0.914,
  reviewStatus: '已复核',
  reportId: 'RPT-20260522-018'
}

export const speciesInfos = [
  {
    id: 'closterium',
    name: '新月鼓藻',
    latin: 'Closterium sp.',
    image: closteriumImage,
    morphologyType: '弯月形',
    cellStructure: '长梭形单细胞',
    commonWater: '池塘、湿地、水田',
    difficulty: '中等',
    typicalMorphology: '细胞呈新月形或长梭形，两端逐渐变细，整体弧线连续。',
    similarSpecies: ['棒形鼓藻', '长形绿藻'],
    identificationDifficulties: '若只截取中段，两端渐尖和弯曲度特征不足，容易与长柱形鼓藻混淆。',
    habitat: '常见于富含有机质的静水或缓流淡水环境。',
    ecologicalIndicator: '可作为淡水微藻群落组成观察对象，用于辅助了解水体微生态变化。',
    trainingSamples: 3260,
    modelAccuracy: 0.934,
    compare: [
      { species: '棒形鼓藻', difference: '棒形鼓藻端部更圆钝，整体弯曲弱于新月鼓藻。' },
      { species: '长形绿藻', difference: '长形绿藻缺少典型鼓藻对称结构，细胞壁纹理表现不同。' }
    ]
  },
  {
    id: 'cosmarium',
    name: '双星鼓藻',
    latin: 'Cosmarium sp.',
    image: cosmariumImage,
    morphologyType: '双半细胞',
    cellStructure: '中央缢缩',
    commonWater: '湖泊边缘、浅水湿地',
    difficulty: '较难',
    typicalMorphology: '由两个近似对称的半细胞组成，中部缢缩清楚，外缘多呈圆形或肾形。',
    similarSpecies: ['真鼓藻', '肾形鼓藻'],
    identificationDifficulties: '半细胞轮廓、缢缩深度和表面纹饰差异细微，需要清晰图像辅助判断。',
    habitat: '多见于透明度较高、流速较缓的淡水环境。',
    ecologicalIndicator: '对透明度、营养盐和微生态变化较敏感，可作为辅助观察类群。',
    trainingSamples: 4120,
    modelAccuracy: 0.926,
    compare: [
      { species: '真鼓藻', difference: '真鼓藻顶端常有凹陷或浅缺刻，轮廓多角感更强。' },
      { species: '肾形鼓藻', difference: '肾形鼓藻半细胞更接近肾形，中央缢缩视觉更深。' }
    ]
  },
  {
    id: 'micrasterias',
    name: '角星鼓藻',
    latin: 'Micrasterias sp.',
    image: micrasteriasImage,
    morphologyType: '裂片型',
    cellStructure: '放射状裂片',
    commonWater: '浅湖、沼泽、湿地',
    difficulty: '较难',
    typicalMorphology: '细胞呈扁平星状或叶片状，半细胞具多级裂片，边缘分叉复杂。',
    similarSpecies: ['星形鼓藻', '拟角星鼓藻'],
    identificationDifficulties: '低对焦质量会让裂片边缘虚化，影响与其他星状鼓藻的区分。',
    habitat: '常见于较清洁、偏弱酸性或有机质适中的淡水湿地。',
    ecologicalIndicator: '形态复杂，适合作为显微摄影、分类教学和科研展示样本。',
    trainingSamples: 2380,
    modelAccuracy: 0.895,
    compare: [
      { species: '星形鼓藻', difference: '角星鼓藻裂片层级更复杂，星形鼓藻角突更突出。' },
      { species: '拟角星鼓藻', difference: '拟角星鼓藻外缘分叉较浅，中心区比例不同。' }
    ]
  },
  {
    id: 'euastrum',
    name: '真鼓藻',
    latin: 'Euastrum sp.',
    image: cosmariumImage,
    morphologyType: '双半细胞',
    cellStructure: '顶端凹陷',
    commonWater: '静水湿地、水草区',
    difficulty: '中等',
    typicalMorphology: '细胞呈椭圆至多角形，半细胞顶端常有凹陷或浅缺刻。',
    similarSpecies: ['双星鼓藻', '小鼓藻'],
    identificationDifficulties: '顶端缺刻和侧缘纹饰需要清晰图像，否则容易被简化为普通双半细胞型。',
    habitat: '常见于湿地、浅水湖泊和水草丰富的静水环境。',
    ecologicalIndicator: '可辅助比较淡水微藻群落复杂度和样点差异。',
    trainingSamples: 1760,
    modelAccuracy: 0.872,
    compare: [
      { species: '双星鼓藻', difference: '真鼓藻顶端凹陷更明显，半细胞外缘更具棱角。' },
      { species: '小鼓藻', difference: '小鼓藻个体更小，表面纹饰和中央缢缩较弱。' }
    ]
  },
  {
    id: 'staurastrum',
    name: '星形鼓藻',
    latin: 'Staurastrum sp.',
    image: micrasteriasImage,
    morphologyType: '星状',
    cellStructure: '角突结构',
    commonWater: '湖泊、水库、池塘',
    difficulty: '较难',
    typicalMorphology: '细胞常具有多个角突或臂状延伸，俯视图呈星状。',
    similarSpecies: ['角星鼓藻', '针星鼓藻'],
    identificationDifficulties: '不同焦平面下角突数量和长度观感差异较大，需要结合多张图像复核。',
    habitat: '湖泊、池塘、湿地和水库浮游样本中均可见。',
    ecologicalIndicator: '可作为淡水浮游微藻组成分析中的参考类群。',
    trainingSamples: 980,
    modelAccuracy: 0.846,
    compare: [
      { species: '角星鼓藻', difference: '星形鼓藻角突更立体，角星鼓藻裂片边缘更复杂。' },
      { species: '针星鼓藻', difference: '针星鼓藻突起更细长，中心细胞区比例较小。' }
    ]
  },
  {
    id: 'penium',
    name: '棒形鼓藻',
    latin: 'Penium sp.',
    image: closteriumImage,
    morphologyType: '长柱形',
    cellStructure: '端部圆钝',
    commonWater: '浅水湿地、苔藓附生环境',
    difficulty: '中等',
    typicalMorphology: '细胞近圆柱形或长椭圆形，两端较圆钝，缢缩不明显。',
    similarSpecies: ['新月鼓藻', '长形绿藻'],
    identificationDifficulties: '轻微弯曲或端部不清晰时，容易与新月鼓藻相互混淆。',
    habitat: '常见于浅水湿地、苔藓附生环境和有机质适中的淡水样本。',
    ecologicalIndicator: '适合用于长形鼓藻类群的辅助识别和对比分析。',
    trainingSamples: 720,
    modelAccuracy: 0.818,
    compare: [
      { species: '新月鼓藻', difference: '棒形鼓藻两端圆钝，新月鼓藻两端渐尖且整体弧度明显。' },
      { species: '长形绿藻', difference: '长形绿藻通常缺少鼓藻类典型对称和细胞壁纹理。' }
    ]
  }
]

export const recognitionMock = {
  sampleId: 'SMP-20260522-018',
  imageUrl: closteriumImage,
  species: '新月鼓藻',
  latin: 'Closterium sp.',
  confidence: 0.926,
  candidates: [
    { species: '新月鼓藻', latin: 'Closterium sp.', confidence: 0.926 },
    { species: '棒形鼓藻', latin: 'Penium sp.', confidence: 0.052 },
    { species: '双星鼓藻', latin: 'Cosmarium sp.', confidence: 0.022 }
  ],
  elapsed: '1.18s',
  boxes: [{ x: 0.22, y: 0.18, w: 0.55, h: 0.58, label: 'Closterium 92.6%' }],
  morphology: {
    shape: '长梭形或新月形，细胞两端逐渐变细。',
    symmetry: '整体沿纵轴呈明显对称，弧线连续。',
    isthmus: '未见明显中央缢缝，符合长形鼓藻类群特征。',
    edge: '边缘平滑，端部透明区较明显。',
    similar: '棒形鼓藻、长形绿藻',
    basis: '重点区分端部渐尖、整体弯曲度和叶绿体纵向分布。',
    reviewSuggestion: '置信度较高，可抽样人工复核。'
  }
}

export const batchTask = {
  id: 'BAT-20260522-004',
  total: 12,
  recognized: 9,
  failed: 1,
  lowConfidence: 2,
  reviewPending: 3,
  composition: [
    { label: '双星鼓藻', value: 35, color: '#14b8a6' },
    { label: '新月鼓藻', value: 26, color: '#38bdf8' },
    { label: '角星鼓藻', value: 18, color: '#f59e0b' },
    { label: '棒形鼓藻', value: 12, color: '#22c55e' },
    { label: '星形鼓藻', value: 9, color: '#818cf8' }
  ],
  averageConfidence: 0.864,
  lowConfidenceRate: 0.167,
  items: [
    { imageName: 'lake-a-001.jpg', species: '双星鼓藻', confidence: 0.934, similar: '真鼓藻', processingTime: '1.0s', reviewStatus: '已复核', status: '已识别' },
    { imageName: 'lake-a-002.jpg', species: '新月鼓藻', confidence: 0.912, similar: '棒形鼓藻', processingTime: '1.2s', reviewStatus: '待复核', status: '已识别' },
    { imageName: 'pond-b-010.png', species: '角星鼓藻', confidence: 0.884, similar: '星形鼓藻', processingTime: '1.5s', reviewStatus: '待复核', status: '已识别' },
    { imageName: 'wetland-c-003.webp', species: '棒形鼓藻', confidence: 0.764, similar: '新月鼓藻', processingTime: '1.4s', reviewStatus: '待复核', status: '低置信度' },
    { imageName: 'reservoir-d-021.jpg', species: '星形鼓藻', confidence: 0.792, similar: '角星鼓藻', processingTime: '1.7s', reviewStatus: '待复核', status: '低置信度' },
    { imageName: 'field-e-018.jpg', species: '无法识别', confidence: 0, similar: '图像过暗', processingTime: '0.8s', reviewStatus: '待复核', status: '识别失败' }
  ]
}

export const sampleLibrary = [
  { id: 'SMP-20260522-018', imageName: 'lake-a-001.jpg', samplingId: 'SITE-NH-03', result: '双星鼓藻', confidence: 0.934, reviewStatus: '已复核', inTrainingSet: '是', site: '南湖湿地北岸', time: '2026-05-22 09:40' },
  { id: 'SMP-20260522-019', imageName: 'lake-a-002.jpg', samplingId: 'SITE-NH-03', result: '新月鼓藻', confidence: 0.912, reviewStatus: '待复核', inTrainingSet: '否', site: '南湖湿地北岸', time: '2026-05-22 09:42' },
  { id: 'SMP-20260521-012', imageName: 'pond-b-010.png', samplingId: 'SITE-XY-01', result: '角星鼓藻', confidence: 0.884, reviewStatus: '待复核', inTrainingSet: '否', site: '校园人工湖', time: '2026-05-21 16:20' },
  { id: 'SMP-20260520-006', imageName: 'wetland-c-003.webp', samplingId: 'SITE-WD-09', result: '棒形鼓藻', confidence: 0.764, reviewStatus: '待复核', inTrainingSet: '是', site: '稻田沟渠样点', time: '2026-05-20 11:05' }
]

export const samplingSites = [
  { site: '南湖湿地北岸', waterType: '浅水湿地', latestTime: '2026-05-22 09:40', sampleCount: 36, dominantGroup: '双半细胞鼓藻', trend: '稳定增加', action: '查看采样' },
  { site: '校园人工湖', waterType: '人工湖', latestTime: '2026-05-21 16:20', sampleCount: 22, dominantGroup: '裂片型鼓藻', trend: '轻微波动', action: '查看采样' },
  { site: '稻田沟渠样点', waterType: '沟渠', latestTime: '2026-05-20 11:05', sampleCount: 18, dominantGroup: '长柱形鼓藻', trend: '需连续监测', action: '查看采样' }
]

export const modelDatasets = [
  { category: '双星鼓藻', train: 3120, validation: 620, test: 380, accuracy: 0.926, confusedWith: '真鼓藻' },
  { category: '新月鼓藻', train: 2480, validation: 510, test: 270, accuracy: 0.934, confusedWith: '棒形鼓藻' },
  { category: '角星鼓藻', train: 1760, validation: 380, test: 240, accuracy: 0.895, confusedWith: '星形鼓藻' },
  { category: '星形鼓藻', train: 680, validation: 180, test: 120, accuracy: 0.846, confusedWith: '角星鼓藻' },
  { category: '棒形鼓藻', train: 520, validation: 130, test: 70, accuracy: 0.818, confusedWith: '新月鼓藻' }
]

export const trainingOverview = {
  totalImages: 18420,
  labeledImages: 16280,
  unlabeledImages: 2140,
  categoryCount: 42,
  split: '70% / 15% / 15%'
}

export const trainingTasks = [
  '读取复核样本与新增标注 214 张',
  '验证类别样本平衡，棒形鼓藻样本不足',
  '训练任务等待启动'
]

export const modelEvaluation = {
  accuracy: 0.926,
  precision: 0.918,
  recall: 0.903,
  f1: 0.91,
  map: 0.887,
  confusion: [
    ['双星鼓藻', '真鼓藻', 28],
    ['新月鼓藻', '棒形鼓藻', 19],
    ['角星鼓藻', '星形鼓藻', 16]
  ],
  errors: [
    { image: 'wetland-c-003.webp', predict: '棒形鼓藻', label: '新月鼓藻', reason: '端部不清晰' },
    { image: 'reservoir-d-021.jpg', predict: '星形鼓藻', label: '角星鼓藻', reason: '焦平面导致裂片虚化' }
  ]
}

export const modelVersions = [
  { version: 'DesmidVision v0.7.2', date: '2026-05-22', categories: 42, samples: 18420, accuracy: 0.926, current: '是' },
  { version: 'DesmidVision v0.7.1', date: '2026-05-11', categories: 38, samples: 16200, accuracy: 0.907, current: '否' },
  { version: 'DesmidVision v0.6.8', date: '2026-04-26', categories: 31, samples: 12860, accuracy: 0.884, current: '否' }
]

export const samplingAssessmentMock = {
  richness: '6 类',
  dominantGroup: '双半细胞鼓藻类群',
  evenness: '0.74',
  lowConfidenceRate: '16.7%',
  level: '需复核',
  stateHint: '当前样本显示鼓藻类群较丰富，但低置信度样本比例偏高，建议人工复核后再用于结论归档。',
  possibleFactors: '透明度、采样点水草密度、显微对焦质量和近期降雨可能共同影响观察结果。',
  nextSuggestion: '建议在同一点位连续 3 天保留重复样本，并补充上游与岸边水草区图像。'
}
