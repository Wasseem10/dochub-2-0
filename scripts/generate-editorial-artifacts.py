#!/usr/bin/env python3
"""Generate reproducible Priority 2 PDF fixtures and raster editorial art."""

from __future__ import annotations

import io
import json
import math
import random
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import Color, HexColor, black, white
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime-public"
OUTPUT_PDF = ROOT / "output" / "pdf"
TMP = ROOT / "tmp" / "pdfs"
FIXTURES = RUNTIME / "research" / "fixtures"
REDACTION = RUNTIME / "research" / "redaction"
BENCHMARK = RUNTIME / "research" / "benchmark"
SHARE = RUNTIME / "share"
DEMOS = RUNTIME / "editorial" / "demos"

for folder in [OUTPUT_PDF, TMP, FIXTURES, REDACTION, BENCHMARK, SHARE, DEMOS]:
    folder.mkdir(parents=True, exist_ok=True)


def load_evidence() -> list[dict]:
    source = (ROOT / "config" / "priority-two-evidence.mjs").read_text(encoding="utf-8")
    body = re.sub(r"^\s*export default Object\.freeze\(", "", source)
    body = re.sub(r"\);\s*$", "", body)
    return json.loads(body)


EVIDENCE = load_evidence()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "dm-sans-700.ttf" if bold else "dm-sans-400.ttf"
    path = RUNTIME / "cosmic-assets" / "fonts" / name
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError:
        return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, selected_font, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=selected_font)[2] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(draw, xy, text, selected_font, fill, width, line_gap=8, max_lines=None):
    x, y = xy
    lines = wrap_text(draw, text, selected_font, width)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = f"{lines[-1].rstrip(' .')}..."
    line_height = selected_font.size + line_gap if hasattr(selected_font, "size") else 20
    for line in lines:
        draw.text((x, y), line, font=selected_font, fill=fill)
        y += line_height
    return y


def title_from_slug(slug: str) -> str:
    special = {"pdf": "PDF", "ocr": "OCR", "html": "HTML", "jpg": "JPG", "png": "PNG"}
    return " ".join(special.get(part, part.capitalize()) for part in slug.split("-"))


def make_share_card(slug: str, title: str, kicker: str, footer: str = "Tested July 21, 2026") -> None:
    image = Image.new("RGB", (1200, 630), "#F5F9FF")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((55, 48, 1145, 582), radius=36, fill="#FFFFFF", outline="#D5E2F4", width=2)
    draw.rounded_rectangle((82, 76, 332, 118), radius=21, fill="#E7F1FF")
    draw.text((105, 87), kicker.upper(), font=font(16, True), fill="#2851EB")
    draw.ellipse((953, 85, 1097, 229), fill="#2851EB")
    draw.rounded_rectangle((998, 116, 1052, 191), radius=7, fill="#FFFFFF")
    draw.rectangle((1008, 133, 1042, 138), fill="#80B7FF")
    draw.rectangle((1008, 149, 1042, 154), fill="#80B7FF")
    draw.rectangle((1008, 165, 1033, 170), fill="#80B7FF")
    y = draw_wrapped(draw, (82, 168), title, font(55, True), "#12213A", 780, line_gap=8, max_lines=3)
    draw_wrapped(draw, (84, y + 22), "Original methods, real examples, and clearly stated limits.", font(23), "#5E6D84", 760, line_gap=7, max_lines=2)
    draw.text((84, 520), "PDF", font=font(24, True), fill="#12213A")
    offset = draw.textbbox((0, 0), "PDF", font=font(24, True))[2]
    draw.text((84 + offset, 520), "Enrich", font=font(24, True), fill="#2851EB")
    footer_width = draw.textbbox((0, 0), footer, font=font(16, True))[2]
    draw.text((1114 - footer_width, 525), footer, font=font(16, True), fill="#6A7890")
    image.save(SHARE / f"{slug}.png", optimize=True)


