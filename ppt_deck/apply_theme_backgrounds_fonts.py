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

SLIDE_W_EMU = 9144000
SLIDE_H_EMU = 5143500
IMAGE_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
THEME_SHAPE_NAME = "Codex Theme Background"


def qn(prefix: str, tag: str) -> str:
    return f"{{{NS[prefix]}}}{tag}"


def read_xml(zf: zipfile.ZipFile, name: str) -> ET.Element:
    return ET.fromstring(zf.read(name))


def write_xml(zf: zipfile.ZipFile, name: str, root: ET.Element) -> None:
    zf.writestr(name, ET.tostring(root, encoding="utf-8", xml_declaration=True))


def next_rid(rels_root: ET.Element) -> str:
    max_id = 0
    for rel in rels_root:
        rid = rel.attrib.get("Id", "")
        m = re.match(r"rId(\d+)$", rid)
        if m:
            max_id = max(max_id, int(m.group(1)))
    return f"rId{max_id + 1}"


def next_shape_id(sp_tree: ET.Element) -> int:
    max_id = 1
    for c_nv_pr in sp_tree.findall(".//p:cNvPr", NS):
        raw = c_nv_pr.attrib.get("id")
        if raw and raw.isdigit():
            max_id = max(max_id, int(raw))
    return max_id + 1


def remove_existing_theme_background(sp_tree: ET.Element) -> None:
    for child in list(sp_tree):
        c_nv_pr = child.find(".//p:cNvPr", NS)
        if c_nv_pr is not None and c_nv_pr.attrib.get("name", "").startswith(THEME_SHAPE_NAME):
            sp_tree.remove(child)


def make_background_pic(rid: str, shape_id: int) -> ET.Element:
    pic = ET.Element(qn("p", "pic"))
    nv_pic_pr = ET.SubElement(pic, qn("p", "nvPicPr"))
    ET.SubElement(nv_pic_pr, qn("p", "cNvPr"), {"id": str(shape_id), "name": THEME_SHAPE_NAME})
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
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": str(SLIDE_W_EMU), "cy": str(SLIDE_H_EMU)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "rect"})
    ET.SubElement(geom, qn("a", "avLst"))
    return pic


def make_dim_overlay(shape_id: int, alpha: int) -> ET.Element:
    shape = ET.Element(qn("p", "sp"))
    nv_sp_pr = ET.SubElement(shape, qn("p", "nvSpPr"))
    ET.SubElement(nv_sp_pr, qn("p", "cNvPr"), {"id": str(shape_id), "name": f"{THEME_SHAPE_NAME} Dim"})
    ET.SubElement(nv_sp_pr, qn("p", "cNvSpPr"))
    ET.SubElement(nv_sp_pr, qn("p", "nvPr"))

    sp_pr = ET.SubElement(shape, qn("p", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": "0", "y": "0"})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": str(SLIDE_W_EMU), "cy": str(SLIDE_H_EMU)})
    geom = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "rect"})
    ET.SubElement(geom, qn("a", "avLst"))
    solid = ET.SubElement(sp_pr, qn("a", "solidFill"))
    color = ET.SubElement(solid, qn("a", "srgbClr"), {"val": "001A16"})
    ET.SubElement(color, qn("a", "alpha"), {"val": str(alpha)})
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
    if idx in {3, 5, 12, 17}:
        return "section"
    if idx in {2, 8, 11, 13, 14, 15, 16}:
        return "data"
    return "content"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--assets-dir", required=True)
    parser.add_argument("--font-face", default="Microsoft YaHei UI")
    parser.add_argument("--dim-alpha", type=int, default=36000)
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    assets_dir = Path(args.assets_dir)
    bg_files = {
        "cover": assets_dir / "cover-green-tech.png",
        "section": assets_dir / "bg-section-ecology.png",
        "content": assets_dir / "bg-content-texture.png",
        "data": assets_dir / "bg-data-grid.png",
    }
    missing = [str(p) for p in bg_files.values() if not p.exists()]
    if missing:
        raise FileNotFoundError("Missing background assets: " + ", ".join(missing))

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
                if name.startswith("ppt/slides/_rels/slide") and name.endswith(".xml.rels"):
                    continue
                if name == "[Content_Types].xml":
                    root = ET.fromstring(payload[name])
                    ensure_png_content_type(root)
                    zout.writestr(name, ET.tostring(root, encoding="utf-8", xml_declaration=True))
                    continue
                zout.writestr(name, payload[name])

            media_targets = {
                "cover": "ppt/media/codex_theme_bg_cover.png",
                "section": "ppt/media/codex_theme_bg_section.png",
                "content": "ppt/media/codex_theme_bg_content.png",
                "data": "ppt/media/codex_theme_bg_data.png",
            }
            for key, target in media_targets.items():
                zout.writestr(target, bg_files[key].read_bytes())

            for idx, slide_name in enumerate(slide_names, 1):
                slide_root = ET.fromstring(payload[slide_name])
                apply_fonts(slide_root, args.font_face)

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
                    remove_existing_theme_background(sp_tree)
                    shape_id = next_shape_id(sp_tree)
                    bg_pic = make_background_pic(rid, shape_id)
                    dim = make_dim_overlay(shape_id + 1, args.dim_alpha)
                    insert_at = 2 if len(sp_tree) >= 2 else 0
                    sp_tree.insert(insert_at, dim)
                    sp_tree.insert(insert_at, bg_pic)

                write_xml(zout, slide_name, slide_root)
                write_xml(zout, rels_name, rels_root)

    print(f"Wrote themed PPTX: {output_path}")


if __name__ == "__main__":
    main()
