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
}

for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)

EMU = 914400
NAV_LABELS = ["背景", "能力", "数据", "规划"]


def qn(prefix: str, tag: str) -> str:
    return f"{{{NS[prefix]}}}{tag}"


def emu(v: float) -> str:
    return str(int(v * EMU))


def next_shape_id(sp_tree: ET.Element) -> int:
    max_id = 1
    for c_nv_pr in sp_tree.findall(".//p:cNvPr", NS):
        raw = c_nv_pr.attrib.get("id")
        if raw and raw.isdigit():
            max_id = max(max_id, int(raw))
    return max_id + 1


def remove_existing_nav(sp_tree: ET.Element) -> None:
    for child in list(sp_tree):
        c_nv_pr = child.find(".//p:cNvPr", NS)
        if c_nv_pr is not None and c_nv_pr.attrib.get("name", "").startswith("Codex Sample Nav"):
            sp_tree.remove(child)


def add_rect(sp_tree: ET.Element, shape_id: int, name: str, x: float, y: float, w: float, h: float,
             fill: str, alpha: int, line: str | None = None) -> None:
    shape = ET.Element(qn("p", "sp"))
    nv = ET.SubElement(shape, qn("p", "nvSpPr"))
    ET.SubElement(nv, qn("p", "cNvPr"), {"id": str(shape_id), "name": name})
    ET.SubElement(nv, qn("p", "cNvSpPr"))
    ET.SubElement(nv, qn("p", "nvPr"))
    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": emu(x), "y": emu(y)})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": emu(w), "cy": emu(h)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "roundRect"})
    ET.SubElement(geom, qn("a", "avLst"))
    solid = ET.SubElement(sp_pr, qn("a", "solidFill"))
    color = ET.SubElement(solid, qn("a", "srgbClr"), {"val": fill})
    ET.SubElement(color, qn("a", "alpha"), {"val": str(alpha)})
    ln = ET.SubElement(sp_pr, qn("a", "ln"), {"w": "7000"})
    if line:
        ln_solid = ET.SubElement(ln, qn("a", "solidFill"))
        ET.SubElement(ln_solid, qn("a", "srgbClr"), {"val": line})
    else:
        ET.SubElement(ln, qn("a", "noFill"))
    sp_tree.append(shape)


def add_text(sp_tree: ET.Element, shape_id: int, name: str, text: str, x: float, y: float, w: float, h: float,
             color: str, font: str, size_pt: int = 8, bold: bool = False) -> None:
    shape = ET.Element(qn("p", "sp"))
    nv = ET.SubElement(shape, qn("p", "nvSpPr"))
    ET.SubElement(nv, qn("p", "cNvPr"), {"id": str(shape_id), "name": name})
    ET.SubElement(nv, qn("p", "cNvSpPr"), {"txBox": "1"})
    ET.SubElement(nv, qn("p", "nvPr"))
    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": emu(x), "y": emu(y)})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": emu(w), "cy": emu(h)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "rect"})
    ET.SubElement(geom, qn("a", "avLst"))
    ET.SubElement(sp_pr, qn("a", "noFill"))
    ET.SubElement(sp_pr, qn("a", "ln")).append(ET.Element(qn("a", "noFill")))
    tx = ET.SubElement(shape, qn("p", "txBody"))
    ET.SubElement(tx, qn("a", "bodyPr"), {"anchor": "mid", "lIns": "0", "rIns": "0", "tIns": "0", "bIns": "0"})
    ET.SubElement(tx, qn("a", "lstStyle"))
    para = ET.SubElement(tx, qn("a", "p"))
    ET.SubElement(para, qn("a", "pPr"), {"algn": "ctr"})
    run = ET.SubElement(para, qn("a", "r"))
    r_pr_attrs = {"lang": "zh-CN", "sz": str(size_pt * 100)}
    if bold:
        r_pr_attrs["b"] = "1"
    r_pr = ET.SubElement(run, qn("a", "rPr"), r_pr_attrs)
    solid = ET.SubElement(r_pr, qn("a", "solidFill"))
    ET.SubElement(solid, qn("a", "srgbClr"), {"val": color})
    for tag in ("latin", "ea", "cs"):
        ET.SubElement(r_pr, qn("a", tag), {"typeface": font})
    ET.SubElement(run, qn("a", "t")).text = text
    end = ET.SubElement(para, qn("a", "endParaRPr"), {"lang": "zh-CN", "sz": str(size_pt * 100)})
    for tag in ("latin", "ea", "cs"):
        ET.SubElement(end, qn("a", tag), {"typeface": font})
    sp_tree.append(shape)


