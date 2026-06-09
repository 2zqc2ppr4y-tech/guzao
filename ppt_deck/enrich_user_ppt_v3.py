from __future__ import annotations

import argparse
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET


NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

for prefix, uri in NS.items():
    if prefix != "rel":
        ET.register_namespace(prefix, uri)

IMAGE_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
EMU = 914400
BG_NAME = "Codex Unified Aqua Background"
WASH_NAME = "Codex Unified Aqua Wash"
ENRICH_NAME = "Codex Content Enrichment"


PALETTE = {
    "deep": "0F4F4C",
    "deep2": "153F45",
    "teal": "0F766E",
    "teal2": "2A9D8F",
    "aqua": "77D6D0",
    "mist": "EAFBF7",
    "paper": "F7FFFC",
    "amber": "E9B44C",
    "muted": "5F7F7B",
    "line": "9BD8D0",
    "white": "FFFFFF",
}


SLIDE_EXTRAS: dict[int, dict[str, object]] = {
    1: {
        "mode": "cover",
        "headline": "平台能力矩阵",
        "body": ["YOLO11 目标检测", "低置信样本复核", "生态数据归档"],
        "chips": ["识别", "复核", "图谱", "报告"],
    },
    2: {
        "headline": "评审阅读线索",
        "body": ["先看需求真实性", "再看系统闭环", "最后看扩展价值"],
        "chips": ["背景", "架构", "功能", "创新"],
    },
    3: {
        "headline": "本页判断",
        "body": ["显微图像积累让模型训练具备数据基础", "平台化记录让人工经验变成可复核资产"],
        "chips": ["生态监测", "科研教学", "智能升级"],
    },
    4: {
        "headline": "痛点影响链",
        "body": ["识别门槛高会限制样本通量", "记录分散会削弱复核与模型迭代", "缺少分析会让数据价值停留在单次判断"],
        "chips": ["门槛", "通量", "复核", "沉淀"],
    },
    5: {
        "headline": "闭环价值",
        "body": ["每次检测都形成可追溯记录", "人工复核结果可反哺样本库", "报告导出让科研沟通更稳定"],
        "chips": ["可信", "高效", "可沉淀"],
    },
    6: {
        "headline": "工程拆解",
        "body": ["前端承载科研工作台体验", "后端负责推理调度和数据服务", "数据层保存样本、报告与模型版本"],
        "chips": ["React", "Flask", "YOLO11", "SQLite"],
    },
    7: {
        "headline": "接口线索",
        "body": ["POST /api/predict 完成单图识别", "GET /api/history 支撑记录追溯", "GET /api/stats 进入数据看板"],
        "chips": ["上传", "推理", "记录", "统计"],
    },
    8: {
        "headline": "数据口径",
        "body": ["输入包含图片与采样元数据", "输出包含类别、检测框、置信度与候选排序", "复核后进入样本归档与报告链路"],
        "chips": ["输入", "推理", "复核", "输出"],
    },
    9: {
        "headline": "工作台信号",
        "body": ["首屏直接呈现模型状态与关键指标", "最近记录帮助用户快速进入复核任务", "入口区覆盖高频科研操作"],
        "chips": ["在线", "指标", "记录", "入口"],
    },
    10: {
        "headline": "复核规则",
        "body": ["0.85 以上可作为高置信候选", "0.70-0.85 建议人工确认形态细节", "低于 0.70 自动进入复核队列"],
        "chips": ["置信度", "候选排序", "人工确认"],
    },
    11: {
        "headline": "批量控制点",
        "body": ["统一记录文件名、类别和置信度", "低置信样本集中进入复核", "CSV 与批量报告支持后续整理"],
        "chips": ["批量", "低置信", "导出"],
    },
    12: {
        "headline": "报告组成",
        "body": ["样本信息保留图像来源", "检测结果保留类别与置信度", "复核建议提示科研边界"],
        "chips": ["样本", "结果", "建议", "导出"],
    },
    13: {
        "headline": "档案字段",
        "body": ["中文属名与拉丁名并列展示", "形态描述服务人工复核", "分布记录连接生态图谱"],
        "chips": ["名称", "形态", "图片", "分布"],
    },
    14: {
        "headline": "图层价值",
        "body": ["本地采样体现项目自有数据", "公开记录提供宏观参考", "筛选维度帮助发现空间分布线索"],
        "chips": ["本地", "公开", "筛选", "导出"],
    },
    15: {
        "headline": "工程价值",
        "body": ["真实权重与演示机制并存", "AI 复核和规则复核互补", "接口清晰便于后续功能扩展"],
        "chips": ["推理", "回退", "复核", "扩展"],
    },
    16: {
        "headline": "创新落点",
        "body": ["从单点识别变成完整工作流", "从模型标签变成可信解释", "从图片管理变成生态数据资产"],
        "chips": ["流程", "解释", "资产", "体验"],
    },
    17: {
        "headline": "适配人群",
        "body": ["监测人员关注效率与归档", "教学用户关注形态解释", "管理人员关注统计与导出"],
        "chips": ["监测", "教学", "管理"],
    },
    18: {
        "headline": "收束表达",
        "body": ["近期夯实识别与报告", "中期扩充图库和图谱", "长期走向水生态智能分析底座"],
        "chips": ["近期", "中期", "长期"],
    },
}

