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
BG_NAME = "Codex Defense Clean Background"
WASH_NAME = "Codex Defense Readability Wash"
DETAIL_NAME = "Codex Defense Detail"

PALETTE = {
    "deep": "0B4A47",
    "deep2": "123F3D",
    "teal": "0F766E",
    "teal2": "2A9D8F",
    "aqua": "72D4CA",
    "line": "8CCFC7",
    "amber": "D99A24",
    "mist": "E7F8F4",
    "white": "FFFFFF",
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


def remove_generated_layers(sp_tree: ET.Element, slide_w: int, slide_h: int) -> None:
    for child in list(sp_tree):
        c_nv_pr = child.find(".//p:cNvPr", NS)
        name = c_nv_pr.attrib.get("name", "") if c_nv_pr is not None else ""
        if (
            name.startswith("Codex")
            or name.startswith(BG_NAME)
            or name.startswith(WASH_NAME)
            or name.startswith(DETAIL_NAME)
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


def solid_fill(parent: ET.Element, color: str, alpha: int | None = None) -> None:
    solid = ET.SubElement(parent, qn("a", "solidFill"))
    srgb = ET.SubElement(solid, qn("a", "srgbClr"), {"val": color})
    if alpha is not None:
        ET.SubElement(srgb, qn("a", "alpha"), {"val": str(alpha)})


def no_fill(parent: ET.Element) -> None:
    ET.SubElement(parent, qn("a", "noFill"))


def add_line_style(parent: ET.Element, color: str, alpha: int = 70000, width: int = 11000) -> None:
    ln = ET.SubElement(parent, qn("a", "ln"), {"w": str(width)})
    solid = ET.SubElement(ln, qn("a", "solidFill"))
    srgb = ET.SubElement(solid, qn("a", "srgbClr"), {"val": color})
    ET.SubElement(srgb, qn("a", "alpha"), {"val": str(alpha)})


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
    nv = ET.SubElement(shape, qn("p", "nvSpPr"))
    ET.SubElement(nv, qn("p", "cNvPr"), {"id": str(shape_id), "name": WASH_NAME})
    ET.SubElement(nv, qn("p", "cNvSpPr"))
    ET.SubElement(nv, qn("p", "nvPr"))
    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": "0", "y": "0"})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": str(slide_w), "cy": str(slide_h)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "rect"})
    ET.SubElement(geom, qn("a", "avLst"))
    solid_fill(sp_pr, color, alpha)
    ET.SubElement(sp_pr, qn("a", "ln"), {"w": "0"})
    return shape


def add_shape(
    sp_tree: ET.Element,
    shape_id: int,
    geom_type: str,
    x: float,
    y: float,
    w: float,
    h: float,
    line: str = "8CCFC7",
    line_alpha: int = 62000,
    fill: str | None = None,
    fill_alpha: int = 15000,
    width: int = 12000,
) -> None:
    shape = ET.Element(qn("p", "sp"))
    nv = ET.SubElement(shape, qn("p", "nvSpPr"))
    ET.SubElement(nv, qn("p", "cNvPr"), {"id": str(shape_id), "name": f"{DETAIL_NAME} {geom_type}"})
    ET.SubElement(nv, qn("p", "cNvSpPr"))
    ET.SubElement(nv, qn("p", "nvPr"))
    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": emu(x), "y": emu(y)})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": emu(w), "cy": emu(h)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": geom_type})
    ET.SubElement(geom, qn("a", "avLst"))
    if fill:
        solid_fill(sp_pr, fill, fill_alpha)
    else:
        no_fill(sp_pr)
    add_line_style(sp_pr, line, line_alpha, width)
    sp_tree.append(shape)


def add_text(
    sp_tree: ET.Element,
    shape_id: int,
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
    ET.SubElement(nv, qn("p", "cNvPr"), {"id": str(shape_id), "name": f"{DETAIL_NAME} text"})
    ET.SubElement(nv, qn("p", "cNvSpPr"), {"txBox": "1"})
    ET.SubElement(nv, qn("p", "nvPr"))
    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": emu(x), "y": emu(y)})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": emu(w), "cy": emu(h)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "rect"})
    ET.SubElement(geom, qn("a", "avLst"))
    no_fill(sp_pr)
    ET.SubElement(ET.SubElement(sp_pr, qn("a", "ln")), qn("a", "noFill"))
    tx = ET.SubElement(shape, qn("p", "txBody"))
    ET.SubElement(tx, qn("a", "bodyPr"), {"lIns": "0", "rIns": "0", "tIns": "0", "bIns": "0"})
    ET.SubElement(tx, qn("a", "lstStyle"))
    for para in paragraphs:
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
        ET.SubElement(r, qn("a", "t")).text = para
        end = ET.SubElement(p, qn("a", "endParaRPr"), {"lang": "zh-CN", "sz": str(size_pt * 100)})
        for tag in ("latin", "ea", "cs"):
            ET.SubElement(end, qn("a", tag), {"typeface": font})
    sp_tree.append(shape)


