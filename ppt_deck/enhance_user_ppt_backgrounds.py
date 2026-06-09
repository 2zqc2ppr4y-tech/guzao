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
BG_NAME = "Codex Rich Image Background"
OVERLAY_NAME = "Codex Rich Background Wash"


def qn(prefix: str, tag: str) -> str:
    return f"{{{NS[prefix]}}}{tag}"


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


def remove_existing_rich_layers(sp_tree: ET.Element) -> None:
    for child in list(sp_tree):
        c_nv_pr = child.find(".//p:cNvPr", NS)
        name = c_nv_pr.attrib.get("name", "") if c_nv_pr is not None else ""
        if name.startswith(BG_NAME) or name.startswith(OVERLAY_NAME):
            sp_tree.remove(child)


def remove_old_full_bleed_color_blocks(sp_tree: ET.Element, slide_w: int, slide_h: int) -> None:
    for child in list(sp_tree):
        if child.tag != qn("p", "sp") or has_text(child):
            continue
        xfrm = get_xfrm(child)
        if xfrm is None:
            continue
        x, y, w, h = xfrm
        covers_slide = abs(x) <= 20000 and abs(y) <= 20000 and w >= slide_w * 0.98 and h >= slide_h * 0.98
        if covers_slide:
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
    ET.SubElement(nv_sp_pr, qn("p", "cNvPr"), {"id": str(shape_id), "name": OVERLAY_NAME})
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
    if key == "content":
        return "FFFFFF", 18000
    if key == "cover":
        return "001A16", 18000
    if key == "data":
        return "001A16", 22000
    return "001A16", 18000


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
            "cover": "ppt/media/codex_rich_bg_cover.png",
            "section": "ppt/media/codex_rich_bg_section.png",
            "content": "ppt/media/codex_rich_bg_content.png",
            "data": "ppt/media/codex_rich_bg_data.png",
        }

        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
            for name in names:
                if name.startswith("ppt/slides/slide") and name.endswith(".xml"):
                    continue
                if name.startswith("ppt/slides/_rels/slide") and name.endswith(".xml.rels"):
                    continue
                if name in media_targets.values():
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
                if rels_name in payload:
                    rels_root = ET.fromstring(payload[rels_name])
                else:
                    rels_root = ET.Element(qn("rel", "Relationships"))

                key = slide_background_key(idx)
                rid = next_rid(rels_root)
                ET.SubElement(
                    rels_root,
                    qn("rel", "Relationship"),
                    {
                        "Id": rid,
                        "Type": IMAGE_REL_TYPE,
                        "Target": "../media/" + Path(media_targets[key]).name,
                    },
                )

                sp_tree = slide_root.find(".//p:cSld/p:spTree", NS)
                if sp_tree is not None:
                    remove_existing_rich_layers(sp_tree)
                    remove_old_full_bleed_color_blocks(sp_tree, slide_w, slide_h)
                    shape_id = next_shape_id(sp_tree)
                    bg_pic = make_background_pic(rid, shape_id, slide_w, slide_h)
                    wash_color, wash_alpha = overlay_for_key(key)
                    wash = make_overlay(shape_id + 1, slide_w, slide_h, wash_color, wash_alpha)
                    insert_at = 2 if len(sp_tree) >= 2 else 0
                    sp_tree.insert(insert_at, wash)
                    sp_tree.insert(insert_at, bg_pic)

                write_xml(zout, slide_name, slide_root)
                write_xml(zout, rels_name, rels_root)

    print(f"Wrote enhanced PPTX: {output_path}")


if __name__ == "__main__":
    main()