SKIP_INSIGHT_CARD = {4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18}
SKIP_EVIDENCE_STRIP = {1, 10, 18}
CARD_POSITIONS = {
    2: (2.95, 7.20, 4.18, 1.62),
    3: (14.72, 7.80, 4.24, 1.78),
    5: (14.55, 8.08, 4.28, 1.72),
    9: (14.60, 7.72, 4.34, 1.76),
    13: (14.76, 7.68, 4.18, 1.78),
    17: (14.70, 7.55, 4.22, 1.82),
}


def qn(prefix: str, tag: str) -> str:
    return f"{{{NS[prefix]}}}{tag}"


def emu(v: float) -> str:
    return str(int(v * EMU))


def read_slide_size(payload: dict[str, bytes]) -> tuple[int, int]:
    root = ET.fromstring(payload["ppt/presentation.xml"])
    sld_sz = root.find("p:sldSz", NS)
    if sld_sz is None:
        return 9144000, 5143500
    return int(sld_sz.get("cx", "9144000")), int(sld_sz.get("cy", "5143500"))


def write_xml(zf: zipfile.ZipFile, name: str, root: ET.Element) -> None:
    zf.writestr(name, ET.tostring(root, encoding="utf-8", xml_declaration=True))


def next_rid(rels_root: ET.Element) -> str:
    max_id = 0
    for rel in rels_root:
        rid = rel.attrib.get("Id", "")
        match = re.match(r"rId(\d+)$", rid)
        if match:
            max_id = max(max_id, int(match.group(1)))
    return f"rId{max_id + 1}"


def next_shape_id(sp_tree: ET.Element) -> int:
    max_id = 1
    for c_nv_pr in sp_tree.findall(".//p:cNvPr", NS):
        raw = c_nv_pr.attrib.get("id")
        if raw and raw.isdigit():
            max_id = max(max_id, int(raw))
    return max_id + 1


def get_xfrm(child: ET.Element) -> tuple[int, int, int, int] | None:
    xfrm = child.find(".//a:xfrm", NS)
    if xfrm is None:
        return None
    off = xfrm.find("a:off", NS)
    ext = xfrm.find("a:ext", NS)
    if off is None or ext is None:
        return None
    return (
        int(off.get("x", "0")),
        int(off.get("y", "0")),
        int(ext.get("cx", "0")),
        int(ext.get("cy", "0")),
    )


def has_text(child: ET.Element) -> bool:
    return any((t.text or "").strip() for t in child.findall(".//a:t", NS))


def remove_existing_layers(sp_tree: ET.Element, slide_w: int, slide_h: int) -> None:
    for child in list(sp_tree):
        c_nv_pr = child.find(".//p:cNvPr", NS)
        name = c_nv_pr.attrib.get("name", "") if c_nv_pr is not None else ""
        if (
            name.startswith("Codex Rich")
            or name.startswith(BG_NAME)
            or name.startswith(WASH_NAME)
            or name.startswith(ENRICH_NAME)
        ):
            sp_tree.remove(child)
            continue
        if child.tag == qn("p", "sp") and not has_text(child):
            xfrm = get_xfrm(child)
            if xfrm is None:
                continue
            x, y, w, h = xfrm
            if abs(x) <= 20000 and abs(y) <= 20000 and w >= slide_w * 0.98 and h >= slide_h * 0.98:
                sp_tree.remove(child)