def add_line(sp_tree: ET.Element, shape_id: int, x: float, y: float, w: float, h: float, color: str = "2A9D8F") -> None:
    add_shape(sp_tree, shape_id, "rect", x, y, w, h, line=color, line_alpha=0, fill=color, fill_alpha=70000, width=0)


def add_desmid_icon(sp_tree: ET.Element, sid: int, cx: float, cy: float, scale: float = 1.0) -> int:
    add_shape(sp_tree, sid, "ellipse", cx - 0.62 * scale, cy - 0.35 * scale, 0.9 * scale, 0.7 * scale, PALETTE["teal"], 42000, None, width=13000)
    sid += 1
    add_shape(sp_tree, sid, "ellipse", cx - 0.03 * scale, cy - 0.35 * scale, 0.9 * scale, 0.7 * scale, PALETTE["teal"], 42000, None, width=13000)
    sid += 1
    add_shape(sp_tree, sid, "rect", cx - 0.06 * scale, cy - 0.38 * scale, 0.12 * scale, 0.76 * scale, PALETTE["aqua"], 50000, PALETTE["aqua"], 26000, width=8000)
    sid += 1
    add_shape(sp_tree, sid, "ellipse", cx - 0.22 * scale, cy - 0.16 * scale, 0.18 * scale, 0.18 * scale, PALETTE["teal2"], 36000, None, width=9000)
    sid += 1
    add_shape(sp_tree, sid, "ellipse", cx + 0.22 * scale, cy - 0.02 * scale, 0.16 * scale, 0.16 * scale, PALETTE["teal2"], 32000, None, width=9000)
    sid += 1
    return sid


def add_desmid_watermark(sp_tree: ET.Element, sid: int, cx: float, cy: float, scale: float = 1.0) -> int:
    add_shape(sp_tree, sid, "ellipse", cx - 0.75 * scale, cy - 0.38 * scale, 1.05 * scale, 0.76 * scale, PALETTE["teal"], 15000, None, width=9000)
    sid += 1
    add_shape(sp_tree, sid, "ellipse", cx - 0.30 * scale, cy - 0.38 * scale, 1.05 * scale, 0.76 * scale, PALETTE["teal"], 15000, None, width=9000)
    sid += 1
    add_shape(sp_tree, sid, "rect", cx - 0.05 * scale, cy - 0.44 * scale, 0.10 * scale, 0.88 * scale, PALETTE["aqua"], 13000, PALETTE["aqua"], 9000, width=5000)
    sid += 1
    for dx, dy in [(-0.33, -0.08), (0.32, 0.08), (-0.08, 0.22), (0.12, -0.24)]:
        add_shape(sp_tree, sid, "ellipse", cx + dx * scale, cy + dy * scale, 0.12 * scale, 0.12 * scale, PALETTE["teal2"], 12000, None, width=5000)
        sid += 1
    return sid


def add_mini_points(sp_tree: ET.Element, sid: int, x: float, y: float, count: int = 5) -> int:
    for i in range(count):
        add_shape(sp_tree, sid, "ellipse", x + i * 0.22, y + (i % 2) * 0.1, 0.06, 0.06, PALETTE["teal2"], 70000, PALETTE["teal2"], 72000, width=4000)
        sid += 1
    return sid


def add_species_card_details(sp_tree: ET.Element, sid: int, font: str) -> int:
    cards = [
        (0.82, "细长弯月形", "端部渐尖，轮廓清晰"),
        (5.60, "中央缢缩明显", "半细胞近圆，对称性强"),
        (10.36, "星状裂片结构", "边缘突起，需复核形态"),
        (15.13, "凹顶与侧缘", "观察顶端凹陷和纹饰"),
    ]
    for x, title, body in cards:
        sid = add_desmid_icon(sp_tree, sid, x + 2.0, 3.7, 1.15)
        add_text(sp_tree, sid, [title], x + 0.42, 4.86, 2.35, 0.26, font, PALETTE["deep"], 9, True)
        sid += 1
        add_text(sp_tree, sid, [body], x + 0.42, 5.28, 2.86, 0.24, font, PALETTE["deep2"], 8, False)
        sid += 1
        add_line(sp_tree, sid, x + 0.42, 5.72, 1.18, 0.035, PALETTE["teal2"])
        sid += 1
        sid = add_desmid_watermark(sp_tree, sid, x + 2.04, 7.42, 1.55)
    return sid


def add_scenario_details(sp_tree: ET.Element, sid: int, font: str) -> int:
    details = [
        (0.90, ["适合高频样本初筛", "支持长期点位归档"]),
        (5.40, ["降低课堂识别门槛", "辅助形态观察讲解"]),
        (9.90, ["统一图片与复核状态", "便于检索和导出"]),
        (14.40, ["沉淀区域分布线索", "服务生态趋势分析"]),
    ]
    for x, lines in details:
        sid = add_desmid_icon(sp_tree, sid, x + 2.0, 3.65, 0.95)
        add_text(sp_tree, sid, [f"· {lines[0]}", f"· {lines[1]}"], x + 0.46, 4.58, 2.76, 0.58, font, PALETTE["deep2"], 8, False)
        sid += 1
        sid = add_mini_points(sp_tree, sid, x + 0.46, 5.54, 5)
        sid = add_desmid_watermark(sp_tree, sid, x + 2.02, 7.34, 1.35)
    return sid