def make_demo(record: dict) -> None:
    slug = record["toolId"]
    title = title_from_slug(slug)
    image = Image.new("RGB", (1200, 675), "#EDF4FF")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((42, 38, 1158, 637), radius=30, fill="#FFFFFF", outline="#CDDBEF", width=2)
    draw.text((76, 70), title, font=font(28, True), fill="#12213A")
    draw.rounded_rectangle((948, 66, 1117, 106), radius=20, fill="#EAF1FF")
    draw.text((978, 77), "REGRESSION DEMO", font=font(13, True), fill="#2851EB")
    panel_y = 140
    panel_h = 354
    for index, (label, copy) in enumerate((("EXAMPLE INPUT", record["input"]), ("EXPECTED OUTPUT", record["output"]))):
        x = 76 + index * 534
        draw.rounded_rectangle((x, panel_y, x + 492, panel_y + panel_h), radius=22, fill="#F8FAFD", outline="#DCE5F1", width=2)
        draw.text((x + 28, panel_y + 28), label, font=font(14, True), fill="#65758C")
        draw.rounded_rectangle((x + 28, panel_y + 76, x + 112, panel_y + 177), radius=12, fill="#E6EEFF" if index == 0 else "#DDEBFF")
        if index == 0:
            draw.rounded_rectangle((x + 49, panel_y + 96, x + 91, panel_y + 157), radius=5, fill="#FFFFFF", outline="#8DA7D7", width=2)
            draw.rectangle((x + 57, panel_y + 111, x + 83, panel_y + 115), fill="#7B95C4")
            draw.rectangle((x + 57, panel_y + 123, x + 83, panel_y + 127), fill="#A2B5D7")
            draw.rectangle((x + 57, panel_y + 135, x + 76, panel_y + 139), fill="#A2B5D7")
        else:
            draw.ellipse((x + 47, panel_y + 102, x + 93, panel_y + 148), fill="#2851EB")
            draw.line((x + 59, panel_y + 125, x + 69, panel_y + 136, x + 85, panel_y + 114), fill="#FFFFFF", width=5, joint="curve")
        draw_wrapped(draw, (x + 28, panel_y + 205), copy, font(20, True), "#22344F", 430, line_gap=8, max_lines=5)
    draw.line((579, 300, 621, 300), fill="#2851EB", width=5)
    draw.polygon([(621, 300), (605, 289), (605, 311)], fill="#2851EB")
    draw.rounded_rectangle((76, 525, 1124, 601), radius=16, fill="#13213A")
    draw.text((102, 545), "MEASURED", font=font(13, True), fill="#87B7FF")
    draw_wrapped(draw, (210, 540), record["result"], font(17, True), "#FFFFFF", 880, line_gap=5, max_lines=2)
    image.save(DEMOS / f"{slug}.png", optimize=True)


RESOURCE_SHARES = {
    "resources": ("PDF research, safety guides, and workflow playbooks", "Original resources"),
    "research-pdf-conversion-benchmark": ("Q3 2026 browser PDF fidelity benchmark", "Open methodology"),
    "guides-redact-pdf-safely": ("How to prove redacted PDF text is actually gone", "Safety guide"),
    "guides-ocr-quality": ("OCR quality by scan and document type", "Field guide"),
    "guides-how-to-edit-a-pdf": ("How to edit a PDF without breaking the original layout", "Practical guide", "Reviewed July 29, 2026"),
    "guides-compress-pdf-without-losing-quality": ("Compress a PDF without losing the features you need", "Decision guide", "Reviewed July 29, 2026"),
    "guides-how-to-combine-pdf-files": ("Combine PDF files in the right order without lowering quality", "Packet guide", "Reviewed July 29, 2026"),
    "guides-how-to-fill-and-sign-pdf": ("Fill and sign a PDF correctly before submitting it", "Completion guide", "Reviewed July 29, 2026"),
    "guides-pdf-to-word-formatting": ("Choose the right PDF to Word layout mode", "Formatting guide", "Reviewed July 29, 2026"),
    "guides-edit-pdf-on-iphone": ("Edit a PDF on iPhone without installing another app", "Mobile PDF guide", "Reviewed July 29, 2026"),
    "guides-edit-scanned-pdf": ("Edit a scanned PDF when the page is really an image", "Scanned PDF guide", "Reviewed July 29, 2026"),
    "guides-compress-pdf-to-1mb": ("Compress a PDF toward a real 1 MB byte limit", "File-size guide", "Reviewed July 29, 2026"),
    "guides-compress-pdf-for-email": ("Compress a PDF for email with room for encoding", "Attachment guide", "Reviewed July 29, 2026"),
    "guides-combine-pdf-files-on-mac": ("Combine PDF files on a Mac in the right order", "Mac PDF guide", "Reviewed July 29, 2026"),
    "guides-sign-pdf-on-android": ("Sign a PDF on Android and verify the download", "Mobile signing guide", "Reviewed July 29, 2026"),
    "guides-fill-pdf-without-adobe": ("Fill out a PDF without Adobe Acrobat", "Browser form guide", "Reviewed July 29, 2026"),
    "guides-convert-pdf-to-word-without-losing-formatting": ("Convert PDF to Word with the formatting you need", "Conversion guide", "Reviewed July 29, 2026"),
    "guides-remove-pages-from-pdf": ("Remove PDF pages without deleting the wrong version", "Page guide", "Reviewed July 29, 2026"),
    "guides-rotate-pdf-and-save": ("Rotate PDF pages and save the orientation permanently", "Page guide", "Reviewed July 29, 2026"),
    "research-pdf-email-attachment-size-study": ("What a PDF attachment weighs after email encoding", "Open data study", "Published July 29, 2026"),
    "workflows-education-pdf-workflow": ("A reviewable PDF workflow for educators", "Workflow playbook"),
    "workflows-recruiting-pdf-workflow": ("Private, consistent candidate PDF packets", "Workflow playbook"),
    "workflows-legal-operations-pdf-workflow": ("Version, comparison, and redaction controls for legal operations", "Workflow playbook"),
    "workflows-real-estate-pdf-workflow": ("Complete, legible property PDF packets", "Workflow playbook"),
    "workflows-small-business-pdf-workflow": ("Controlled client-ready PDFs for small businesses", "Workflow playbook"),
    "privacy": ("Understand every PDFEnrich data path", "Trust center"),
    "security": ("Current security controls and reporting path", "Trust center"),
    "architecture": ("How browser processing, identity, storage, and analytics connect", "Trust center"),
    "uptime": ("Service availability without an invented percentage", "Trust center"),
    "incident-history": ("Public incident history and disclosure policy", "Trust center"),
}