def make_background_pic(rid: str, shape_id: int, slide_w: int, slide_h: int) -> ET.Element:
    pic = ET.Element(qn("p", "pic"))
    nv_pic_pr = ET.SubElement(pic, qn("p", "nvPicPr"))
    ET.SubElement(nv_pic_pr, qn("p", "cNvPr"), {"id": str(shape_id), "name": BG_NAME})
    c_nv_pic_pr = ET.SubElement(nv_pic_pr, qn("p", "cNvPicPr"))
    ET.SubElement(c_nv_pic_pr, qn("a", "picLocks"), {"noChangeAspect": "1"})
    ET.SubElement(nv_pic_pr, qn("p", "nvPr"))
    blip_fill = ET.SubElement(pic, qn("p", "blipFill"))
    ET.SubElement(blip_fill, qn("a", "blip"), {qn("r", "embed"): rid})
    stretch = ET.SubElement(blip_fill, qn("a", "stretch"))
    ET.SubElement(stretch, qn("a", "fillRect"))
    sp_pr = ET.SubElement(pic, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": "0", "y": "0"})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": str(slide_w), "cy": str(slide_h)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "rect"})
    ET.SubElement(geom, qn("a", "avLst"))
    return pic


def make_overlay(shape_id: int, slide_w: int, slide_h: int, color: str, alpha: int) -> ET.Element:
    shape = ET.Element(qn("p", "sp"))
    nv_sp_pr = ET.SubElement(shape, qn("p", "nvSpPr"))
    ET.SubElement(nv_sp_pr, qn("p", "cNvPr"), {"id": str(shape_id), "name": WASH_NAME})
    ET.SubElement(nv_sp_pr, qn("p", "cNvSpPr"))
    ET.SubElement(nv_sp_pr, qn("p", "nvPr"))
    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": "0", "y": "0"})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": str(slide_w), "cy": str(slide_h)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "rect"})
    ET.SubElement(geom, qn("a", "avLst"))
    solid = ET.SubElement(sp_pr, qn("a", "solidFill"))
    srgb = ET.SubElement(solid, qn("a", "srgbClr"), {"val": color})
    ET.SubElement(srgb, qn("a", "alpha"), {"val": str(alpha)})
    ET.SubElement(sp_pr, qn("a", "ln"), {"w": "0"})
    return shape


def solid_fill(parent: ET.Element, color: str, alpha: int | None = None) -> None:
    solid = ET.SubElement(parent, qn("a", "solidFill"))
    srgb = ET.SubElement(solid, qn("a", "srgbClr"), {"val": color})
    if alpha is not None:
        ET.SubElement(srgb, qn("a", "alpha"), {"val": str(alpha)})


def line_fill(parent: ET.Element, color: str, alpha: int = 100000, width: int = 9000) -> None:
    ln = ET.SubElement(parent, qn("a", "ln"), {"w": str(width)})
    solid = ET.SubElement(ln, qn("a", "solidFill"))
    srgb = ET.SubElement(solid, qn("a", "srgbClr"), {"val": color})
    ET.SubElement(srgb, qn("a", "alpha"), {"val": str(alpha)})


def add_rect(
    sp_tree: ET.Element,
    shape_id: int,
    name: str,
    x: float,
    y: float,
    w: float,
    h: float,
    fill: str,
    alpha: int,
    line: str | None = None,
    line_alpha: int = 58000,
    radius: bool = True,
) -> None:
    shape = ET.Element(qn("p", "sp"))
    nv = ET.SubElement(shape, qn("p", "nvSpPr"))
    ET.SubElement(nv, qn("p", "cNvPr"), {"id": str(shape_id), "name": f"{ENRICH_NAME} {name}"})
    ET.SubElement(nv, qn("p", "cNvSpPr"))
    ET.SubElement(nv, qn("p", "nvPr"))
    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": emu(x), "y": emu(y)})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": emu(w), "cy": emu(h)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "roundRect" if radius else "rect"})
    ET.SubElement(geom, qn("a", "avLst"))
    solid_fill(sp_pr, fill, alpha)
    if line:
        line_fill(sp_pr, line, line_alpha, 8500)
    else:
        ET.SubElement(ET.SubElement(sp_pr, qn("a", "ln")), qn("a", "noFill"))
    sp_tree.append(shape)