def add_plan_details(sp_tree: ET.Element, sid: int, font: str) -> int:
    columns = [
        (0.86, "交付重点", ["权重接入", "复核体验", "报告稳定"]),
        (7.05, "能力扩展", ["真实图库", "分布同步", "生态维度"]),
        (13.25, "长期沉淀", ["水质指标", "模型迭代", "分析底座"]),
    ]
    for x, title, items in columns:
        add_text(sp_tree, sid, [title], x + 0.35, 4.28, 1.65, 0.24, font, PALETTE["deep"], 9, True)
        sid += 1
        y = 4.88
        for i, item in enumerate(items):
            add_shape(sp_tree, sid, "ellipse", x + 0.38, y + i * 0.45, 0.08, 0.08, PALETTE["teal2"], 80000, PALETTE["teal2"], 80000, width=4000)
            sid += 1
            add_text(sp_tree, sid, [item], x + 0.58, y - 0.04 + i * 0.45, 1.75, 0.20, font, PALETTE["deep2"], 8, False)
            sid += 1
        add_line(sp_tree, sid, x + 0.36, 6.42, 2.45, 0.035, PALETTE["teal2"])
        sid += 1
        sid = add_desmid_watermark(sp_tree, sid, x + 3.18, 7.72, 1.55)
    return sid


def add_detection_canvas_details(sp_tree: ET.Element, sid: int) -> int:
    # Fine grid inside the large detection canvas, no panels.
    for i in range(7):
        add_shape(sp_tree, sid, "rect", 2.35 + i * 0.82, 2.75, 0.01, 5.05, PALETTE["line"], 25000, PALETTE["line"], 20000, width=3000)
        sid += 1
    for i in range(5):
        add_shape(sp_tree, sid, "rect", 1.70, 3.05 + i * 0.86, 8.05, 0.01, PALETTE["line"], 25000, PALETTE["line"], 20000, width=3000)
        sid += 1
    sid = add_desmid_icon(sp_tree, sid, 4.05, 4.25, 1.0)
    sid = add_desmid_icon(sp_tree, sid, 7.40, 5.75, 0.85)
    return sid


def add_map_details(sp_tree: ET.Element, sid: int, font: str) -> int:
    points = [(5.7, 5.1), (7.2, 4.35), (8.6, 5.85), (6.5, 6.4), (9.25, 4.85)]
    for x, y in points:
        add_shape(sp_tree, sid, "ellipse", x, y, 0.12, 0.12, PALETTE["teal"], 80000, PALETTE["teal"], 80000, width=4000)
        sid += 1
        add_shape(sp_tree, sid, "ellipse", x - 0.08, y - 0.08, 0.28, 0.28, PALETTE["teal"], 25000, None, width=7000)
        sid += 1
    add_text(sp_tree, sid, ["点位密度用于辅助判断分布趋势，公开数据仅作宏观参考"], 4.25, 7.58, 5.55, 0.24, font, PALETTE["deep2"], 8, False)
    sid += 1
    return sid


def add_clean_details(sp_tree: ET.Element, slide_idx: int, font: str) -> None:
    sid = next_shape_id(sp_tree)
    if slide_idx == 13:
        add_species_card_details(sp_tree, sid, font)
    elif slide_idx == 17:
        add_scenario_details(sp_tree, sid, font)
    elif slide_idx == 18:
        add_plan_details(sp_tree, sid, font)
    elif slide_idx == 10:
        add_detection_canvas_details(sp_tree, sid)
    elif slide_idx == 14:
        add_map_details(sp_tree, sid, font)


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
        return PALETTE["deep"], 9000
    if key == "data":
        return PALETTE["white"], 10000
    if key == "section":
        return PALETTE["white"], 8000
    return PALETTE["white"], 9500


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
            "cover": "ppt/media/codex_v4_bg_cover.png",
            "section": "ppt/media/codex_v4_bg_section.png",
            "content": "ppt/media/codex_v4_bg_content.png",
            "data": "ppt/media/codex_v4_bg_data.png",
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
                    remove_generated_layers(sp_tree, slide_w, slide_h)
                    shape_id = next_shape_id(sp_tree)
                    bg_pic = make_background_pic(rid, shape_id, slide_w, slide_h)
                    wash_color, wash_alpha = overlay_for_key(key)
                    wash = make_overlay(shape_id + 1, slide_w, slide_h, wash_color, wash_alpha)
                    insert_at = 2 if len(sp_tree) >= 2 else 0
                    sp_tree.insert(insert_at, wash)
                    sp_tree.insert(insert_at, bg_pic)
                    add_clean_details(sp_tree, idx, args.font_face)

                write_xml(zout, slide_name, slide_root)
                write_xml(zout, rels_name, rels_root)

    print(f"Wrote clean defense PPTX: {output_path}")


if __name__ == "__main__":
    main()