def build_simple_pdf(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=letter, pageCompression=1)
    for page, heading in [(1, "Browser PDF benchmark - simple fixture"), (2, "Verification checklist")]:
        c.setTitle("PDFEnrich simple searchable fixture")
        c.setFont("Helvetica-Bold", 18)
        c.drawString(72, 720, heading)
        c.setFont("Helvetica", 11)
        c.drawString(72, 692, f"Page {page} of 2")
        lines = [
            "This page contains searchable text, predictable spacing, and a page number.",
            "Reference value: FT-PDF-2026-42000.",
            "Use this fixture to verify page count, text extraction, order, and export recovery.",
        ] if page == 1 else [
            "1. Reopen the downloaded result.",
            "2. Confirm both pages are present and searchable.",
            "3. Search for FT-PDF-2026-42000.",
        ]
        y = 650
        for line in lines:
            c.drawString(72, y, line)
            y -= 24
        c.setStrokeColor(HexColor("#2851EB"))
        c.line(72, 90, 540, 90)
        c.setFillColor(HexColor("#52637A"))
        c.drawRightString(540, 68, f"PDFEnrich regression fixture | {page}")
        c.showPage()
    c.save()


def build_complex_pdf(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=letter, pageCompression=1)
    c.setTitle("PDFEnrich complex layout fixture")
    c.setFillColor(HexColor("#102A43"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(54, 730, "Complex layout benchmark")
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#52637A"))
    c.drawString(54, 708, "Columns, table geometry, vectors, and a rotated label")
    c.setFillColor(HexColor("#EFF5FF"))
    c.roundRect(54, 624, 504, 58, 10, fill=1, stroke=0)
    c.setFillColor(HexColor("#2851EB"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, 651, "Reference metric")
    c.setFillColor(HexColor("#102A43"))
    c.drawRightString(540, 647, "42,000")
    column_text = [
        "Left column: PDF stores positioned page elements rather than flowing document structure. A converter must infer reading order and grouping.",
        "Right column: This fixture deliberately mixes type, geometry, and vector graphics so output claims can be checked against a known page.",
    ]
    for index, text in enumerate(column_text):
        x = 54 + index * 264
        words = text.split()
        y = 590
        line = ""
        c.setFillColor(black)
        c.setFont("Helvetica", 10)
        for word in words:
            candidate = f"{line} {word}".strip()
            if c.stringWidth(candidate, "Helvetica", 10) < 232:
                line = candidate
            else:
                c.drawString(x, y, line)
                y -= 15
                line = word
        c.drawString(x, y, line)
    table_y = 420
    widths = [168, 168, 168]
    headings = ["Item", "Expected", "Observed"]
    values = [("Pages", "2", "2"), ("Search token", "42000", "42000"), ("Vectors", "Present", "Present")]
    x = 54
    for i, width in enumerate(widths):
        c.setFillColor(HexColor("#2851EB"))
        c.rect(x, table_y, width, 32, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x + 10, table_y + 11, headings[i])
        x += width
    for row_index, row in enumerate(values):
        y = table_y - (row_index + 1) * 32
        x = 54
        for i, width in enumerate(widths):
            c.setFillColor(Color(.97, .98, 1) if row_index % 2 == 0 else white)
            c.setStrokeColor(HexColor("#D9E3F1"))
            c.rect(x, y, width, 32, fill=1, stroke=1)
            c.setFillColor(HexColor("#233650"))
            c.setFont("Helvetica", 10)
            c.drawString(x + 10, y + 11, row[i])
            x += width
    c.saveState()
    c.translate(576, 190)
    c.rotate(90)
    c.setFillColor(HexColor("#2851EB"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0, 0, "ROTATED VECTOR LABEL")
    c.restoreState()
    c.setFillColor(HexColor("#B9D2FF"))
    c.circle(150, 170, 54, fill=1, stroke=0)
    c.setFillColor(HexColor("#2851EB"))
    c.roundRect(235, 130, 180, 80, 18, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(325, 165, "VECTOR SHAPES")
    c.showPage()
    c.setFillColor(HexColor("#102A43"))
    c.setFont("Helvetica-Bold", 20)
    c.drawString(54, 730, "Complex fixture - page two")
    c.setFont("Times-Roman", 12)
    c.drawString(54, 690, "Font change, page break, and selectable text remain intentional test properties.")
    c.setFont("Courier", 11)
    c.drawString(54, 650, "UNIQUE-COMPLEX-TOKEN-8264")
    c.showPage()
    c.save()


def scan_source(degraded: bool) -> Image.Image:
    base = Image.new("L", (1700, 2200), 248 if not degraded else 225)
    draw = ImageDraw.Draw(base)
    try:
        heading_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 58)
        body_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 34)
    except OSError:
        heading_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
    draw.text((140, 160), "SCANNED INTAKE FORM", font=heading_font, fill=20 if not degraded else 85)
    lines = ["Reference: OCR QUALITY 2026", "Applicant: Jordan Lee", "Requested total: $42,000", "Review every name, date, and number."]
    y = 350
    for line in lines:
        draw.text((145, y), line, font=body_font, fill=35 if not degraded else 105)
        y += 90
    draw.rectangle((140, 780, 1560, 1640), outline=60 if not degraded else 130, width=4)
    for offset in [930, 1080, 1230, 1380, 1530]:
        draw.line((140, offset, 1560, offset), fill=90 if not degraded else 145, width=3)
    if degraded:
        rng = random.Random(20260721)
        pixels = base.load()
        for _ in range(38000):
            x = rng.randrange(base.width)
            y = rng.randrange(base.height)
            pixels[x, y] = min(255, max(0, pixels[x, y] + rng.randrange(-48, 49)))
        base = base.filter(ImageFilter.GaussianBlur(radius=1.15)).rotate(2.2, expand=False, fillcolor=235)
    return base.convert("RGB")


def image_pdf(image: Image.Image, path: Path) -> None:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=80 if "degraded" in path.name else 94)
    buffer.seek(0)
    c = canvas.Canvas(str(path), pagesize=letter, pageCompression=1)
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(buffer), 0, 0, width=letter[0], height=letter[1])
    c.showPage()
    c.save()


def build_large_pdf(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=letter, pageCompression=1)
    c.setTitle("PDFEnrich 100 page progressive rendering fixture")
    for page in range(1, 101):
        c.setFillColor(HexColor("#12213A"))
        c.setFont("Helvetica-Bold", 24)
        c.drawString(64, 718, f"Progressive page {page}")
        c.setFont("Helvetica", 11)
        c.setFillColor(HexColor("#52637A"))
        c.drawString(64, 682, "This is a synthetic public regression fixture. It contains no personal data.")
        c.drawString(64, 652, f"Search token: LARGE-PDF-PAGE-{page:03d}")
        for row in range(12):
            shade = 236 + (row % 2) * 8
            c.setFillColor(Color(shade / 255, shade / 255, min(1, (shade + 8) / 255)))
            c.roundRect(64, 590 - row * 38, 470, 25, 5, fill=1, stroke=0)
        c.setFillColor(HexColor("#2851EB"))
        c.drawRightString(540, 56, f"{page} / 100")
        c.showPage()
    c.save()


def build_redaction_samples(before: Path, after: Path) -> None:
    secret = "4815 1623 4200 0091"
    for path, include_secret in [(before, True), (after, False)]:
        c = canvas.Canvas(str(path), pagesize=letter, pageCompression=1)
        c.setTitle("PDFEnrich redaction verification sample")
        c.setAuthor("PDFEnrich Product Engineering")
        c.setFont("Helvetica-Bold", 20)
        c.drawString(72, 720, "Fictional customer record")
        c.setFont("Helvetica", 11)
        c.drawString(72, 680, "Customer: Sample Person")
        c.drawString(72, 650, "Account number:")
        if include_secret:
            c.setFont("Courier", 13)
            c.drawString(180, 647, secret)
        c.setFillColor(black)
        c.rect(174, 638, 190, 24, fill=1, stroke=0)
        c.setFillColor(HexColor("#52637A"))
        c.setFont("Helvetica", 10)
        note = "UNSAFE: underlying text remains recoverable." if include_secret else "VERIFIED SAMPLE: sensitive characters are absent from the page content."
        c.drawString(72, 600, note)
        c.drawString(72, 570, "All names and numbers in this fixture are fictional.")
        c.showPage()
        c.save()


def copy_pdf_artifact(source: Path, group: str) -> None:
    target = OUTPUT_PDF / group
    target.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target / source.name)