def add_text(
    sp_tree: ET.Element,
    shape_id: int,
    name: str,
    paragraphs: list[str],
    x: float,
    y: float,
    w: float,
    h: float,
    font: str,
    color: str,
    size_pt: int,
    bold: bool = False,
    align: str = "l",
) -> None:
    shape = ET.Element(qn("p", "sp"))
    nv = ET.SubElement(shape, qn("p", "nvSpPr"))
    ET.SubElement(nv, qn("p", "cNvPr"), {"id": str(shape_id), "name": f"{ENRICH_NAME} {name}"})
    ET.SubElement(nv, qn("p", "cNvSpPr"), {"txBox": "1"})
    ET.SubElement(nv, qn("p", "nvPr"))
    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": emu(x), "y": emu(y)})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": emu(w), "cy": emu(h)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "rect"})
    ET.SubElement(geom, qn("a", "avLst"))
    ET.SubElement(sp_pr, qn("a", "noFill"))
    ET.SubElement(ET.SubElement(sp_pr, qn("a", "ln")), qn("a", "noFill"))
    tx = ET.SubElement(shape, qn("p", "txBody"))
    ET.SubElement(tx, qn("a", "bodyPr"), {"lIns": "0", "rIns": "0", "tIns": "0", "bIns": "0"})
    ET.SubElement(tx, qn("a", "lstStyle"))
    for paragraph in paragraphs:
        p = ET.SubElement(tx, qn("a", "p"))
        ET.SubElement(p, qn("a", "pPr"), {"algn": {"l": "l", "c": "ctr", "r": "r"}[align]})
        r = ET.SubElement(p, qn("a", "r"))
        attrs = {"lang": "zh-CN", "sz": str(size_pt * 100)}
        if bold:
            attrs["b"] = "1"
        r_pr = ET.SubElement(r, qn("a", "rPr"), attrs)
        solid_fill(r_pr, color)
        for tag in ("latin", "ea", "cs"):
            ET.SubElement(r_pr, qn("a", tag), {"typeface": font})
        ET.SubElement(r, qn("a", "t")).text = paragraph
        end = ET.SubElement(p, qn("a", "endParaRPr"), {"lang": "zh-CN", "sz": str(size_pt * 100)})
        for tag in ("latin", "ea", "cs"):
            ET.SubElement(end, qn("a", tag), {"typeface": font})
    sp_tree.append(shape)


def add_line(
    sp_tree: ET.Element,
    shape_id: int,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    color: str,
    alpha: int = 68000,
    width: int = 11500,
) -> None:
    shape = ET.Element(qn("p", "sp"))
    nv = ET.SubElement(shape, qn("p", "nvSpPr"))
    ET.SubElement(nv, qn("p", "cNvPr"), {"id": str(shape_id), "name": f"{ENRICH_NAME} line"})
    ET.SubElement(nv, qn("p", "cNvSpPr"))
    ET.SubElement(nv, qn("p", "nvPr"))
    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": emu(min(x1, x2)), "y": emu(min(y1, y2))})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": emu(abs(x2 - x1) or 0.01), "cy": emu(abs(y2 - y1) or 0.01)})
    ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "line"})
    line_fill(sp_pr, color, alpha, width)
    sp_tree.append(shape)


def add_chip_row(
    sp_tree: ET.Element,
    sid: int,
    chips: list[str],
    x: float,
    y: float,
    font: str,
    max_w: float = 4.2,
) -> int:
    cur_x = x
    for i, chip in enumerate(chips[:5]):
        w = min(max(0.72, len(chip) * 0.18 + 0.46), 1.55)
        if cur_x + w > x + max_w:
            break
        add_rect(sp_tree, sid, f"chip-{i}", cur_x, y, w, 0.28, PALETTE["mist"], 76000, PALETTE["line"], 62000)
        sid += 1
        add_text(sp_tree, sid, f"chip-text-{i}", [chip], cur_x + 0.12, y + 0.055, w - 0.24, 0.15, font, PALETTE["teal"], 7, True, "c")
        sid += 1
        cur_x += w + 0.10
    return sid