def apply_fonts(root: ET.Element, font: str) -> None:
    for tag in ("rPr", "defRPr", "endParaRPr"):
        for r_pr in root.findall(f".//a:{tag}", NS):
            for child_tag in ("latin", "ea", "cs"):
                child = r_pr.find(f"a:{child_tag}", NS)
                if child is None:
                    child = ET.SubElement(r_pr, qn("a", child_tag))
                child.set("typeface", font)


def active_index(slide_idx: int) -> int:
    if slide_idx <= 2:
        return 0
    if slide_idx == 3:
        return 1
    if slide_idx == 4:
        return 2
    return 3


def style_tokens(style: str) -> dict:
    if style == "a":
        return {
            "bar": "FFFFFF", "bar_alpha": 82000, "inactive": "0E4A53",
            "active_fill": "1CFEC6", "active_alpha": 92000, "active_text": "00383A",
            "line": "9BE7DC",
        }
    if style == "b":
        return {
            "bar": "061F1E", "bar_alpha": 74000, "inactive": "FFFFFF",
            "active_fill": "1CFEC6", "active_alpha": 96000, "active_text": "002629",
            "line": "1CFEC6",
        }
    return {
        "bar": "EFFFF8", "bar_alpha": 90000, "inactive": "18483D",
        "active_fill": "0F766E", "active_alpha": 94000, "active_text": "FFFFFF",
        "line": "84DCCB",
    }


def add_nav(root: ET.Element, slide_idx: int, style: str, font: str) -> None:
    if slide_idx == 1:
        return
    sp_tree = root.find(".//p:cSld/p:spTree", NS)
    if sp_tree is None:
        return
    remove_existing_nav(sp_tree)
    tokens = style_tokens(style)
    sid = next_shape_id(sp_tree)
    x0, y0, w0, h0 = 5.28, 0.65, 4.20, 0.32
    add_rect(sp_tree, sid, "Codex Sample Nav Bar", x0, y0, w0, h0, tokens["bar"], tokens["bar_alpha"], tokens["line"])
    sid += 1
    seg_w = w0 / len(NAV_LABELS)
    active = active_index(slide_idx)
    for i, label in enumerate(NAV_LABELS):
        sx = x0 + i * seg_w + 0.04
        if i == active:
            add_rect(sp_tree, sid, f"Codex Sample Nav Active {label}", sx, y0 + 0.045, seg_w - 0.08, 0.22,
                     tokens["active_fill"], tokens["active_alpha"], tokens["active_fill"])
            sid += 1
            add_text(sp_tree, sid, f"Codex Sample Nav Text {label}", label, sx, y0 + 0.045, seg_w - 0.08, 0.24,
                     tokens["active_text"], font, 7, True)
            sid += 1
        else:
            add_text(sp_tree, sid, f"Codex Sample Nav Text {label}", label, sx, y0 + 0.045, seg_w - 0.08, 0.24,
                     tokens["inactive"], font, 7, False)
            sid += 1
    add_rect(sp_tree, sid, "Codex Sample Nav Top Accent", 0, 0, 10.0, 0.035, tokens["line"], 90000, None)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--style", choices=["a", "b", "c"], required=True)
    parser.add_argument("--font-face", default="思源黑体 CN Normal")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp) / "work.pptx"
        shutil.copyfile(input_path, tmp_path)
        with zipfile.ZipFile(tmp_path, "r") as zin:
            names = zin.namelist()
            payload = {name: zin.read(name) for name in names}

        slide_names = sorted(
            [name for name in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)],
            key=lambda name: int(re.search(r"slide(\d+)\.xml", name).group(1)),
        )

        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for name in names:
                if name.startswith("ppt/slides/slide") and name.endswith(".xml"):
                    continue
                zout.writestr(name, payload[name])
            for idx, slide_name in enumerate(slide_names, 1):
                root = ET.fromstring(payload[slide_name])
                apply_fonts(root, args.font_face)
                add_nav(root, idx, args.style, args.font_face)
                zout.writestr(slide_name, ET.tostring(root, encoding="utf-8", xml_declaration=True))
    print(f"Wrote nav themed PPTX: {output_path}")


if __name__ == "__main__":
    main()
