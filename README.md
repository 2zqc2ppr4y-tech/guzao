# 鼓藻智析平台

面向淡水微藻研究与生态监测的鼓藻智能识别与分析平台。项目采用 **React + Vite + Tailwind CSS** 前端和 **Flask + SQLite** 后端，保留原有图片识别接口，并扩展了批量分析、知识库、生态辅助评估、数据中心和报告预览等科研展示模块。

## 页面模块

- 首页：Banner、核心数据、功能模块、项目优势
- 智能识别：图片上传、预览、进度动画、识别结果、相似种、报告入口
- 批量分析：多图上传、结果表格、类别统计、置信度统计、CSV 与批量报告
- 鼓藻知识库：搜索、分类筛选、种类卡片、详情信息
- 水体生态辅助评估：采样信息录入、类别组成、参考分析、采样建议
- 数据中心：识别记录、采样记录、趋势图、排行和数据导出
- 报告预览：适合截图用于 PPT 的识别与分析报告
- 关于项目：系统架构、模型数据中心和后续迭代方向

## 启动方式

一键启动：

```bat
start.bat
```

手动启动后端：

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

手动启动前端：

```bash
cd frontend
npm install
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:5173
```

## REST API

原有核心接口保留：

```text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/predict
GET  /api/history
GET  /api/stats
POST /api/feedback
GET  /api/species
GET  /api/reports/<result_id>/pdf
GET  /api/reports/<result_id>/csv
```

新增演示接口：

```text
GET  /api/records
POST /api/batch
POST /api/ecology
POST /api/report
```

## 模型接入

将 YOLO 权重放到：

```text
backend/models/best.pt
```

安装可选依赖后重启后端：

```bash
pip install ultralytics
```

当 `best.pt` 存在且 `ultralytics` 可用时，`/api/predict` 会优先调用真实模型；否则自动使用演示模型，保证项目可以直接运行展示。