def add_micro_chart(sp_tree: ET.Element, sid: int, x: float, y: float) -> int:
    add_rect(sp_tree, sid, "micro-chart-bg", x, y, 2.2, 0.86, PALETTE["paper"], 70000, PALETTE["line"], 48000)
    sid += 1
    add_text(sp_tree, sid, "micro-chart-title", ["样本可信度"], x + 0.18, y + 0.12, 1.0, 0.18, "Microsoft YaHei UI", PALETTE["deep2"], 6, True)
    sid += 1
    vals = [0.55, 0.82, 0.68, 0.91, 0.74]
    for i, val in enumerate(vals):
        bx = x + 0.22 + i * 0.35
        add_rect(sp_tree, sid, f"bar-{i}", bx, y + 0.64 - val * 0.42, 0.16, val * 0.42, PALETTE["teal2"], 76000, None, radius=False)
        sid += 1
    add_line(sp_tree, sid, x + 0.2, y + 0.68, x + 1.95, y + 0.68, PALETTE["line"], 62000, 7000)
    sid += 1
    return sid


def add_corner_marks(sp_tree: ET.Element, sid: int, slide_idx: int, font: str) -> int:
    add_rect(sp_tree, sid, "section-marker", 18.18, 0.74, 1.12, 0.34, PALETTE["mist"], 72000, PALETTE["line"], 62000)
    sid += 1
    add_text(sp_tree, sid, "section-marker-text", [f"DESMID / {slide_idx:02d}"], 18.31, 0.84, 0.86, 0.1, font, PALETTE["deep"], 5, True, "c")
    sid += 1
    for i in range(4):
        add_rect(sp_tree, sid, f"dot-{i}", 18.25 + i * 0.2, 1.22, 0.07, 0.07, PALETTE["teal2"], 86000, None)
        sid += 1
    return sid


def add_side_scale(sp_tree: ET.Element, sid: int, font: str) -> int:
    add_rect(sp_tree, sid, "right-scale-rail", 19.22, 1.58, 0.22, 7.7, PALETTE["mist"], 46000, PALETTE["line"], 36000, radius=False)
    sid += 1
    for i, label in enumerate(["IMG", "AI", "QC", "MAP", "DOC"]):
        y = 1.84 + i * 1.34
        add_rect(sp_tree, sid, f"scale-dot-{i}", 19.285, y, 0.09, 0.09, PALETTE["teal2"], 85000, None)
        sid += 1
        add_text(sp_tree, sid, f"scale-label-{i}", [label], 19.03, y + 0.18, 0.54, 0.10, font, PALETTE["teal"], 4, True, "c")
        sid += 1
    return sid


def add_evidence_strip(sp_tree: ET.Element, sid: int, font: str, chips: list[str]) -> int:
    add_rect(sp_tree, sid, "bottom-strip", 0.78, 10.68, 18.55, 0.34, PALETTE["mist"], 52000, PALETTE["line"], 36000, radius=False)
    sid += 1
    add_rect(sp_tree, sid, "bottom-strip-rail", 0.78, 10.68, 0.08, 0.34, PALETTE["teal"], 78000, None, radius=False)
    sid += 1
    add_text(sp_tree, sid, "bottom-strip-title", ["证据层"], 1.05, 10.78, 0.62, 0.08, font, PALETTE["deep"], 5, True)
    sid += 1
    add_text(
        sp_tree,
        sid,
        "bottom-strip-text",
        ["图像识别 / 置信度 / 人工复核 / 样本归档 / 生态图谱共同支撑平台可信度"],
        1.76,
        10.785,
        6.55,
        0.08,
        font,
        PALETTE["deep2"],
        4,
        False,
    )
    sid += 1
    cur = 8.85
    for i, chip in enumerate(chips[:4]):
        w = min(max(0.82, len(chip) * 0.18 + 0.48), 1.42)
        add_rect(sp_tree, sid, f"evidence-chip-{i}", cur, 10.755, w, 0.18, PALETTE["paper"], 68000, PALETTE["line"], 46000)
        sid += 1
        add_text(sp_tree, sid, f"evidence-chip-text-{i}", [chip], cur + 0.08, 10.805, w - 0.16, 0.06, font, PALETTE["teal"], 4, True, "c")
        sid += 1
        cur += w + 0.10
    for i, val in enumerate([0.25, 0.42, 0.34, 0.55, 0.46, 0.64, 0.51, 0.72]):
        add_rect(sp_tree, sid, f"pulse-{i}", 15.2 + i * 0.22, 10.91 - val * 0.16, 0.07, val * 0.16, PALETTE["teal2"], 72000, None, radius=False)
        sid += 1
    add_text(sp_tree, sid, "bottom-strip-tag", ["AQUA DATA LAYER"], 17.08, 10.79, 1.15, 0.08, font, PALETTE["teal"], 4, True, "r")
    sid += 1
    return sid


