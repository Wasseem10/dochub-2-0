export default Object.freeze([
  {
    "toolId": "edit-pdf",
    "input": "A 12-page vendor agreement with one outdated date and two missing initials",
    "output": "A reopened PDF with the corrected date, two placed initials, and every untouched page preserved",
    "result": "1/1 styled-text round-trip fixture exported, reopened, and retained its detected style",
    "method": "Browser regression checks text detection, placement, history, export, and parseable reopen",
    "demoAlt": "Before and after demonstration of a date correction and initials placed in the PDFArrow editor"
  },
  {
    "toolId": "merge-pdf",
    "input": "A two-page application plus a one-page supporting letter",
    "output": "One three-page PDF in the selected file order",
    "result": "3/3 expected native pages were present in the merged regression output",
    "method": "The test reopens the downloaded PDF and counts copied source pages",
    "demoAlt": "Two PDF files being combined into one ordered three-page document"
  },
  {
    "toolId": "split-pdf",
    "input": "A three-page packet with pages 1-2 requested as a separate file",
    "output": "A valid two-page PDF containing only the requested range",
    "result": "2/2 selected pages were present in the split regression output",
    "method": "The test downloads the range and verifies the resulting PDF page count",
    "demoAlt": "A three-page PDF split into a separate two-page document"
  },
  {
    "toolId": "compress-pdf",
    "input": "An image-heavy PDF fixture with an intentionally unoptimized page image",
    "output": "A smaller flattened PDF at the selected quality setting",
    "result": "The regression output was smaller than its source fixture and remained parseable",
    "method": "The browser test compares byte size and reopens the downloaded result",
    "demoAlt": "An image-heavy PDF changing from a larger file to a smaller compressed copy"
  },
  {
    "toolId": "pdf-to-word",
    "input": "A text PDF report with headings, paragraphs, and a fixed page break",
    "output": "A DOCX with editable paragraph XML or a visual-fidelity page image",
    "result": "The regression DOCX contained a valid Word document body and visual-fidelity fallback",
    "method": "Tests inspect the OOXML package and verify the recovery path for image-only PDFs",
    "demoAlt": "A PDF report converted into an editable Word document with preserved page structure"
  },
  {
    "toolId": "pdf-to-excel",
    "input": "A PDF containing a quarterly totals table",
    "output": "An XLSX workbook with a worksheet for the source page and grouped table cells",
    "result": "1/1 expected worksheet was packaged with the fixture's structured cell content",
    "method": "The regression test opens the XLSX archive and checks worksheet XML",
    "demoAlt": "A PDF table converted into rows and columns in an Excel worksheet"
  },
  {
    "toolId": "pdf-to-powerpoint",
    "input": "A finished one-page PDF presentation handout",
    "output": "A PPTX with one high-resolution image slide matching the page",
    "result": "1/1 expected slide and its media relationship were present in the PPTX package",
    "method": "The regression test inspects slide XML and the packaged page image",
    "demoAlt": "A PDF page converted into a PowerPoint slide while preserving its appearance"
  },
  {
    "toolId": "pdf-to-html",
    "input": "A text-based PDF page with headings and positioned paragraphs",
    "output": "A standalone HTML file with a responsive SVG page and selectable text",
    "result": "1/1 expected responsive SVG page was created with extracted text content",
    "method": "The test inspects the downloaded HTML for its SVG viewBox and page text",
    "demoAlt": "A fixed PDF page converted into responsive standalone HTML"
  },
  {
    "toolId": "word-to-pdf",
    "input": "A DOCX report containing the phrase SEARCHABLE WORD REPORT 42000",
    "output": "A fixed-layout PDF with the phrase available to text search",
    "result": "The expected phrase was found in the downloaded PDF's searchable text layer",
    "method": "The browser test converts the DOCX, reopens the PDF, and extracts text",
    "demoAlt": "A Word report converted to a PDF with its text remaining searchable"
  },
  {
    "toolId": "excel-to-pdf",
    "input": "An XLSX worksheet containing a Quarter Total row",
    "output": "A paginated PDF table with worksheet values in reading order",
    "result": "The expected Quarter Total label was found in the converted PDF",
    "method": "The regression test reopens the PDF and verifies extracted table text",
    "demoAlt": "An Excel worksheet converted into a paginated PDF table"
  },
  {
    "toolId": "powerpoint-to-pdf",
    "input": "A PPTX slide containing the phrase Production ready",
    "output": "A landscape PDF page with supported text and shapes rebuilt",
    "result": "The expected slide phrase was found in the converted PDF",
    "method": "The regression test reopens the PDF and verifies extracted slide text",
    "demoAlt": "A PowerPoint slide converted into a landscape PDF page"
  },
  {
    "toolId": "html-to-pdf",
    "input": "A local HTML report with a heading, a 42,000 total, and blocked script content",
    "output": "A searchable PDF containing safe visible content without executing the script",
    "result": "The expected 42,000 value was searchable in the resulting PDF",
    "method": "The regression test converts sanitized HTML and verifies extracted PDF text",
    "demoAlt": "A safe local HTML report converted into a searchable PDF"
  },
  {
    "toolId": "jpg-to-pdf",
    "input": "One browser-generated JPEG photograph fixture",
    "output": "A valid one-page PDF sized around the selected image layout",
    "result": "1/1 JPEG fixture produced a valid one-page PDF",
    "method": "The browser test creates a JPEG, converts it, and parses the downloaded PDF",
    "demoAlt": "A JPEG image placed onto a clean PDF page"
  },
  {
    "toolId": "png-to-pdf",
    "input": "One lossless PNG graphic with a transparent background",
    "output": "A valid one-page PDF retaining supported image transparency",
    "result": "1/1 PNG fixture produced a valid one-page PDF",
    "method": "The browser test converts the PNG and parses the downloaded PDF",
    "demoAlt": "A transparent PNG graphic placed onto a PDF page"
  },
  {
    "toolId": "pdf-to-jpg",
    "input": "A valid one-page PDF with text and vector artwork",
    "output": "A rendered JPEG beginning with the standard JPEG file signature",
    "result": "1/1 output began with the verified JPEG FF D8 signature",
    "method": "The regression test downloads the image and inspects its leading bytes",
    "demoAlt": "A PDF page rendered into a standard JPEG image"
  },
  {
    "toolId": "pdf-to-png",
    "input": "A valid one-page PDF with sharp text and transparency",
    "output": "A lossless PNG beginning with the standard PNG file signature",
    "result": "1/1 output matched the verified PNG file signature",
    "method": "The regression test downloads the image and inspects its eight-byte signature",
    "demoAlt": "A PDF page rendered into a lossless PNG image"
  },
  {
    "toolId": "ocr-pdf",
    "input": "A clean printed scan containing a known heading and body sentence",
    "output": "A searchable image PDF, TXT file, and visible recognition-confidence result",
    "result": "The known fixture text was recognized and a confidence result was reported",
    "method": "The OCR regression runs locally and checks recognized text plus quality reporting",
    "demoAlt": "A scanned paper page gaining a searchable OCR text layer and confidence score"
  },
  {
    "toolId": "sign-pdf",
    "input": "A one-page approval form and a typed signature reading Wasseem Dabbas",
    "output": "A flattened PDF with the signature visible at the selected coordinates",
    "result": "The expected signature text was present after export and reopen",
    "method": "The regression places a signature, downloads the PDF, and inspects its content",
    "demoAlt": "A typed signature positioned on the signature line of a PDF form"
  },
  {
    "toolId": "protect-pdf",
    "input": "An authorized unencrypted PDF and a test open password",
    "output": "An AES-256 encrypted PDF that requests the password when opened",
    "result": "The regression output contained an encryption dictionary and rejected an unauthenticated open",
    "method": "The test inspects the PDF encryption structure and verifies password behavior",
    "demoAlt": "An open PDF becoming an AES-256 password-protected download"
  },
  {
    "toolId": "unlock-pdf",
    "input": "A regression PDF encrypted with a known authorized password",
    "output": "A new PDF copy that opens without the source password",
    "result": "1/1 authorized fixture downloaded as a parseable unlocked PDF",
    "method": "The browser test supplies the password and reopens the downloaded output",
    "demoAlt": "An authorized password-protected PDF converted into an unlocked copy"
  },
  {
    "toolId": "compare-pdf",
    "input": "Original and revised PDF resumes containing additions, removals, and replacements",
    "output": "A side-by-side review with a change list and a marked comparison report",
    "result": "The regression produced reviewable text changes and a valid marked report PDF",
    "method": "Tests verify grouped changes, navigation, focused regions, and report export",
    "demoAlt": "Two PDF versions compared side by side with inserted and removed text highlighted"
  }
]);
