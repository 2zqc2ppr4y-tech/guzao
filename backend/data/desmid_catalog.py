DESMID_CATALOG = {
    "cosmarium": {
        "species": "双星鼓藻",
        "scientific_name": "Cosmarium sp.",
        "common_name": "双半细胞鼓藻类",
        "category": "双半细胞鼓藻",
        "confidence": 0.91,
        "description": "细胞通常由两个近似对称的半细胞组成，中部缢缩明显，外缘多呈圆钝或肾形。",
        "structure": "每个半细胞内常见叶绿体和颗粒状结构，细胞壁可见点纹、颗粒或轻微突起。",
        "habitat": "常见于池塘、湖泊边缘、湿地和缓流淡水环境，偏好较稳定、透明度较高的水体。",
        "monitoring_value": "对水体透明度、营养盐和微生态变化较敏感，可作为淡水生态监测的辅助观察类群。",
        "difficulty": "半细胞轮廓、缢缩深度和表面纹饰差异细微，需要高质量显微图像辅助判断。",
        "similar": ["真鼓藻", "肾形鼓藻", "小鼓藻"],
        "reference_key": "cosmarium",
        "color": "#14b8a6",
        "traits": ["双半细胞", "中央缢缩", "左右对称", "叶绿体纹理清晰"],
        "morphology": [
            {
                "label": "细胞形态",
                "value": "细胞由两个半细胞组成，中部缢缩形成清楚腰部，外缘多呈圆形、椭圆形或浅裂。",
            },
            {
                "label": "识别要点",
                "value": "重点观察轮廓对称性、中央缢缩深度、细胞边缘和表面纹饰，清晰边缘对分类判断很关键。",
            },
            {
                "label": "生态意义",
                "value": "适合用于淡水生态观察、显微摄影训练和水环境微藻群落展示。",
            },
        ],
        "observation_tips": [
            "建议使用 10x 或 40x 物镜下的清晰单细胞图像。",
            "尽量让目标细胞位于画面中央，并避免气泡、碎屑和其他藻类遮挡。",
            "如背景过暗或过亮，可重新调整显微镜光源后再上传。",
        ],
    },
    "closterium": {
        "species": "新月鼓藻",
        "scientific_name": "Closterium sp.",
        "common_name": "新月形鼓藻",
        "category": "弯月形鼓藻",
        "confidence": 0.89,
        "description": "细胞多呈弯月形、长梭形或弧形，两端逐渐变细，是淡水样本中常见的鼓藻类群。",
        "structure": "叶绿体沿细胞纵向分布，端部常可观察到较透明区域，细胞壁平滑或具细微纹理。",
        "habitat": "常见于富含有机质的静水或缓流淡水环境，如池塘、水田、湿地浅水区。",
        "monitoring_value": "可用于观察淡水浮游微藻群落变化，并为水体生态状态提供辅助参考。",
        "difficulty": "若图像只截取中段，两端渐尖特征缺失时，容易与长形绿藻或部分硅藻混淆。",
        "similar": ["棒形鼓藻", "长形绿藻", "双星鼓藻"],
        "reference_key": "closterium",
        "color": "#38bdf8",
        "traits": ["弯月形细胞", "两端渐尖", "细胞较长", "弧线轮廓明显"],
        "morphology": [
            {"label": "细胞形态", "value": "整体呈弯月形，长度通常明显大于宽度，两端逐渐收窄。"},
            {"label": "识别要点", "value": "重点观察两端是否渐尖，以及细胞整体是否呈连续弧形。"},
            {"label": "生态意义", "value": "常见于淡水池塘、湖泊和水田，可作为水体微生态状态辅助观察对象。"},
        ],
        "observation_tips": ["拍摄时保留完整两端，避免只截取细胞中部。"],
    },
    "micrasterias": {
        "species": "角星鼓藻",
        "scientific_name": "Micrasterias sp.",
        "common_name": "放射裂片鼓藻",
        "category": "裂片型鼓藻",
        "confidence": 0.86,
        "description": "细胞常具有复杂放射状裂片和高度对称轮廓，显微形态极具辨识度。",
        "structure": "中央峡部明显，半细胞裂片呈对称展开，边缘分叉和裂片层级是重要识别依据。",
        "habitat": "多见于清洁、弱酸性或有机质适中的淡水湿地、浅湖和沼泽环境。",
        "monitoring_value": "形态复杂，适合作为显微摄影、分类教学和科研展示样本。",
        "difficulty": "低对焦质量会让裂片边缘虚化，影响与其他星状鼓藻的区分。",
        "similar": ["星形鼓藻", "拟角星鼓藻", "针星鼓藻"],
        "reference_key": "micrasterias",
        "color": "#f59e0b",
        "traits": ["放射状裂片", "复杂轮廓", "对称结构明显", "边缘分叉"],
        "morphology": [
            {"label": "细胞形态", "value": "半细胞裂片明显，外缘具有多级分叉，整体呈星状或叶片状对称。"},
            {"label": "识别要点", "value": "观察外缘裂片数量、分叉深度和中心对称关系。"},
            {"label": "生态意义", "value": "可作为淡水微藻形态多样性观察和科研展示样本。"},
        ],
        "observation_tips": ["建议提高对焦精度，避免复杂裂片边缘被虚化。"],
    },
    "filamentous": {
        "species": "丝状绿藻",
        "scientific_name": "Filamentous green algae",
        "common_name": "丝状藻类",
        "category": "相近干扰类群",
        "confidence": 0.72,
        "description": "由多个细胞连接形成丝状结构，与单细胞鼓藻在形态上差异明显。",
        "structure": "多个细胞首尾相连，形成丝状或网状结构，常成团出现。",
        "habitat": "常见于营养较丰富的池塘、沟渠和湖岸附着环境。",
        "monitoring_value": "大量出现时可提示水体营养状态变化，但不应直接作为水质诊断结论。",
        "difficulty": "背景中的丝状干扰物可能影响鼓藻边缘识别，需要人工复核主体目标。",
        "similar": ["长形绿藻", "棒形鼓藻"],
        "reference_key": "cosmarium",
        "color": "#fb7185",
        "traits": ["细胞串联", "丝状结构", "形态较长", "常成团出现"],
        "morphology": [
            {"label": "细胞形态", "value": "多个细胞首尾相连，形成明显丝状或网状结构。"},
            {"label": "识别要点", "value": "与鼓藻相比，单细胞对称结构不明显。"},
        ],
        "observation_tips": ["上传时尽量包含完整丝状结构，便于与单细胞鼓藻区分。"],
    },
}


def get_species_profile(key: str = "cosmarium") -> dict:
    return DESMID_CATALOG.get(key, DESMID_CATALOG["cosmarium"])


def catalog_as_list() -> list[dict]:
    return [{"key": key, **value} for key, value in DESMID_CATALOG.items()]