def add_enrichment(sp_tree: ET.Element, slide_idx: int, font: str) -> None:
    extra = SLIDE_EXTRAS.get(slide_idx)
    if not extra:
        return
    sid = next_shape_id(sp_tree)
    mode = str(extra.get("mode", "content"))
    headline = str(extra["headline"])
    body = list(extra["body"])  # type: ignore[arg-type]
    chips = list(extra["chips"])  # type: ignore[arg-type]

    if mode == "cover":
        add_rect(sp_tree, sid, "cover-matrix", 13.75, 7.42, 4.75, 1.8, PALETTE["paper"], 42000, PALETTE["line"], 52000)
        sid += 1
        add_text(sp_tree, sid, "cover-matrix-title", [headline], 14.05, 7.68, 1.6, 0.22, font, PALETTE["deep"], 9, True)
        sid += 1
        for i, item in enumerate(body):
            add_rect(sp_tree, sid, f"cover-matrix-row-{i}", 14.02, 8.05 + i * 0.34, 3.98, 0.24, PALETTE["mist"], 56000, None)
            sid += 1
            add_text(sp_tree, sid, f"cover-matrix-text-{i}", [item], 14.22, 8.095 + i * 0.34, 2.8, 0.13, font, PALETTE["deep2"], 6, False)
            sid += 1
            add_rect(sp_tree, sid, f"cover-matrix-dot-{i}", 14.06, 8.11 + i * 0.34, 0.08, 0.08, PALETTE["teal2"], 90000, None)
            sid += 1
        add_micro_chart(sp_tree, sid, 16.18, 7.76)
        return

    sid = add_corner_marks(sp_tree, sid, slide_idx, font)
    sid = add_side_scale(sp_tree, sid, font)
    sid = next_shape_id(sp_tree)
    if slide_idx not in SKIP_INSIGHT_CARD:
        x, y, w, h = CARD_POSITIONS.get(slide_idx, (14.78, 7.62, 4.42, 2.08))
        add_rect(sp_tree, sid, "insight-card", x, y, w, h, PALETTE["paper"], 72000, PALETTE["line"], 58000)
        sid += 1
        add_rect(sp_tree, sid, "insight-rail", x, y, 0.08, h, PALETTE["teal"], 84000, None, radius=False)
        sid += 1
        add_text(sp_tree, sid, "insight-headline", [headline], x + 0.28, y + 0.18, 2.2, 0.24, font, PALETTE["deep"], 9, True)
        sid += 1
        bullets = [f"· {item}" for item in body[:3]]
        add_text(sp_tree, sid, "insight-body", bullets, x + 0.28, y + 0.56, w - 0.54, 0.76, font, PALETTE["deep2"], 5, False)
        sid += 1
        sid = add_chip_row(sp_tree, sid, chips, x + 0.28, y + h - 0.38, font, max_w=w - 0.55)

    if slide_idx not in SKIP_EVIDENCE_STRIP:
        add_evidence_strip(sp_tree, sid, font, chips)


def apply_fonts(slide_root: ET.Element, font_face: str) -> None:
    for tag in ("rPr", "defRPr", "endParaRPr"):
        for r_pr in slide_root.findall(f".//a:{tag}", NS):
            for child_tag in ("latin", "ea", "cs"):
                child = r_pr.find(f"a:{child_tag}", NS)
                if child is None:
                    child = ET.SubElement(r_pr, qn("a", child_tag))
                child.set("typeface", font_face)


def apply_project_text_polish(slide_root: ET.Element) -> None:
    replacements = {
        "TEAM": "PROJECT",
        "SCHOOL": "STACK",
        "ADVISOR": "FOCUS",
        "鼓藻鉴析项目组 · 张三 / 李四 / 王五": "鼓藻鉴析 · 智能识别平台",
        "XX 大学 · XX 学院": "YOLO11 + Flask",
        "指导老师：XXX": "识别闭环",
    }
    for text_node in slide_root.findall(".//a:t", NS):
        if text_node.text in replacements:
            text_node.text = replacements[text_node.text]


def ensure_png_content_type(root: ET.Element) -> None:
    ct_ns = "http://schemas.openxmlformats.org/package/2006/content-types"
    default_tag = f"{{{ct_ns}}}Default"
    for child in root.findall(default_tag):
        if child.attrib.get("Extension", "").lower() == "png":
            return
    ET.SubElement(root, default_tag, {"Extension": "png", "ContentType": "image/png"})