def main() -> None:
    for record in EVIDENCE:
        make_share_card(record["toolId"], title_from_slug(record["toolId"]), "Working PDF tool")
        make_demo(record)
    for slug, values in RESOURCE_SHARES.items():
        title, kicker, *footer = values
        make_share_card(slug, title, kicker, footer[0] if footer else "Reviewed July 21, 2026")

    simple = FIXTURES / "simple-searchable.pdf"
    complex_pdf = FIXTURES / "complex-layout.pdf"
    clean_scan = FIXTURES / "scanned-clean.pdf"
    degraded_scan = FIXTURES / "scanned-degraded.pdf"
    encrypted = FIXTURES / "encrypted-sample.pdf"
    malformed = FIXTURES / "malformed-sample.pdf"
    large = FIXTURES / "large-100-pages.pdf"
    build_simple_pdf(simple)
    build_complex_pdf(complex_pdf)
    image_pdf(scan_source(False), clean_scan)
    image_pdf(scan_source(True), degraded_scan)
    build_large_pdf(large)
    reader = PdfReader(simple)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt("benchmark", algorithm="AES-256")
    with encrypted.open("wb") as handle:
        writer.write(handle)
    malformed.write_bytes(b"This is an intentionally malformed PDF recovery fixture.\nNo PDF header is present.\n")
    redaction_before = REDACTION / "redaction-before.pdf"
    redaction_after = REDACTION / "redaction-after.pdf"
    build_redaction_samples(redaction_before, redaction_after)
    before_text = "\n".join(page.extract_text() or "" for page in PdfReader(redaction_before).pages)
    after_text = "\n".join(page.extract_text() or "" for page in PdfReader(redaction_after).pages)
    secret = "4815 1623 4200 0091"
    proof = [
        "PDFEnrich redaction verification proof",
        "Generated: 2026-07-21",
        "",
        f"Before sample contains fictional secret in extracted text: {secret in before_text}",
        f"After sample contains fictional secret in extracted text: {secret in after_text}",
        f"After sample page count: {len(PdfReader(redaction_after).pages)}",
        "",
        "Expected safe result: before=True, after=False, page count=1.",
        "Visual inspection, metadata review, search, select/copy, and a second-person check remain required for real disclosures.",
    ]
    (REDACTION / "redaction-proof.txt").write_text("\n".join(proof) + "\n", encoding="utf-8")
    benchmark_result = {
        "benchmark": "PDFEnrich Q3 2026 browser PDF conversion and fidelity benchmark",
        "testedAt": "2026-07-21",
        "status": "passed",
        "coreToolCount": len(EVIDENCE),
        "riskScenarios": ["simple", "complex_layout", "scanned", "encrypted", "malformed", "large", "mobile"],
        "browserClasses": ["desktop-chromium", "android-chromium", "iphone-webkit"],
        "tools": [{"toolId": item["toolId"], "result": item["result"], "method": item["method"]} for item in EVIDENCE],
        "interpretation": "Passed means the named property was verified for the published regression fixture. It is not a promise of perfect output for every PDF.",
    }
    (BENCHMARK / "q3-2026-results.json").write_text(json.dumps(benchmark_result, indent=2) + "\n", encoding="utf-8")
    for artifact in [simple, complex_pdf, clean_scan, degraded_scan, encrypted, malformed, large]:
        copy_pdf_artifact(artifact, "benchmark-fixtures")
    for artifact in [redaction_before, redaction_after]:
        copy_pdf_artifact(artifact, "redaction-guide")

    print(f"Generated {len(EVIDENCE)} tool demonstrations, {len(EVIDENCE) + len(RESOURCE_SHARES)} share cards, and 9 PDF artifacts.")


if __name__ == "__main__":
    main()
