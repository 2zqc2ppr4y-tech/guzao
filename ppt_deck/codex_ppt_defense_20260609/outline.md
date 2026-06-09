# 鼓藻鉴析比赛答辩 PPT 大纲（比赛版草案）

项目名称：鼓藻鉴析——基于 YOLO11 的鼓藻智能识别与分析平台

建议页数：15 页

答辩主线：围绕比赛初评要求，从需求痛点、作品设计制作、功能展示、竞品差异、创新点、应用场景、知识产权/合规、团队介绍与视频展示计划展开。整体避免创业融资叙事，重点证明作品真实可运行、功能闭环清楚、应用价值具体。

## 比赛要求覆盖表

- 需求痛点：Slide 2
- 应用场景：Slide 3
- 竞品分析：Slide 4
- 作品设计和制作：Slide 5-7
- 功能展示：Slide 8-10
- 作品完成度与真实证据：Slide 11
- 创新点：Slide 12
- 知识产权与合规：Slide 13
- 团队介绍：Slide 14
- 视频展示计划：Slide 14
- 总结与后续计划：Slide 15

## 视觉与素材策略

- 封面要求：统一浅色科研风，更专业、更像比赛作品集封面。采用“浅水青科研纸面 + 显微镜视野 + 局部鼓藻形态 + 真实检测小窗”的组合；左侧留出标题区，右侧集中显微图像和产品证据，避免普通 AI 生成感。
- 背景图策略：全套以浅水色、白色画布、显微颗粒纹理、细网格、微弱水波和局部显微圆形视野为主；不再使用整页深色背景，深水青只作为顶部标题条、局部图表、信息卡边缘和少量强调色。
- 素材图策略：优先使用项目真实资产和后续采集的真实 UI 截图，包括首页、图像检测、批量分析、数据中心、分布图谱、报告预览、实际检测结果图；生成背景只做“场景氛围和承托”，不代替功能证据。
- 信息卡堆叠：少量使用在 Slide 4、Slide 8、Slide 10、Slide 12，用 2-3 层轻微错位卡片表现对比、功能链路和创新点；其他页面保持清爽图文、流程和数据证据版式，不每页都堆卡，降低模板感和 AI 味。
- 降低 AI 化：少用空泛大词和过度发光装饰；加入真实数据、真实接口、真实截图、轻微不对称排版、手工标注感的小标签；背景纹理要克制，不能喧宾夺主。

## 待采集与复用素材清单

- 已生成的项目风格素材：
  - 浅色封面背景：`C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/generated_style/cover_bg_light_desmid_ai.png`
  - 浅色内页背景：`C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/generated_style/content_bg_light_microscopy.png`
  - 识别功能页素材：`C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/generated_style/recognition_feature_visual.png`
  - 浅色总结背景：`C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/generated_style/closing_bg_light_desmid.png`
  - 四图总览：`C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/generated_style/generated_style_contact_sheet.png`
  - 备用深色素材：`cover_bg_desmid_ai.png`、`closing_bg_deep_teal.png`；仅作为局部裁剪或备选纹理，不作为主风格。