def slide_background_key(idx: int) -> str:
    if idx == 1:
        return "cover"
    if idx in {2, 3, 5, 17, 18}:
        return "section"
    if idx in {6, 7, 8, 9, 11, 12, 14, 15, 16}:
        return "data"
    return "content"


def overlay_for_key(key: str) -> tuple[str, int]:
    if key == "cover":
        return PALETTE["deep"], 16000
    if key == "data":
        return PALETTE["mist"], 15000
    if key == "section":
        return PALETTE["mist"], 12000
    return PALETTE["paper"], 14000


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--assets-dir", required=True)
    parser.add_argument("--font-face", default="Microsoft YaHei UI")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    assets_dir = Path(args.assets_dir)
    if output_path.exists() and not args.overwrite:
        raise FileExistsError(f"Output exists: {output_path}")

    bg_files = {
        "cover": assets_dir / "cover-green-tech.png",
        "section": assets_dir / "bg-section-ecology.png",
        "content": assets_dir / "bg-content-texture.png",
        "data": assets_dir / "bg-data-grid.png",
    }
    missing = [str(p) for p in bg_files.values() if not p.exists()]
    if missing:
        raise FileNotFoundError("Missing background assets: " + ", ".join(missing))

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp) / "work.pptx"
        shutil.copyfile(input_path, tmp_path)
        with zipfile.ZipFile(tmp_path, "r") as zin:
            names = zin.namelist()
            payload = {name: zin.read(name) for name in names}

        slide_w, slide_h = read_slide_size(payload)
        slide_names = sorted(
            [name for name in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)],
            key=lambda name: int(re.search(r"slide(\d+)\.xml", name).group(1)),
        )
        media_targets = {
            "cover": "ppt/media/codex_v3_bg_cover.png",
            "section": "ppt/media/codex_v3_bg_section.png",
            "content": "ppt/media/codex_v3_bg_content.png",
            "data": "ppt/media/codex_v3_bg_data.png",
        }

        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
            for name in names:
                if name.startswith("ppt/slides/slide") and name.endswith(".xml"):
                    continue
                if name.startswith("ppt/slides/_rels/slide") and name.endswith(".xml.rels"):
                    continue
                if name.startswith("ppt/media/codex_"):
                    continue
                if name == "[Content_Types].xml":
                    root = ET.fromstring(payload[name])
                    ensure_png_content_type(root)
                    write_xml(zout, name, root)
                    continue
                zout.writestr(name, payload[name])

            for key, target in media_targets.items():
                zout.writestr(target, bg_files[key].read_bytes())

            for idx, slide_name in enumerate(slide_names, 1):
                slide_root = ET.fromstring(payload[slide_name])
                apply_fonts(slide_root, args.font_face)
                if idx == 1:
                    apply_project_text_polish(slide_root)

                rels_name = f"ppt/slides/_rels/slide{idx}.xml.rels"
                rels_root = ET.fromstring(payload[rels_name]) if rels_name in payload else ET.Element(qn("rel", "Relationships"))
                key = slide_background_key(idx)
                rid = next_rid(rels_root)
                ET.SubElement(
                    rels_root,
                    qn("rel", "Relationship"),
                    {"Id": rid, "Type": IMAGE_REL_TYPE, "Target": "../media/" + Path(media_targets[key]).name},
                )

                sp_tree = slide_root.find(".//p:cSld/p:spTree", NS)
                if sp_tree is not None:
                    remove_existing_layers(sp_tree, slide_w, slide_h)
                    shape_id = next_shape_id(sp_tree)
                    bg_pic = make_background_pic(rid, shape_id, slide_w, slide_h)
                    wash_color, wash_alpha = overlay_for_key(key)
                    wash = make_overlay(shape_id + 1, slide_w, slide_h, wash_color, wash_alpha)
                    insert_at = 2 if len(sp_tree) >= 2 else 0
                    sp_tree.insert(insert_at, wash)
                    sp_tree.insert(insert_at, bg_pic)
                    add_enrichment(sp_tree, idx, args.font_face)

                write_xml(zout, slide_name, slide_root)
                write_xml(zout, rels_name, rels_root)

    print(f"Wrote enriched PPTX: {output_path}")


if __name__ == "__main__":
    main()