- 已有严格输入资产：
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/frontend/src/assets/desmid-hero.png`
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/frontend/src/assets/cosmarium-reference.png`
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/frontend/src/assets/closterium-reference.png`
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/frontend/src/assets/micrasterias-reference.png`
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/backend/uploads/results/20260531205702_0f38db606c_result.jpg`
- 下一阶段建议采集的项目真实 UI 截图：
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/home.png`
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/detect.png`
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/batch_or_report.png`
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/data_workbench.png`
  - `C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/distribution.png`

## Slide 1: 封面

- 关键点：
  - 项目名称：鼓藻鉴析——基于 YOLO11 的鼓藻智能识别与分析平台。
  - 作品定位：面向淡水微藻识别、水生态监测、科研教学和样本数据归档。
  - 关键词：YOLO11、显微图像、候选排序、人工复核、分布图谱、报告导出。
  - 封面不放团队长段文字，只保留队名、学校/学院、指导老师等必要信息占位。
- 视觉想法：专业浅色科研封面；白色到浅水青背景，叠加细网格和显微圆形视野；右侧用鼓藻形态图与真实检测框小窗形成“作品实物感”；标题大但克制，深水青和水光青只用于标题条与重点强调。
- 布局角色与意图：cover；第一眼建立专业度、作品真实感和技术方向。
- Required images:
  - 浅色封面背景；严格输入资产；作为本项目主封面底图，后续只叠加可编辑标题、团队和赛事信息。

    ![generated light cover background](C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/generated_style/cover_bg_light_desmid_ai.png)

  - 封面主体视觉风格参考；严格输入资产；保留鼓藻形态和水生态主题，但后续封面应重新构图，不直接照搬旧图。

    ![desmid hero](C:/Users/孙鹏淇/Desktop/guzaoshibie/frontend/src/assets/desmid-hero.png)

  - 实际检测小窗；严格输入资产；用于封面局部证据，不作为整页主视觉。

    ![YOLO detection result](C:/Users/孙鹏淇/Desktop/guzaoshibie/backend/uploads/results/20260531205702_0f38db606c_result.jpg)

## Slide 2: 需求痛点

- 关键点：
  - 人工识别难：鼓藻形态细节差异小，依赖分类经验和显微观察质量。
  - 样本处理慢：多批次显微图像逐张判断，通量低、结果一致性难保证。
  - 记录难沉淀：原图、结果、置信度、复核意见、采样点和报告分散保存。
  - 数据难复用：单次识别很难继续服务分布分析、教学展示和模型迭代。
- 视觉想法：显微视野背景上放四个痛点标签，配真实样本/检测小片段；不要做夸张红色警示风。
- 布局角色与意图：context / problem；对应比赛要求“需求痛点”。
- Required images:
  - 鼓藻参考素材；严格输入资产；用于说明形态相似与人工识别门槛。

    ![Cosmarium reference](C:/Users/孙鹏淇/Desktop/guzaoshibie/frontend/src/assets/cosmarium-reference.png)

## Slide 3: 用户与应用场景

- 关键点：
  - 水生态监测人员：批量筛查显微样本，关注低置信度、复核、归档和报告。
  - 科研教学用户：查看候选类别、形态解释、相似类群和观察建议。
  - 数据管理人员：维护检测历史、采样点、物种档案、分布记录和训练素材。
  - 典型场景：课堂实验、监测项目初筛、样本整理、区域分布观察、报告输出。
- 视觉想法：三类用户画像 + 应用场景地图；用浅色背景和少量照片/图标化显微元素。
- 布局角色与意图：application scenarios；对应比赛要求“应用场景”。
- Required images: 无。

## Slide 4: 竞品与现有方案分析

- 关键点：
  - 传统人工鉴定：专业可信，但效率低、门槛高、结果难结构化。
  - 通用图像识别工具：上手快，但缺少鼓藻领域知识、复核链路和报告归档。
  - 普通检测后台：能做上传与记录，但生态分布、物种档案和数据闭环不足。
  - 本作品差异：把 YOLO11 识别、人工复核、数据中心、分布图谱和报告导出串成完整作品。
- 视觉想法：少量信息卡堆叠式对比；左侧 3 张“现有方案”小卡，右侧一张“鼓藻鉴析闭环”主卡。
- 布局角色与意图：comparison；对应比赛要求“竞品分析”，但不做创业融资式商业竞品。
- Required images: 无。

## Slide 5: 作品定位与总体设计

- 关键点：
  - 作品不是单个识别模型，而是“显微图像识别 + 科研数据管理 + 生态辅助分析”的平台。
  - 核心闭环：上传图片 → YOLO11 识别 → 候选排序 → 结果解释 → 人工复核 → 记录归档 → 报告/图谱。
  - 输出始终保持科研辅助定位，不替代最终人工鉴定。
  - 设计目标：可信、可复核、可追溯、可展示、可扩展。
- 视觉想法：一条横向闭环流程线，节点下方嵌入小型 UI 截图占位。
- 布局角色与意图：concept explanation；对应比赛要求“作品设计”。
- Required images:
  - 浅色内页背景；严格输入资产；用于承载闭环流程线和 UI 截图，不作为唯一信息来源。

    ![generated light content background](C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/generated_style/content_bg_light_microscopy.png)

  - 平台首页截图；严格输入资产；下一阶段从本项目真实运行界面采集。

    待采集：C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/home.png

## Slide 6: 作品制作与技术路线

- 关键点：
  - 前端：React + Vite + Tailwind CSS，构建总览、检测、统计、图谱、档案和记录工作台。
  - 后端：Flask + REST API，提供认证、识别、历史、统计、报告、批量和分布接口。
  - 模型：YOLO11 目标检测，输出检测框、类别、置信度和候选排序；支持真实权重接入与演示回退。
  - 数据：SQLite 保存识别记录、样本记录、复核记录、分布记录、批量任务和 35 个鼓藻属名录。
- 视觉想法：技术路线图，使用代码/接口小标签而不是大段文字；背景放浅色工程蓝图纹理。
- 布局角色与意图：architecture / production；对应比赛要求“作品制作”。
- Required images: 无。

## Slide 7: 系统架构与数据闭环

- 关键点：
  - 用户交互层：总览、图像检测、批量分析、数据中心、分布图谱、物种档案、检测记录。
  - 业务服务层：上传检测、批量任务、样本归档、报告导出、分布同步、复核记录。
  - 模型推理层：YOLO11 检测、置信度阈值、候选排序、低置信度提示。
  - 数据存储层：SQLite 统一沉淀图像、报告、采样、复核和分布数据，反哺模型训练资产。
- 视觉想法：浅色四层架构图 + 底部数据回流箭头，局部使用深水青标题条和细边框，不使用整页深色控制台。
- 布局角色与意图：architecture；证明作品可运行、可维护。
- Required images: 无。

## Slide 8: 功能一：单张图像智能识别

- 关键点：
  - 支持上传、预览、进度反馈、质量提示、检测框和识别结果展示。
  - 结果包含类别、拉丁名、置信度、候选排序、相似种、形态解释和质量建议。
  - 低置信度结果自动进入待复核语境，避免把模型判断当作最终结论。
  - 识别结果可保存到历史记录，并用于后续报告导出。
- 视觉想法：少量堆叠式功能卡；左侧真实检测图，右侧 2-3 张错位信息卡展示“置信度 / 候选 / 复核建议”。
- 布局角色与意图：case study / feature；对应比赛要求“功能”。
- Required images:
  - 识别功能页素材；严格输入资产；用于呈现检测框、候选排序和人工复核的视觉组合。

    ![generated recognition feature visual](C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/generated_style/recognition_feature_visual.png)

  - 实际检测结果图；严格输入资产；保留目标框、标签和置信度。

    ![YOLO detection result](C:/Users/孙鹏淇/Desktop/guzaoshibie/backend/uploads/results/20260531205702_0f38db606c_result.jpg)

  - 图像检测页截图；严格输入资产；下一阶段从本项目真实运行界面采集。

    待采集：C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/detect.png

## Slide 9: 功能二：批量分析与报告输出

- 关键点：
  - `/api/batch` 支持多图上传、逐张识别、失败记录、低置信度统计和平均置信度统计。
  - 批量结果可排序、筛选和汇总，适合多样本教学实验与监测项目初筛。
  - 支持 CSV、单张 PDF 报告和批量 PDF 报告导出。
  - 报告输出保留识别类别、候选排序、形态依据、图像质量建议和辅助说明。
- 视觉想法：批量表格 + 报告预览缩略图 + 导出流程箭头；背景用浅水色表格纸纹理。
- 布局角色与意图：workflow / feature；对应比赛要求“功能”。
- Required images:
  - 批量分析或报告预览截图；严格输入资产；下一阶段从本项目真实运行界面采集。

    待采集：C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/batch_or_report.png

## Slide 10: 功能三：数据中心、图谱与生态分析

- 关键点：
  - 数据中心整合样本数据、采样点数据、分布数据、模型数据与导入导出。
  - 分布图谱兼容 GBIF、iNaturalist、本地采样和人工导入记录，支持筛选与 GeoJSON/CSV 导出。
  - 生态评估接口结合采样地点、pH、透明度和物种组成输出辅助判断与采样建议。
  - 当前数据库已有分布记录 89 条、鼓藻属名录 35 条，为展示和后续扩展提供基础。
- 视觉想法：地图截图和数据看板错位叠放，右侧放 3 个小指标卡；堆叠排版只在局部使用。
- 布局角色与意图：feature / system extension；对应比赛要求“功能”和“应用场景”。
- Required images:
  - 数据中心截图；严格输入资产；下一阶段从本项目真实运行界面采集。

    待采集：C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/data_workbench.png

  - 分布图谱截图；严格输入资产；下一阶段从本项目真实运行界面采集。

    待采集：C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/screenshots/distribution.png

## Slide 11: 作品完成度与真实运行证据

- 关键点：
  - 已完成前后端整合：React/Vite/Tailwind 前端，Flask/SQLite 后端，接口可运行。
  - 已实现接口：认证、健康检查、物种档案、首页看板、检测、批量、历史、统计、报告、分布同步等。
  - 当前演示数据库：识别记录 45 条、样本记录 45 条、分布记录 89 条、复核记录 7 条、用户 3 个。
  - 输出物包括 PPT 与视频；视频重点展示实际功能操作流程，不只放静态页面。
- 视觉想法：真实数据指标条 + 接口清单 + 本地项目结构证据；用“完成度仪表”而非空泛进度条。
- 布局角色与意图：data evidence；证明初评资料可信。
- Required images: 无。

## Slide 12: 创新点

- 关键点：
  - 创新 1：从单张识别扩展为“识别、复核、归档、报告、图谱”的完整科研工作流。
  - 创新 2：把模型输出转化为候选排序、置信度、质量建议和形态解释，增强可解释性。
  - 创新 3：统一本地采样与公开分布记录，形成可筛选、可导出的生态图谱。
  - 创新 4：围绕水生态科研场景设计界面与数据语言，区别于通用后台模板。
- 视觉想法：四张创新卡片轻微错位堆叠，每张都用“过去做法 → 本作品做法”表达，降低口号感。
- 布局角色与意图：comparison / innovation；对应比赛要求“创新点”。
- Required images: 无。

## Slide 13: 知识产权与合规说明

- 关键点：
  - 作品代码、页面设计和业务流程为本项目定制开发；不提交其他赛事已使用 PPT。
  - 第三方开源依赖按其协议使用：React、Vite、Tailwind CSS、Flask、Leaflet、lucide-react 等。
  - 公开分布数据来源需要保留 GBIF、iNaturalist 等来源标识，项目中以数据来源标签呈现。
  - 模型识别结果定位为科研辅助参考，保留人工复核机制，避免误导为最终鉴定结论。
- 视觉想法：合规清单 + 开源依赖标签 + 数据来源标签；简洁严肃，不做法律文件感。
- 布局角色与意图：IP / compliance；对应比赛要求“知识产权（如有）”。
- Required images: 无。

## Slide 14: 团队介绍与视频展示计划

- 关键点：
  - 团队介绍：项目负责人、算法/后端、前端/交互、资料/答辩与视频制作等分工占位。
  - 制作协作：模型与接口、产品界面、数据资料、答辩材料和视频演示共同支撑作品。
  - 视频结构建议：开场 10 秒说明作品定位；30-60 秒展示图片识别；30 秒展示批量和报告；30 秒展示数据中心与图谱；最后 10 秒总结应用价值。
  - 视频要展示真实功能操作和作品界面，不只播放 PPT。
- 视觉想法：左侧团队分工矩阵，右侧视频分镜时间轴；加入少量实际界面缩略图。
- 布局角色与意图：team / video plan；对应比赛要求“团队介绍”和“视频展示作品实物和功能”。
- Required images: 无。

## Slide 15: 总结与未来规划

- 关键点：
  - 当前成果：作品已形成识别、复核、归档、报告、分布分析的完整闭环。
  - 近期规划：扩充真实标注数据，完善 YOLO11 权重评估指标，优化低置信度复核体验。
  - 中期规划：增强分布同步质量控制、报告模板、训练数据回流和部署方案。
  - 长期目标：发展为面向水生态监测与科研教学的智能分析平台。
- 视觉想法：浅色三阶段路线图 + Q&A 收束；背景呼应封面但更简洁，留出答辩结束空间。
- 布局角色与意图：summary / Q&A；完成比赛材料闭环。
- Required images:
  - 浅色总结背景；严格输入资产；用于结尾页或 Q&A 页，只叠加可编辑文字。

    ![generated light closing background](C:/Users/孙鹏淇/Desktop/guzaoshibie/ppt_deck/codex_ppt_defense_20260609/assets/generated_style/closing_bg_light_desmid.png)
